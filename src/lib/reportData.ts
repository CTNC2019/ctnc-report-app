import {
  readObjects,
  siteName,
  labelOf,
  getMasterData,
} from "@/lib/sheets";
import {
  parseISODate,
  rangesOverlap,
  currentMonthRange,
  formatRangeShort,
} from "@/lib/dateRange";

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

export type DocLink = { url: string; label: string };

export function parseDocs(json: string | undefined): DocLink[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr.filter((d) => d && d.url);
  } catch {
    // ignore malformed JSON, treat as no documents
  }
  return [];
}

export function stringifyDocs(docs: DocLink[]): string {
  return JSON.stringify((docs || []).filter((d) => d && d.url));
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
// A "period" here is a distinct Start_Date/End_Date pair drawn from actual submitted
// reports — the free-form Start/End Date model has no fixed monthly grid to snap trend
// points to, so the trend chart shows the last 6 *reporting periods that were actually
// used*, oldest first. `label` is a short, human-readable range (e.g. "01/07 – 31/07").
export type TrendPoint = { startDate: string; endDate: string; label: string; reportsSubmitted: number; totalActivities: number };
export type ProposalStat = { status: string; label: string; count: number };
export type DonorStat = { donor: string; count: number };
export type CommChannelStat = { code: string; label: string; count: number };
export type CommTrendPoint = { startDate: string; endDate: string; label: string; channels: Record<string, number> };

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
  // The reporting period actually used to compute everything below — either the
  // caller's requested Start/End Date (if valid) or the current calendar month as a
  // sensible default, mirroring the old "current month" default exactly.
  startDate: string;
  endDate: string;
  // Distinct periods drawn from real report data, newest first — replaces the old
  // fixed "availableMonths" list now that periods are free-form date ranges. Used to
  // populate a "recent periods" quick-pick alongside the Start/End Date inputs.
  availableRanges: { startDate: string; endDate: string; label: string }[];
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
  proposalsByDonor: DonorStat[];
  commsChannels: CommChannelStat[];
  commsTrend: CommTrendPoint[];
  issues: IssueItem[];
  priorities: PriorityItem[];
  deadlines: DeadlineItem[];
  reportsData: ReportsDataItem[];
};

/** Parse a dd/mm/yyyy or yyyy-mm-dd style date string into a comparable Date, best-effort.
 * Used for free-text date fields entered by hand (deadlines, proposal due dates) —
 * unrelated to the Start_Date/End_Date reporting-period fields, which are always ISO. */
