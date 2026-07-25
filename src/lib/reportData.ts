import { readObjects, SITES, nowMonth, siteName } from "@/lib/sheets";

export type MemberStatus = {
  userId: string;
  name: string;
  role: string;
  site: string;
  status: "Draft" | "Submitted" | "Approved" | "Returned" | "Missing";
  submittedAt: string;
  reportId: string | null;
  totalActs: number;
};

export type SiteStat = { code: string; name: string; totalActs: number };
export type TrendPoint = { month: string; reportsSubmitted: number; totalActivities: number };
export type ProposalStat = { status: string; label: string; count: number };
export type IssueItem = {
  reportId: string;
  member: string;
  type: string;
  siteCode: string;
  description: string;
  pic: string;
  deadline: string;
};

export type DashboardData = {
  month: string;
  availableMonths: string[];
  kpi: {
    reportsThisMonth: string;
    submittedCount: number;
    totalMembers: number;
    pendingApprovals: number;
    activitiesCompleted: number;
    issuesNeedingSupport: number;
    completionRate: number;
  };
  members: MemberStatus[];
  siteStats: SiteStat[];
  trend: TrendPoint[];
  proposals: ProposalStat[];
  issues: IssueItem[];
  priorities: IssueItem[];
};

const PROPOSAL_LABELS: Record<string, string> = {
  S: "Thành công (S)",
  U: "Không thành công (U)",
  W: "Đang xây dựng (W)",
  R: "Cần rà soát (R)",
};

function sortMonthsDesc(months: string[]): string[] {
  const parse = (m: string) => {
    const [mm, yyyy] = m.split("/");
    return Number(yyyy) * 100 + Number(mm);
  };
  return [...new Set(months)].sort((a, b) => parse(b) - parse(a));
}

function shiftMonth(month: string, delta: number): string {
  const [mm, yyyy] = month.split("/").map(Number);
  const d = new Date(yyyy, mm - 1 + delta, 1);
  return String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}

export async function getFullDashboardData(month?: string): Promise<DashboardData> {
  const [users, reports, siteUpdates, proposals, issuesRaw] = await Promise.all([
    readObjects("Dim_Users"),
    readObjects("Fact_Reports"),
    readObjects("Data_Site_Updates"),
    readObjects("Data_Proposals"),
    readObjects("Data_Issues_Priorities"),
  ]);

  const activeUsers = users.filter((u) => (u.Is_Active ?? "true").trim().toLowerCase() !== "false");

  const monthsFromData = sortMonthsDesc(reports.map((r) => r.Reporting_Month).filter(Boolean));
  const current = nowMonth();
  const availableMonths = sortMonthsDesc([current, ...monthsFromData]);
  const targetMonth = month && availableMonths.includes(month) ? month : current;

  const monthReports = reports.filter((r) => r.Reporting_Month === targetMonth);
  const reportIdsThisMonth = new Set(monthReports.map((r) => r.Report_ID));

  const nameOf = (uid: string) => users.find((u) => u.User_ID === uid)?.Full_Name || uid;

  // --- Members table ---
  const members: MemberStatus[] = activeUsers.map((u) => {
    const rep = monthReports.find((r) => r.User_ID === u.User_ID);
    const acts = rep
      ? siteUpdates.filter((s) => s.Report_ID === rep.Report_ID).reduce((sum, s) => sum + (parseInt(s.Num_Acts, 10) || 0), 0)
      : 0;
    return {
      userId: u.User_ID,
      name: u.Full_Name || u.User_ID,
      role: u.Role || "staff",
      site: u.Main_Site || "",
      status: (rep?.Status as MemberStatus["status"]) || "Missing",
      submittedAt: rep?.Submitted_At || "",
      reportId: rep?.Report_ID || null,
      totalActs: acts,
    };
  });

  const submittedCount = members.filter((m) => m.status !== "Missing" && m.status !== "Draft").length;
  const pendingApprovals = reports.filter((r) => r.Status === "Submitted").length;
  const activitiesCompleted = siteUpdates
    .filter((s) => reportIdsThisMonth.has(s.Report_ID))
    .reduce((sum, s) => sum + (parseInt(s.Num_Acts, 10) || 0), 0);
  const issuesNeedingSupport = issuesRaw.filter(
    (i) => reportIdsThisMonth.has(i.Report_ID) && (i.Type || "").toLowerCase() === "issue"
  ).length;

  // --- Site chart ---
  const siteMap = new Map<string, number>();
  SITES.forEach((s) => siteMap.set(s.code, 0));
  siteUpdates
    .filter((s) => reportIdsThisMonth.has(s.Report_ID))
    .forEach((s) => siteMap.set(s.Site_Code, (siteMap.get(s.Site_Code) || 0) + (parseInt(s.Num_Acts, 10) || 0)));
  const siteStats: SiteStat[] = SITES.map((s) => ({ code: s.code, name: s.vi, totalActs: siteMap.get(s.code) || 0 }));

  // --- Trend: last 6 months ending at targetMonth ---
  const trendMonths: string[] = [];
  for (let i = 5; i >= 0; i--) trendMonths.push(shiftMonth(targetMonth, -i));
  const trend: TrendPoint[] = trendMonths.map((m) => {
    const repsInM = reports.filter((r) => r.Reporting_Month === m && r.Status && r.Status !== "Draft");
    const idsInM = new Set(repsInM.map((r) => r.Report_ID));
    const acts = siteUpdates.filter((s) => idsInM.has(s.Report_ID)).reduce((sum, s) => sum + (parseInt(s.Num_Acts, 10) || 0), 0);
    return { month: m, reportsSubmitted: repsInM.length, totalActivities: acts };
  });

  // --- Proposals summary (this month) ---
  const propsThisMonth = proposals.filter((p) => reportIdsThisMonth.has(p.Report_ID));
  const propCounts = new Map<string, number>();
  propsThisMonth.forEach((p) => {
    const code = p.Status_Code || "W";
    propCounts.set(code, (propCounts.get(code) || 0) + 1);
  });
  const proposalStats: ProposalStat[] = ["S", "U", "W", "R"].map((code) => ({
    status: code,
    label: PROPOSAL_LABELS[code],
    count: propCounts.get(code) || 0,
  }));

  // --- Issues & priorities (this month) ---
  const issuesThisMonth = issuesRaw.filter((i) => reportIdsThisMonth.has(i.Report_ID));
  const toItem = (i: (typeof issuesRaw)[number]): IssueItem => {
    const rep = monthReports.find((r) => r.Report_ID === i.Report_ID);
    return {
      reportId: i.Report_ID,
      member: rep ? nameOf(rep.User_ID) : "",
      type: i.Type,
      siteCode: i.Site_Code,
      description: i.Description,
      pic: i.PIC,
      deadline: i.Deadline,
    };
  };
  const issues = issuesThisMonth.filter((i) => (i.Type || "").toLowerCase() === "issue").map(toItem);
  const priorities = issuesThisMonth.filter((i) => (i.Type || "").toLowerCase() === "priority").map(toItem);

  return {
    month: targetMonth,
    availableMonths,
    kpi: {
      reportsThisMonth: `${submittedCount}/${activeUsers.length}`,
      submittedCount,
      totalMembers: activeUsers.length,
      pendingApprovals,
      activitiesCompleted,
      issuesNeedingSupport,
      completionRate: activeUsers.length ? Math.round((submittedCount / activeUsers.length) * 100) : 0,
    },
    members,
    siteStats,
    trend,
    proposals: proposalStats,
    issues,
    priorities,
  };
}


