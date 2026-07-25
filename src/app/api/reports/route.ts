import { NextResponse } from "next/server";
import { getSession, isManager } from "@/lib/auth";
import { appendObjects, deleteRowsByKey, readObjects, updateObjectByKey } from "@/lib/sheets";

export const runtime = "nodejs";

export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [reports, users, siteUpdates] = await Promise.all([
    readObjects("Fact_Reports"),
    readObjects("Dim_Users"),
    readObjects("Data_Site_Updates"),
  ]);

  const visible = isManager(me) ? reports : reports.filter((r) => r.User_ID === me.id);
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

type SiteUpdateIn = { siteCode: string; numActs?: number | string; desc?: string; results?: string; plan?: string };
type ProposalIn = { name: string; status?: string; deadline?: string; note?: string };
type IssueIn = { type?: string; siteCode?: string; description: string; pic?: string; deadline?: string };

export async function POST(request: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const month: string = body.month;
  if (!month) return NextResponse.json({ error: "missing month" }, { status: 400 });

  const targetUserId: string = isManager(me) && body.userId ? body.userId : me.id;
  const reportId: string = body.reportId || `${targetUserId}-${month.replace("/", "")}`;
  const status: string = body.status === "Submitted" ? "Submitted" : "Draft";

  const existing = await readObjects("Fact_Reports");
  const current = existing.find((r) => r.Report_ID === reportId);
  if (current && current.User_ID !== targetUserId && !isManager(me)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const now = new Date().toISOString();
  const reportRow = {
    Report_ID: reportId,
    User_ID: targetUserId,
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

  // Replace child rows wholesale so edits behave predictably.
  await deleteRowsByKey("Data_Site_Updates", "Report_ID", reportId);
  await deleteRowsByKey("Data_Proposals", "Report_ID", reportId);
  await deleteRowsByKey("Data_Issues_Priorities", "Report_ID", reportId);

  const siteUpdates: SiteUpdateIn[] = body.siteUpdates || [];
  if (siteUpdates.length) {
    await appendObjects(
      "Data_Site_Updates",
      siteUpdates.map((s, i) => ({
        Update_ID: `${reportId}-${s.siteCode}-${i}`,
        Report_ID: reportId,
        Site_Code: s.siteCode,
        Num_Acts: String(s.numActs ?? 0),
        Activities_Notes: s.desc || "",
        Results_Challenges: s.results || "",
        Next_Month_Plan: s.plan || "",
      }))
    );
  }

  const proposals: ProposalIn[] = body.proposals || [];
  if (proposals.length) {
    await appendObjects(
      "Data_Proposals",
      proposals.map((p, i) => ({
        Prop_ID: `P${reportId}-${i}`,
        Report_ID: reportId,
        Proposal_Name: p.name || "",
        Status_Code: p.status || "W",
        Deadline: p.deadline || "",
        Short_Note: p.note || "",
        Note: p.note || "",
      }))
    );
  }

  const issues: IssueIn[] = body.issues || [];
  if (issues.length) {
    await appendObjects(
      "Data_Issues_Priorities",
      issues.map((x, i) => ({
        Task_ID: `T${reportId}-${i}`,
        Report_ID: reportId,
        Type: x.type || "Issue",
        Site_Code: x.siteCode || "",
        Description: x.description || "",
        PIC: x.pic || "",
        Deadline: x.deadline || "",
      }))
    );
  }

  return NextResponse.json({ success: true, reportId });
}