function parseDate(s: string): Date | null {
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function getFullDashboardData(startDateIn?: string, endDateIn?: string, lang: "vi" | "en" = "vi"): Promise<DashboardData> {
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

  // --- Resolve the viewing period: caller's Start/End Date if valid, else current month ---
  const defaultRange = currentMonthRange();
  const validCustomRange = !!(startDateIn && endDateIn && parseISODate(startDateIn) && parseISODate(endDateIn) && startDateIn <= endDateIn);
  const targetStart = validCustomRange ? (startDateIn as string) : defaultRange.startDate;
  const targetEnd = validCustomRange ? (endDateIn as string) : defaultRange.endDate;

  // Distinct periods actually used across all reports, newest first — feeds the
  // "recent periods" quick-pick on the Dashboard (replaces the old availableMonths list).
  const periodPairs = new Map<string, { startDate: string; endDate: string }>();
  reports.forEach((r) => {
    if (r.Start_Date && r.End_Date) periodPairs.set(`${r.Start_Date}|${r.End_Date}`, { startDate: r.Start_Date, endDate: r.End_Date });
  });
  periodPairs.set(`${defaultRange.startDate}|${defaultRange.endDate}`, defaultRange);
  const availableRanges = Array.from(periodPairs.values())
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .map((p) => ({ ...p, label: formatRangeShort(p.startDate, p.endDate) }));

  // A report is "in range" if its own reporting period overlaps at all with the
  // viewing range — the direct generalization of the old exact "Reporting_Month ===
  // targetMonth" check now that periods are free-form instead of fixed calendar months.
  const rangeReports = reports.filter((r) => r.Start_Date && r.End_Date && rangesOverlap(r.Start_Date, r.End_Date, targetStart, targetEnd));
  const reportIdsInRange = new Set(rangeReports.map((r) => r.Report_ID));

  const nameOf = (uid: string) => users.find((u) => u.User_ID === uid)?.Full_Name || uid;

  // --- Members table ---
  // A member can have more than one report whose period overlaps the viewing range —
  // pick the most recently touched one to represent that member's status chip here;
  // the Reports list page and the export/aggregation totals below still include all of
  // them, nothing is hidden or dropped.
  const members: MemberStatus[] = activeUsers.map((u) => {
    const userReports = rangeReports
      .filter((r) => r.User_ID === u.User_ID)
      .sort((a, b) => (b.Submitted_At || b.Date_Prepared || "").localeCompare(a.Submitted_At || a.Date_Prepared || ""));
    const rep = userReports[0];
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

  const activitiesInRange = activities.filter((a) => reportIdsInRange.has(a.Report_ID));
  const activitiesCompleted = activitiesInRange.length;

  // --- Site chart (structured activities, falls back to Num_Acts if no structured rows yet) ---
  const siteMap = new Map<string, number>();
  SITES.forEach((s) => siteMap.set(s.code, 0));
  if (activitiesInRange.length) {
    activitiesInRange.forEach((a) => siteMap.set(a.Site_Code, (siteMap.get(a.Site_Code) || 0) + 1));
  } else {
    siteUpdates
      .filter((s) => reportIdsInRange.has(s.Report_ID))
      .forEach((s) => siteMap.set(s.Site_Code, (siteMap.get(s.Site_Code) || 0) + (parseInt(s.Num_Acts, 10) || 0)));
  }
  const siteStats: SiteStat[] = SITES.map((s) => ({ code: s.code, name: s.enShort || s.en, totalActs: siteMap.get(s.code) || 0 }));

  // --- Activity-type chart ---
  const typeMap = new Map<string, number>();
  ACTIVITY_TYPES.forEach((t) => typeMap.set(t.code, 0));
  activitiesInRange.forEach((a) => typeMap.set(a.Activity_Type, (typeMap.get(a.Activity_Type) || 0) + 1));
  const typeStats: TypeStat[] = ACTIVITY_TYPES.map((t) => ({ code: t.code, label: lang === "en" ? t.en : t.vi, count: typeMap.get(t.code) || 0 }));

  // --- Trend: last 6 reporting periods actually used (by Start_Date desc among
  // submitted, i.e. non-Draft, reports), oldest first for left-to-right chart reading.
  // Independent of the currently-viewed range — this always shows the most recent
  // history regardless of which period the user is currently looking at.
  const periodKey = (r: Record<string, string>) => `${r.Start_Date}|${r.End_Date}`;
  const submittedReports = reports.filter((r) => r.Status && r.Status !== "Draft" && r.Start_Date && r.End_Date);
  const recentPeriods = Array.from(new Set(submittedReports.map(periodKey)))
    .map((k) => {
      const [s, e] = k.split("|");
      return { startDate: s, endDate: e };
    })
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 6)
    .reverse();

  const trend: TrendPoint[] = recentPeriods.map((p) => {
    const repsInP = submittedReports.filter((r) => r.Start_Date === p.startDate && r.End_Date === p.endDate);
    const idsInP = new Set(repsInP.map((r) => r.Report_ID));
    const actsInP = activities.filter((a) => idsInP.has(a.Report_ID)).length;
    const fallbackActs = actsInP || siteUpdates.filter((s) => idsInP.has(s.Report_ID)).reduce((sum, s) => sum + (parseInt(s.Num_Acts, 10) || 0), 0);
    return { startDate: p.startDate, endDate: p.endDate, label: formatRangeShort(p.startDate, p.endDate), reportsSubmitted: repsInP.length, totalActivities: fallbackActs };
  });

  // --- Proposals summary (this period) ---
  const propsInRange = proposals.filter((p) => reportIdsInRange.has(p.Report_ID));
  const propCounts = new Map<string, number>();
  propsInRange.forEach((p) => {
    const code = p.Status_Code || "Writing";
    propCounts.set(code, (propCounts.get(code) || 0) + 1);
  });
  const proposalStats: ProposalStat[] = PROPOSAL_STATUSES.map((s) => ({
    status: s.code,
    label: lang === "en" ? s.en : s.vi,
    count: propCounts.get(s.code) || 0,
  }));
  const activeProposals = (propCounts.get("Writing") || 0) + (propCounts.get("Needs review") || 0);

  const donorMap = new Map<string, number>();
  propsInRange.forEach((p) => {
    const donor = (p.Donor || "").trim();
    if (!donor) return;
    donorMap.set(donor, (donorMap.get(donor) || 0) + 1);
  });
  const proposalsByDonor: DonorStat[] = Array.from(donorMap.entries())
    .map(([donor, count]) => ({ donor, count }))
    .sort((a, b) => b.count - a.count);

  // --- Comms this period + trend across the same 6 recent periods as above ---
  const commsInRange = commsRaw.filter((c) => reportIdsInRange.has(c.Report_ID));
  const commsOutputs = commsInRange.reduce((sum, c) => sum + (parseInt(c.Num_Completed, 10) || 0), 0);
  const commChanMap = new Map<string, number>();
  COMM_CHANNELS.forEach((c) => commChanMap.set(c.code, 0));
  commsInRange.forEach((c) => commChanMap.set(c.Channel_Code, (commChanMap.get(c.Channel_Code) || 0) + (parseInt(c.Num_Completed, 10) || 0)));
  const commsChannels: CommChannelStat[] = COMM_CHANNELS.map((c) => ({ code: c.code, label: lang === "en" ? c.en : c.vi, count: commChanMap.get(c.code) || 0 }));

  const commsTrend: CommTrendPoint[] = recentPeriods.map((p) => {
    const idsInP = new Set(submittedReports.filter((r) => r.Start_Date === p.startDate && r.End_Date === p.endDate).map((r) => r.Report_ID));
    const rowsInP = commsRaw.filter((c) => idsInP.has(c.Report_ID));
    const channels: Record<string, number> = {};
    COMM_CHANNELS.forEach((c) => (channels[c.code] = 0));
    rowsInP.forEach((c) => (channels[c.Channel_Code] = (channels[c.Channel_Code] || 0) + (parseInt(c.Num_Completed, 10) || 0)));
    return { startDate: p.startDate, endDate: p.endDate, label: formatRangeShort(p.startDate, p.endDate), channels };
  });

  // --- Issues: merges 2 sources per the revised template —
  // (a) cross-project "Key challenges or support needed" (Data_Challenges, section V), and
  // (b) per-site "Difficulties, challenges" (1.3) entered under each site in the monthly form,
  //     with that site's "Follow-up" (1.4) carried along as the action-needed note.
  const projectIssues: IssueItem[] = challengesRaw
    .filter((i) => reportIdsInRange.has(i.Report_ID))
    .map((i) => {
      const rep = rangeReports.find((r) => r.Report_ID === i.Report_ID);
      return {
        reportId: i.Report_ID,
        member: rep ? nameOf(rep.User_ID) : "",
        siteCode: i.Site_Area,
        description: i.Issue_Desc,
        actionNeeded: i.Action_Needed,
        pic: i.Responsible,
      };
    });
  const siteIssues: IssueItem[] = siteUpdates
    .filter((s) => reportIdsInRange.has(s.Report_ID) && (s.Difficulties_Challenges || "").trim())
    .map((s) => {
      const rep = rangeReports.find((r) => r.Report_ID === s.Report_ID);
      return {
        reportId: s.Report_ID,
        member: rep ? nameOf(rep.User_ID) : "",
        siteCode: s.Site_Code,
        description: s.Difficulties_Challenges,
        actionNeeded: s.Follow_Up || "",
        pic: "",
      };
    });
  const issues: IssueItem[] = [...projectIssues, ...siteIssues];
  const issuesNeedingSupport = issues.length;

  // --- Priorities (Data_Priorities) ---
  const priorities: PriorityItem[] = prioritiesRaw
    .filter((p) => reportIdsInRange.has(p.Report_ID))
    .map((p) => {
      const rep = rangeReports.find((r) => r.Report_ID === p.Report_ID);
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

  // --- Deadlines (Data_Deadlines) — upcoming across all reports, not just this period's ---
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
    .filter((r) => reportIdsInRange.has(r.Report_ID))
    .map((r) => {
      const rep = rangeReports.find((x) => x.Report_ID === r.Report_ID);
      return {
        reportId: r.Report_ID,
        member: rep ? nameOf(rep.User_ID) : "",
        itemName: r.Item_Name,
        typeCode: r.Type_Code,
        typeLabel: labelOf(REPORT_TYPES, r.Type_Code, lang),
        statusUpdate: r.Status_Update,
        deadlineAction: r.Deadline_Action,
      };
    });

  return {
    startDate: targetStart,
    endDate: targetEnd,
    availableRanges,
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
    proposalsByDonor,
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
  keyActivities: string;
  keyResults: string;
  difficulties: string;
  followUp: string;
  plan: string;
  photos: PhotoItem[];
  relatedDocs: DocLink[];
};
export type RawProposal = { reportId: string; member: string; name: string; writer: string; donor: string; statusLabel: string; deadline: string; note: string };
export type RawIssue = { reportId: string; member: string; siteCode: string; description: string; actionNeeded: string; pic: string };
export type RawPriority = { reportId: string; member: string; priorityNo: string; siteCode: string; activity: string; pic: string; deadline: string };
export type RawDeadline = { reportId: string; member: string; date: string; event: string; siteDonor: string; pic: string };
export type RawReportsData = { reportId: string; member: string; itemName: string; typeLabel: string; statusUpdate: string; deadlineAction: string };
export type RawComm = { reportId: string; member: string; channelLabel: string; numCompleted: number; thisMonth: string; nextMonth: string };

/** Raw, per-report rows for the given reporting period — feeds the Word/PDF/Excel
 * exporters. `lang` controls every translated label pulled from Master_Data (activity
 * type, report type, comm channel, proposal status); site names are always the fixed
 * short-English form regardless of lang, per the standing site-naming decision. A
 * report is included if its own Start_Date/End_Date overlaps [startDate, endDate] at
 * all — the same overlap rule used by the Dashboard. */
export async function getRangeRawRows(
  startDate: string,
  endDate: string,
  lang: "vi" | "en" = "vi"
): Promise<{
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
  const rangeReports = reports.filter((r) => r.Start_Date && r.End_Date && rangesOverlap(r.Start_Date, r.End_Date, startDate, endDate));
  const idToMember = new Map(rangeReports.map((r) => [r.Report_ID, nameOf(r.User_ID)]));
  const ids = new Set(rangeReports.map((r) => r.Report_ID));

  const siteUpdates: RawSiteUpdate[] = siteUpdatesAll
    .filter((s) => ids.has(s.Report_ID))
    .map((s) => {
      const activitiesList: RawActivity[] = activitiesAll
        .filter((a) => a.Report_ID === s.Report_ID && a.Site_Code === s.Site_Code)
        .map((a) => ({ activityType: a.Activity_Type, typeLabel: labelOf(ACTIVITY_TYPES, a.Activity_Type, lang), desc: a.Activity_Desc }));
      return {
        reportId: s.Report_ID,
        member: idToMember.get(s.Report_ID) || "",
        siteCode: s.Site_Code,
        siteName: siteName(sites, s.Site_Code),
        numActs: activitiesList.length || parseInt(s.Num_Acts, 10) || 0,
        activitiesList,
        desc: s.Activities_Notes,
        keyActivities: s.Key_Activities,
        keyResults: s.Key_Results,
        difficulties: s.Difficulties_Challenges,
        followUp: s.Follow_Up,
        plan: s.Next_Month_Plan,
        photos: parsePhotos(s.Photos_JSON),
        relatedDocs: parseDocs(s.Related_Docs_JSON),
      };
    });

  const proposalsOut: RawProposal[] = proposalsAll
    .filter((p) => ids.has(p.Report_ID))
    .map((p) => ({
      reportId: p.Report_ID,
      member: idToMember.get(p.Report_ID) || "",
      name: p.Proposal_Name,
      writer: nameOf(p.Writer_UserID) || p.Writer_UserID || "",
      donor: p.Donor || "",
      statusLabel: labelOf(PROPOSAL_STATUSES, p.Status_Code, lang),
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
      typeLabel: labelOf(REPORT_TYPES, r.Type_Code, lang),
      statusUpdate: r.Status_Update,
      deadlineAction: r.Deadline_Action,
    }));

  const comms: RawComm[] = commsAll
    .filter((c) => ids.has(c.Report_ID))
    .map((c) => ({
      reportId: c.Report_ID,
      member: idToMember.get(c.Report_ID) || "",
      channelLabel: labelOf(COMM_CHANNELS, c.Channel_Code, lang),
      numCompleted: parseInt(c.Num_Completed, 10) || 0,
      thisMonth: c.This_Month,
      nextMonth: c.Next_Month,
    }));

  return { siteUpdates, proposals: proposalsOut, issues, priorities, deadlines, reportsData, comms };
}

export { siteName };
