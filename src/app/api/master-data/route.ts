import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMasterData } from "@/lib/sheets";

export const runtime = "nodejs";

// Sheet-driven dropdown labels for client pages (report form, report detail view).
// Reads the "Master_Data" Google Sheet tab (cached ~60s server-side) so an Admin can
// rename/reorder/add options directly in the Sheet without a code deploy. Falls back
// to built-in defaults if the tab isn't set up yet — see getMasterData() in sheets.ts.
export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const masterData = await getMasterData();
  return NextResponse.json(masterData);
}
