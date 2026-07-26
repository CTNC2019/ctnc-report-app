import { NextResponse } from "next/server";
import { getSession, getLiveSession, isManager } from "@/lib/auth";
import { appendObjects, deleteRowsByKey, readObjects, updateObjectByKey } from "@/lib/sheets";
import { stringifyPhotos, stringifyDocs, type PhotoItem, type DocLink } from "@/lib/reportData";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await getLiveSession(session);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [reports, users, siteUpdates] = await Promise.all([
    readObjects("Fact_Reports"),
    readObjects("Dim_Users"),
    readObjects("Data_Site_Updates"),
  ]);

  // Policy: every signed-in member can VIEW every report (transparency across the team).
  // Edit/delete rights on someone else's report are enforced separately, per-action, in
  // the POST/DELETE handlers below — staff never gets those, only view access here.
  const visible = reports;
  const nameOf = (uid: string) => users.find((u) => u.User_ID === uid)?.Full_Name || uid;

  const list = visible
    .map((r) => ({
      id: r.Report_ID,
      userId: r.User_ID,
      member: nameOf(r.User_ID),
      month: r.Reporting_Month,
      status: r.Status || "Draft",
      submittedAt: r.Submitted_At,
      totalActivities: siteUpdates
        .filter((s) => s.Report_ID === r.Report_ID)
        .reduce((sum, s) => sum + (parseInt(s.Num_Acts, 10) || 0), 0),
    }))
    .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""));

  return NextResponse.json({ reports: list });
}

