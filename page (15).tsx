import { NextResponse } from "next/server";
import { getSession, isManager } from "@/lib/auth";
import { readObjects, updateObjectByKey } from "@/lib/sheets";

export const runtime = "nodejs";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me || !isManager(me)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const { status } = await request.json();
  if (!["Approved", "Returned"].includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const reports = await readObjects("Fact_Reports");
  const report = reports.find((r) => r.Report_ID === id);
  if (!report) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ok = await updateObjectByKey("Fact_Reports", "Report_ID", id, { Status: status });
  if (!ok) return NextResponse.json({ error: "update failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}