export type RawSiteUpdate = { reportId: string; member: string; siteCode: string; siteName: string; numActs: number; desc: string; results: string; plan: string };
export type RawProposal = { reportId: string; member: string; name: string; statusLabel: string; deadline: string; note: string };
export type RawIssue = { reportId: string; member: string; type: string; siteCode: string; description: string; pic: string; deadline: string };

export async function getMonthRawRows(month: string): Promise<{
  siteUpdates: RawSiteUpdate[];
  proposals: RawProposal[];
  issues: RawIssue[];
}> {
  const [users, reports, siteUpdatesAll, proposalsAll, issuesAll] = await Promise.all([
    readObjects("Dim_Users"),
    readObjects("Fact_Reports"),
    readObjects("Data_Site_Updates"),
    readObjects("Data_Proposals"),
    readObjects("Data_Issues_Priorities"),
  ]);
  const nameOf = (uid: string) => users.find((u) => u.User_ID === uid)?.Full_Name || uid;
  const monthReports = reports.filter((r) => r.Reporting_Month === month);
  const idToMember = new Map(monthReports.map((r) => [r.Report_ID, nameOf(r.User_ID)]));
  const ids = new Set(monthReports.map((r) => r.Report_ID));

  const siteUpdates: RawSiteUpdate[] = siteUpdatesAll
    .filter((s) => ids.has(s.Report_ID))
    .map((s) => ({
      reportId: s.Report_ID,
      member: idToMember.get(s.Report_ID) || "",
      siteCode: s.Site_Code,
      siteName: siteName(s.Site_Code, "vi"),
      numActs: parseInt(s.Num_Acts, 10) || 0,
      desc: s.Activities_Notes,
      results: s.Results_Challenges,
      plan: s.Next_Month_Plan,
    }));

  const proposals: RawProposal[] = proposalsAll
    .filter((p) => ids.has(p.Report_ID))
    .map((p) => ({
      reportId: p.Report_ID,
      member: idToMember.get(p.Report_ID) || "",
      name: p.Proposal_Name,
      statusLabel: PROPOSAL_LABELS[p.Status_Code] || p.Status_Code,
      deadline: p.Deadline,
      note: p.Note || p.Short_Note,
    }));

  const issues: RawIssue[] = issuesAll
    .filter((i) => ids.has(i.Report_ID))
    .map((i) => ({
      reportId: i.Report_ID,
      member: idToMember.get(i.Report_ID) || "",
      type: i.Type,
      siteCode: i.Site_Code,
      description: i.Description,
      pic: i.PIC,
      deadline: i.Deadline,
    }));

  return { siteUpdates, proposals, issues };
}

export { siteName };