type ActivityIn = { activityType: string; desc?: string };
type SiteIn = {
  siteCode: string;
  activities?: ActivityIn[];
  keyActivities?: string;
  keyResults?: string;
  difficulties?: string;
  followUp?: string;
  plan?: string;
  photos?: PhotoItem[];
  relatedDocs?: DocLink[];
};
type ProposalIn = { name: string; writer?: string; donor?: string; status?: string; deadline?: string; note?: string };
type ReportItemIn = { itemName: string; typeCode?: string; statusUpdate?: string; deadlineAction?: string };
type CommIn = { channelCode: string; count?: number | string; thisMonth?: string; nextMonth?: string };
type IssueIn = { siteCode?: string; description: string; actionNeeded?: string; pic?: string };
type PriorityIn = { priorityNo?: number; siteCode?: string; activity: string; pic?: string; deadline?: string };
type DeadlineIn = { date?: string; event: string; siteDonor?: string; pic?: string };

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await getLiveSession(session);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const month: string = body.month;
  if (!month) return NextResponse.json({ error: "missing month" }, { status: 400 });

  // targetUserId is only used to decide the owner of a BRAND NEW report (Manager/Admin
  // creating one on someone else's behalf via an explicit body.userId). It must never be
  // used to overwrite the owner of an EXISTING report — see the `current` branch below.
  const targetUserId: string = isManager(me) && body.userId ? body.userId : me.id;
  const status: string = body.status === "Submitted" ? "Submitted" : "Draft";

  const existing = await readObjects("Fact_Reports");

  // A brand-new report (no reportId from the client — that only happens when editing
  // an existing one via ?id=) must never collide with a report already on file for the
  // same member + month. The old scheme derived the id purely from userId+month, so a
  // second "Tạo báo cáo mới" for a month that already had a report silently overwrote
  // it instead of creating an independent one. Give every genuinely-new report its own
  // id: the plain "user-month" id if that slot is free, otherwise a numbered suffix.
  let reportId: string = body.reportId;
  if (!reportId) {
    const base = `${targetUserId}-${month.replace("/", "")}`;
    const sameSlot = existing.filter((r) => r.Report_ID === base || r.Report_ID.startsWith(base + "-"));
    reportId = sameSlot.length === 0 ? base : `${base}-${sameSlot.length + 1}`;
  }

  const current = existing.find((r) => r.Report_ID === reportId);

  // Editing an existing report: only the original owner, or a Manager/Admin acting on
  // their behalf (to correct content or approve), may save. Staff can never edit a
  // report they don't own — per policy, they have view-only access to others' reports.
  if (current && current.User_ID !== me.id && !isManager(me)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const reportRow = {
    Report_ID: reportId,
    // Ownership must never change just because someone else (a Manager/Admin fixing or
    // approving the report) hit Save. Preserve the original owner on every update; the
    // targetUserId computed above only applies when a genuinely new report is created.
    User_ID: current ? current.User_ID : targetUserId,
    Reporting_Month: month,
    Date_Prepared: current?.Date_Prepared || now,
    Submitted_At: status === "Submitted" ? now : current?.Submitted_At || "",
    Status: status,
  };

  if (current) {
    await updateObjectByKey("Fact_Reports", "Report_ID", reportId, reportRow);
  } else {
    await appendObjects("Fact_Reports", [reportRow]);
  }

  // Replace all child rows wholesale so edits behave predictably.
  await Promise.all([
    deleteRowsByKey("Data_Site_Updates", "Report_ID", reportId),
    deleteRowsByKey("Data_Activities", "Report_ID", reportId),
    deleteRowsByKey("Data_Proposals", "Report_ID", reportId),
    deleteRowsByKey("Data_Reports_Data", "Report_ID", reportId),
    deleteRowsByKey("Data_Communications", "Report_ID", reportId),
    deleteRowsByKey("Data_Challenges", "Report_ID", reportId),
    deleteRowsByKey("Data_Priorities", "Report_ID", reportId),
    deleteRowsByKey("Data_Deadlines", "Report_ID", reportId),
  ]);

  const sites: SiteIn[] = body.sites || [];
  const siteUpdateRows = sites
    .filter(
      (s) =>
        (s.activities && s.activities.length) ||
        s.keyActivities ||
        s.keyResults ||
        s.difficulties ||
        s.followUp ||
        s.plan ||
        (s.photos && s.photos.length) ||
        (s.relatedDocs && s.relatedDocs.length)
    )
    .map((s) => ({
      Update_ID: `${reportId}-${s.siteCode}`,
      Report_ID: reportId,
      Site_Code: s.siteCode,
      Num_Acts: String((s.activities || []).length),
      Activities_Notes: (s.activities || []).map((a) => a.desc).filter(Boolean).join("; "),
      Key_Activities: s.keyActivities || "",
      Key_Results: s.keyResults || "",
      Difficulties_Challenges: s.difficulties || "",
      Follow_Up: s.followUp || "",
      Next_Month_Plan: s.plan || "",
      Photos_JSON: stringifyPhotos(s.photos || []),
      Related_Docs_JSON: stringifyDocs(s.relatedDocs || []),
    }));
  if (siteUpdateRows.length) await appendObjects("Data_Site_Updates", siteUpdateRows);

  const activityRows = sites.flatMap((s, si) =>
    (s.activities || []).map((a, ai) => ({
      Activity_ID: `${reportId}-${s.siteCode}-${si}-${ai}`,
      Report_ID: reportId,
      Site_Code: s.siteCode,
      Activity_Type: a.activityType || "OTHER",
      Activity_Desc: a.desc || "",
    }))
  );
  if (activityRows.length) await appendObjects("Data_Activities", activityRows);

  const proposals: ProposalIn[] = body.proposals || [];
  if (proposals.length) {
    await appendObjects(
      "Data_Proposals",
      proposals.map((p, i) => ({
        Prop_ID: `P${reportId}-${i}`,
        Report_ID: reportId,
        Proposal_Name: p.name || "",
        Writer_UserID: p.writer || "",
        Donor: p.donor || "",
        Status_Code: p.status || "Writing",
        Deadline: p.deadline || "",
        Short_Note: p.note || "",
        Note: p.note || "",
      }))
    );
  }

  const reportItems: ReportItemIn[] = body.reportItems || [];
  if (reportItems.length) {
    await appendObjects(
      "Data_Reports_Data",
      reportItems.map((r, i) => ({
        RD_ID: `RD${reportId}-${i}`,
        Report_ID: reportId,
        Item_Name: r.itemName || "",
        Type_Code: r.typeCode || "Other",
        Status_Update: r.statusUpdate || "",
        Deadline_Action: r.deadlineAction || "",
      }))
    );
  }

  const comms: CommIn[] = body.comms || [];
  const commRows = comms
    .filter((c) => (c.count && Number(c.count) > 0) || c.thisMonth || c.nextMonth)
    .map((c, i) => ({
      Comm_ID: `C${reportId}-${i}`,
      Report_ID: reportId,
      Channel_Code: c.channelCode,
      Num_Completed: String(c.count ?? 0),
      This_Month: c.thisMonth || "",
      Next_Month: c.nextMonth || "",
    }));
  if (commRows.length) await appendObjects("Data_Communications", commRows);

  const issues: IssueIn[] = body.issues || [];
  if (issues.length) {
    await appendObjects(
      "Data_Challenges",
      issues.map((x, i) => ({
        Issue_ID: `I${reportId}-${i}`,
        Report_ID: reportId,
        Issue_Desc: x.description || "",
        Site_Area: x.siteCode || "",
        Action_Needed: x.actionNeeded || "",
        Responsible: x.pic || "",
      }))
    );
  }

  const priorities: PriorityIn[] = body.priorities || [];
  if (priorities.length) {
    await appendObjects(
      "Data_Priorities",
      priorities.map((p, i) => ({
        Pri_ID: `PR${reportId}-${i}`,
        Report_ID: reportId,
        Priority_No: String(p.priorityNo ?? i + 1),
        Site_Area: p.siteCode || "",
        Planned_Activity: p.activity || "",
        Responsible: p.pic || "",
        Deadline: p.deadline || "",
      }))
    );
  }

  const deadlines: DeadlineIn[] = body.deadlines || [];
  if (deadlines.length) {
    await appendObjects(
      "Data_Deadlines",
      deadlines.map((d, i) => ({
        DL_ID: `DL${reportId}-${i}`,
        Report_ID: reportId,
        Event_Date: d.date || "",
        Event_Desc: d.event || "",
        Site_Donor: d.siteDonor || "",
        Responsible: d.pic || "",
      }))
    );
  }

  return NextResponse.json({ success: true, reportId });
}
