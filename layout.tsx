import { NextResponse } from "next/server";
import { getSession, isManager } from "@/lib/auth";
import { readObjects } from "@/lib/sheets";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const [reports, users, siteUpdates, proposals, issues] = await Promise.all([
    readObjects("Fact_Reports"),
    readObjects("Dim_Users"),
    readObjects("Data_Site_Updates"),
    readObjects("Data_Proposals"),
    readObjects("Data_Issues_Priorities"),
  ]);

  const report = reports.find((r) => r.Report_ID === id);
  if (!report) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (report.User_ID !== me.id && !isManager(me)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const member = users.find((u) => u.User_ID === report.User_ID);

  return NextResponse.json({
    report: {
      id: report.Report_ID,
      userId: report.User_ID,
      member: member?.Full_Name || report.User_ID,
      month: report.Reporting_Month,
      status: report.Status || "Draft",
      submittedAt: report.Submitted_At,
      siteUpdates: siteUpdates
        .filter((s) => s.Report_ID === id)
        .map((s) => ({
          siteCode: s.Site_Code,
          numActs: s.Num_Acts,
          desc: s.Activities_Notes,
          results: s.Results_Challenges,
          plan: s.Next_Month_Plan,
        })),
      proposals: proposals
        .filter((p) => p.Report_ID === id)
        .map((p) => ({ name: p.Proposal_Name, status: p.Status_Code, deadline: p.Deadline, note: p.Note || p.Short_Note })),
      issues: issues
        .filter((x) => x.Report_ID === id)
        .map((x) => ({ type: x.Type, siteCode: x.Site_Code, description: x.Description, pic: x.PIC, deadline: x.Deadline })),
    },
  });
}
