import { NextResponse } from "next/server";
import { getSession, isAdmin, isManager } from "@/lib/auth";
import { deleteRowsByKey, readObjects } from "@/lib/sheets";
import { parsePhotos } from "@/lib/reportData";

// Child tables that store rows keyed by Report_ID. Deleting a report wipes the parent
// row in Fact_Reports plus every child row across these tabs so no orphaned data remains.
const CHILD_TABLES = [
  "Data_Site_Updates",
  "Data_Activities",
  "Data_Proposals",
  "Data_Reports_Data",
  "Data_Communications",
  "Data_Challenges",
  "Data_Priorities",
  "Data_Deadlines",
  "Data_Comments",
];

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const [reports, users, siteUpdates, activities, proposals, reportItems, comms, issues, priorities, deadlines] = await Promise.all([
    readObjects("Fact_Reports"),
    readObjects("Dim_Users"),
    readObjects("Data_Site_Updates"),
    readObjects("Data_Activities"),
    readObjects("Data_Proposals"),
    readObjects("Data_Reports_Data"),
    readObjects("Data_Communications"),
    readObjects("Data_Challenges"),
    readObjects("Data_Priorities"),
    readObjects("Data_Deadlines"),
  ]);

  const report = reports.find((r) => r.Report_ID === id);
  if (!report) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (report.User_ID !== me.id && !isManager(me)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const member = users.find((u) => u.User_ID === report.User_ID);

  const sites = siteUpdates
    .filter((s) => s.Report_ID === id)
    .map((s) => ({
      siteCode: s.Site_Code,
      activities: activities
        .filter((a) => a.Report_ID === id && a.Site_Code === s.Site_Code)
        .map((a) => ({ activityType: a.Activity_Type, desc: a.Activity_Desc })),
      notes: s.Notes_This_Month,
      results: s.Results_Challenges,
      plan: s.Next_Month_Plan,
      photos: parsePhotos(s.Photos_JSON),
    }));

  return NextResponse.json({
    report: {
      id: report.Report_ID,
      userId: report.User_ID,
      member: member?.Full_Name || report.User_ID,
      month: report.Reporting_Month,
      status: report.Status || "Draft",
      submittedAt: report.Submitted_At,
      sites,
      proposals: proposals
        .filter((p) => p.Report_ID === id)
        .map((p) => ({ name: p.Proposal_Name, status: p.Status_Code, deadline: p.Deadline, note: p.Note || p.Short_Note })),
      reportItems: reportItems
        .filter((r) => r.Report_ID === id)
        .map((r) => ({ itemName: r.Item_Name, typeCode: r.Type_Code, statusUpdate: r.Status_Update, deadlineAction: r.Deadline_Action })),
      comms: comms
        .filter((c) => c.Report_ID === id)
        .map((c) => ({ channelCode: c.Channel_Code, count: c.Num_Completed, thisMonth: c.This_Month, nextMonth: c.Next_Month })),
      issues: issues
        .filter((x) => x.Report_ID === id)
        .map((x) => ({ siteCode: x.Site_Area, description: x.Issue_Desc, actionNeeded: x.Action_Needed, pic: x.Responsible })),
      priorities: priorities
        .filter((x) => x.Report_ID === id)
        .map((x) => ({ siteCode: x.Site_Area, activity: x.Planned_Activity, pic: x.Responsible, deadline: x.Deadline })),
      deadlines: deadlines
        .filter((x) => x.Report_ID === id)
        .map((x) => ({ date: x.Event_Date, event: x.Event_Desc, siteDonor: x.Site_Donor, pic: x.Responsible })),
    },
  });
}

// Delete rules: the owner may delete their own report only while it is still a Draft
// (nothing has been submitted for review yet, so nothing to lose). Once a report has
// been Submitted/Approved/Returned, only an Admin can remove it — this preserves the
// audit trail for reports that a Manager has already seen or approved.
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const reports = await readObjects("Fact_Reports");
  const report = reports.find((r) => r.Report_ID === id);
  if (!report) return NextResponse.json({ error: "not found" }, { status: 404 });

  const status = report.Status || "Draft";
  const isOwner = report.User_ID === me.id;
  const canDelete = isAdmin(me) || (isOwner && status === "Draft");
  if (!canDelete) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await Promise.all([
    deleteRowsByKey("Fact_Reports", "Report_ID", id),
    ...CHILD_TABLES.map((table) => deleteRowsByKey(table, "Report_ID", id)),
  ]);

  return NextResponse.json({ success: true });
}
