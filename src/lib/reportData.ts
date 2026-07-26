import {
  readObjects,
  nowMonth,
  siteName,
  labelOf,
  getMasterData,
} from "@/lib/sheets";

export type PhotoItem = { url: string; caption: string };

export function parsePhotos(json: string | undefined): PhotoItem[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr.filter((p) => p && p.url);
  } catch {
    // ignore malformed JSON, treat as no photos
  }
  return [];
}

export function stringifyPhotos(photos: PhotoItem[]): string {
  return JSON.stringify((photos || []).filter((p) => p && p.url));
}

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
export type TypeStat = { code: string; label: string; count: number };
export type TrendPoint = { month: string; reportsSubmitted: number; totalActivities: number };
export type ProposalStat = { status: string; label: string; count: number };
export type CommChannelStat = { code: string; label: string; count: number };
export type CommTrendPoint = { month: string; channels: Record<string, number> };

export type IssueItem = {
  reportId: string;
  member: string;
  siteCode: string;
  description: string;
  actionNeeded: string;
  pic: string;
};

export type PriorityItem = {
  reportId: string;
  member: string;
  priorityNo: string;
  siteCode: string;
  activity: string;
  pic: string;
  deadline: string;
};

export type DeadlineItem = {
  reportId: string;
  member: string;
  date: string;
  event: string;
  siteDonor: string;
  pic: string;
};

export type ReportsDataItem = {
  reportId: string;
  member: string;
  itemName: string;
  typeCode: string;
  typeLabel: string;
  statusUpdate: string;
  deadlineAction: string;
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
    activeProposals: number;
    commsOutputs: number;
    issuesNeedingSupport: number;
    prioritiesSetThisMonth: number;
    completionRate: number;
  };
  members: MemberStatus[];
  siteStats: SiteStat[];
  typeStats: TypeStat[];
  trend: TrendPoint[];
  proposals: ProposalStat[];
  commsChannels: CommChannelStat[];
  commsTrend: CommTrendPoint[];
  issues: IssueItem[];
  priorities: PriorityItem[];
  deadlines: DeadlineItem[];
  reportsData: ReportsDataItem[];
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

/** Parse a dd/mm/yyyy or yyyy-mm-dd style date string into a comparable Date, best-effort. */
function parseDate(s: string): Date | null {
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function getFullDashboardData(month?: string): Promise<DashboardData> {
  const [
    users,
    reports,
    siteUpdates,
    activities,
    proposals,
    reportsDataRaw,
    commsRaw,
    challengesRaw,
    prioritiesRaw,
    deadlinesRaw,
    masterData,
  ] = await Promise.all([
    readObjects("Dim_Users"),
    readObjects("Fact_Reports"),
    readObjects("Data_Site_Updates"),
    readObjects("Data_Activities"),
    readObjects("Data_Proposals"),
    readObjects("Data_Reports_Data"),
    readObjects("Data_Communications"),
    readObjects("Data_Challenges"),
    readObjects("Data_Priorities"),
    readObjects("Data_Deadlines"),
    getMasterData(),
  ]);
  const { sites: SITES, activityTypes: ACTIVITY_TYPES, commChannels: COMM_CHANNELS, proposalStatuses: PROPOSAL_STATUSES, reportTypes: REPORT_TYPES } = masterData;

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

  const activitiesThisMonth = activities.filter((a) => reportIdsThisMonth.has(a.Report_ID));
  const activitiesCompleted = activitiesThisMonth.length;

  // --- Site chart (structured activities, falls back to Num_Acts if no structured rows yet) ---
  const siteMap = new Map<string, number>();
  SITES.forEach((s) => siteMap.set(s.code, 0));
  if (activitiesThisMonth.length) {
    activitiesThisMonth.forEach((a) => siteMap.set(a.Site_Code, (siteMap.get(a.Site_Code) || 0) + 1));
  } else {
    siteUpdates
      .filter((s) => reportIdsThisMonth.has(s.Report_ID))
      .forEach((s) => siteMap.set(s.Site_Code, (siteMap.get(s.Site_Code) || 0) + (parseInt(s.Num_Acts, 10) || 0)));
  }
  const siteStats: SiteStat[] = SITES.map((s) => ({ code: s.code, name: s.vi, totalActs: siteMap.get(s.code) || 0 }));

  // --- Activity-type chart ---
  const typeMap = new Map<string, number>();
  ACTIVITY_TYPES.forEach((t) => typeMap.set(t.code, 0));
  activitiesThisMonth.forEach((a) => typeMap.set(a.Activity_Type, (typeMap.get(a.Activity_Type) || 0) + 1));
  const typeStats: TypeStat[] = ACTIVITY_TYPES.map((t) => ({ code: t.code, label: t.vi, count: typeMap.get(t.code) || 0 }));

  // --- Trend: last 6 months ending at targetMonth ---
  const trendMonths: string[] = [];
  for (let i = 5; i >= 0; i--) trendMonths.push(shiftMonth(targetMonth, -i));
  const trend: TrendPoint[] = trendMonths.map((m) => {
    const repsInM = reports.filter((r) => r.Reporting_Month === m && r.Status && r.Status !== "Draft");
    const idsInM = new Set(repsInM.map((r) => r.Report_ID));
    const actsInM = activities.filter((a) => idsInM.has(a.Report_ID)).length;
    const fallbackActs = actsInM || siteUpdates.filter((s) => idsInM.has(s.Report_ID)).reduce((sum, s) => sum + (parseInt(s.Num_Acts, 10) || 0), 0);
    return { month: m, reportsSubmitted: repsInM.length, totalActivities: fallbackActs };
  });

  // --- Proposals summary (this month) ---
  const propsThisMonth = proposals.filter((p) => reportIdsThisMonth.has(p.Report_ID));
  const propCounts = new Map<string, number>();
  propsThisMonth.forEach((p) => {
    const code = p.Status_Code || "Writing";
    propCounts.set(code, (propCounts.get(code) || 0) + 1);
  });
  const proposalStats: ProposalStat[] = PROPOSAL_STATUSES.map((s) => ({
    status: s.code,
    label: s.vi,
    count: propCounts.get(s.code) || 0,
  }));
  const activeProposals = (propCounts.get("Writing") || 0) + (propCounts.get("Needs review") || 0);

  // --- Comms this month + 6-month trend ---
  const commsThisMonth = commsRaw.filter((c) => reportIdsThisMonth.has(c.Report_ID));
  const commsOutputs = commsThisMonth.reduce((sum, c) => sum + (parseInt(c.Num_Completed, 10) || 0), 0);
  const commChanMap = new Map<string, number>();
  COMM_CHANNELS.forEach((c) => commChanMap.set(c.code, 0));
  commsThisMonth.forEach((c) => commChanMap.set(c.Channel_Code, (commChanMap.get(c.Channel_Code) || 0) + (parseInt(c.Num_Completed, 10) || 0)));
  const commsChannels: CommChannelStat[] = COMM_CHANNELS.map((c) => ({ code: c.code, label: c.vi, count: commChanMap.get(c.code) || 0 }));

  const commsTrend: CommTrendPoint[] = trendMonths.map((m) => {
    const repsInM = reports.filter((r) => r.Reporting_Month === m && r.Status && r.Status !== "Draft");
    const idsInM = new Set(repsInM.map((r) => r.Report_ID));
    const rowsInM = commsRaw.filter((c) => idsInM.has(c.Report_ID));
    const channels: Record<string, number> = {};
    COMM_CHANNELS.forEach((c) => (channels[c.code] = 0));
    rowsInM.forEach((c) => (channels[c.Channel_Code] = (channels[c.Channel_Code] || 0) + (parseInt(c.Num_Completed, 10) || 0)));
    return { month: m, channels };
  });

  // --- Issues (Data_Challenges) ---
  const issues: IssueItem[] = challengesRaw
    .filter((i) => reportIdsThisMonth.has(i.Report_ID))
    .map((i) => {
      const rep = monthReports.find((r) => r.Report_ID === i.Report_ID);
      return {
        reportId: i.Report_ID,
        member: rep ? nameOf(rep.User_ID) : "",
        siteCode: i.Site_Area,
        description: i.Issue_Desc,
        actionNeeded: i.Action_Needed,
        pic: i.Responsible,
      };
    });
  const issuesNeedingSupport = issues.length;

  // --- Priorities (Data_Priorities) ---
  const priorities: PriorityItem[] = prioritiesRaw
    .filter((p) => reportIdsThisMonth.has(p.Report_ID))
    .map((p) => {
      const rep = monthReports.find((r) => r.Report_ID === p.Report_ID);
      return {
        reportId: p.Report_ID,
        member: rep ? nameOf(rep.User_ID) : "",
        priorityNo: p.Priority_No,
        siteCode: p.Site_Area,
        activity: p.Planned_Activity,
        pic: p.Responsible,
        deadline: p.Deadline,
      };
    })
    .sort((a, b) => (parseInt(a.priorityNo, 10) || 99) - (parseInt(b.priorityNo, 10) || 99));
  const prioritiesSetThisMonth = priorities.length;

  // --- Deadlines (Data_Deadlines) — upcoming across all reports, not just this month's ---
  const todayRef = parseDate(new Date().toISOString()) as Date;
  const deadlines: DeadlineItem[] = deadlinesRaw
    .map((d) => {
      const rep = reports.find((r) => r.Report_ID === d.Report_ID);
      return {
        reportId: d.Report_ID,
        member: rep ? nameOf(rep.User_ID) : "",
        date: d.Event_Date,
        event: d.Event_Desc,
        siteDonor: d.Site_Donor,
        pic: d.Responsible,
      };
    })
    .filter((d) => {
      const dt = parseDate(d.date);
      return dt && dt.getTime() >= todayRef.getTime() - 86400000 * 3;
    })
    .sort((a, b) => (parseDate(a.date)?.getTime() || 0) - (parseDate(b.date)?.getTime() || 0))
    .slice(0, 8);

  // --- Reports & data updates (Section 3) ---
  const reportsData: ReportsDataItem[] = reportsDataRaw
    .filter((r) => reportIdsThisMonth.has(r.Report_ID))
    .map((r) => {
      const rep = monthReports.find((x) => x.Report_ID === r.Report_ID);
      return {
        reportId: r.Report_ID,
        member: rep ? nameOf(rep.User_ID) : "",
        itemName: r.Item_Name,
        typeCode: r.Type_Code,
        typeLabel: labelOf(REPORT_TYPES, r.Type_Code, "vi"),
        statusUpdate: r.Status_Update,
        deadlineAction: r.Deadline_Action,
      };
    });

  return {
    month: targetMonth,
    availableMonths,
    kpi: {
      reportsThisMonth: `${submittedCount}/${activeUsers.length}`,
      submittedCount,
      totalMembers: activeUsers.length,
      pendingApprovals,
      activitiesCompleted,
      activeProposals,
      commsOutputs,
      issuesNeedingSupport,
      prioritiesSetThisMonth,
      completionRate: activeUsers.length ? Math.round((submittedCount / activeUsers.length) * 100) : 0,
    },
    members,
    siteStats,
    typeStats,
    trend,
    proposals: proposalStats,
    commsChannels,
    commsTrend,
    issues,
    priorities,
    deadlines,
    reportsData,
  };
}

// ---- Raw per-report rows, used by the Word/PDF/Excel exporters ----

export type RawActivity = { activityType: string; typeLabel: string; desc: string };
export type RawSiteUpdate = {
  reportId: string;
  member: string;
  siteCode: string;
  siteName: string;
  numActs: number;
  activitiesList: RawActivity[];
  desc: string;
  results: string;
  plan: string;
  photos: PhotoItem[];
};
export type RawProposal = { reportId: string; member: string; name: string; statusLabel: string; deadline: string; note: string };
export type RawIssue = { reportId: string; member: string; siteCode: string; description: string; actionNeeded: string; pic: string };
export type RawPriority = { reportId: string; member: string; priorityNo: string; siteCode: string; activity: string; pic: string; deadline: string };
export type RawDeadline = { reportId: string; member: string; date: string; event: string; siteDonor: string; pic: string };
export type RawReportsData = { reportId: string; member: string; itemName: string; typeLabel: string; statusUpdate: string; deadlineAction: string };
export type RawComm = { reportId: string; member: string; channelLabel: string; numCompleted: number; thisMonth: string; nextMonth: string };

export async function getMonthRawRows(month: string): Promise<{
  siteUpdates: RawSiteUpdate[];
  proposals: RawProposal[];
  issues: RawIssue[];
  priorities: RawPriority[];
  deadlines: RawDeadline[];
  reportsData: RawReportsData[];
  comms: RawComm[];
}> {
  const [users, reports, siteUpdatesAll, activitiesAll, proposalsAll, challengesAll, prioritiesAll, deadlinesAll, reportsDataAll, commsAll, masterData] =
    await Promise.all([
      readObjects("Dim_Users"),
      readObjects("Fact_Reports"),
      readObjects("Data_Site_Updates"),
      readObjects("Data_Activities"),
      readObjects("Data_Proposals"),
      readObjects("Data_Challenges"),
      readObjects("Data_Priorities"),
      readObjects("Data_Deadlines"),
      readObjects("Data_Reports_Data"),
      readObjects("Data_Communications"),
      getMasterData(),
    ]);
  const { sites, activityTypes: ACTIVITY_TYPES, commChannels: COMM_CHANNELS, proposalStatuses: PROPOSAL_STATUSES, reportTypes: REPORT_TYPES } = masterData;
  const nameOf = (uid: string) => users.find((u) => u.User_ID === uid)?.Full_Name || uid;
  const monthReports = reports.filter((r) => r.Reporting_Month === month);
  const idToMember = new Map(monthReports.map((r) => [r.Report_ID, nameOf(r.User_ID)]));
  const ids = new Set(monthReports.map((r) => r.Report_ID));

  const siteUpdates: RawSiteUpdate[] = siteUpdatesAll
    .filter((s) => ids.has(s.Report_ID))
    .map((s) => {
      const activitiesList: RawActivity[] = activitiesAll
        .filter((a) => a.Report_ID === s.Report_ID && a.Site_Code === s.Site_Code)
        .map((a) => ({ activityType: a.Activity_Type, typeLabel: labelOf(ACTIVITY_TYPES, a.Activity_Type, "vi"), desc: a.Activity_Desc }));
      return {
        reportId: s.Report_ID,
        member: idToMember.get(s.Report_ID) || "",
        siteCode: s.Site_Code,
        siteName: siteName(sites, s.Site_Code, "vi"),
        numActs: activitiesList.length || parseInt(s.Num_Acts, 10) || 0,
        activitiesList,
        desc: s.Activities_Notes,
        results: s.Results_Challenges,
        plan: s.Next_Month_Plan,
        photos: parsePhotos(s.Photos_JSON),
      };
    });

  const proposals: RawProposal[] = proposalsAll
    .filter((p) => ids.has(p.Report_ID))
    .map((p) => ({
      reportId: p.Report_ID,
      member: idToMember.get(p.Report_ID) || "",
      name: p.Proposal_Name,
      statusLabel: labelOf(PROPOSAL_STATUSES, p.Status_Code, "vi"),
      deadline: p.Deadline,
      note: p.Note || p.Short_Note,
    }));

  const issues: RawIssue[] = challengesAll
    .filter((i) => ids.has(i.Report_ID))
    .map((i) => ({
      reportId: i.Report_ID,
      member: idToMember.get(i.Report_ID) || "",
      siteCode: i.Site_Area,
      description: i.Issue_Desc,
      actionNeeded: i.Action_Needed,
      pic: i.Responsible,
    }));

  const priorities: RawPriority[] = prioritiesAll
    .filter((p) => ids.has(p.Report_ID))
    .map((p) => ({
      reportId: p.Report_ID,
      member: idToMember.get(p.Report_ID) || "",
      priorityNo: p.Priority_No,
      siteCode: p.Site_Area,
      activity: p.Planned_Activity,
      pic: p.Responsible,
      deadline: p.Deadline,
    }))
    .sort((a, b) => (parseInt(a.priorityNo, 10) || 99) - (parseInt(b.priorityNo, 10) || 99));

  const deadlines: RawDeadline[] = deadlinesAll
    .filter((d) => ids.has(d.Report_ID))
    .map((d) => ({
      reportId: d.Report_ID,
      member: idToMember.get(d.Report_ID) || "",
      date: d.Event_Date,
      event: d.Event_Desc,
      siteDonor: d.Site_Donor,
      pic: d.Responsible,
    }));

  const reportsData: RawReportsData[] = reportsDataAll
    .filter((r) => ids.has(r.Report_ID))
    .map((r) => ({
      reportId: r.Report_ID,
      member: idToMember.get(r.Report_ID) || "",
      itemName: r.Item_Name,
      typeLabel: labelOf(REPORT_TYPES, r.Type_Code, "vi"),
      statusUpdate: r.Status_Update,
      deadlineAction: r.Deadline_Action,
    }));

  const comms: RawComm[] = commsAll
    .filter((c) => ids.has(c.Report_ID))
    .map((c) => ({
      reportId: c.Report_ID,
      member: idToMember.get(c.Report_ID) || "",
      channelLabel: labelOf(COMM_CHANNELS, c.Channel_Code, "vi"),
      numCompleted: parseInt(c.Num_Completed, 10) || 0,
      thisMonth: c.This_Month,
      nextMonth: c.Next_Month,
    }));

  return { siteUpdates, proposals, issues, priorities, deadlines, reportsData, comms };
}

export { siteName };
