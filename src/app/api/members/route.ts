import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readObjects } from "@/lib/sheets";

export const runtime = "nodejs";

// Lightweight, session-protected member list used to populate dropdowns (e.g. Proposal
// "Writer") — deliberately separate from getMasterData() since it reads a different
// sheet (Dim_Users) for a different purpose (real people, not label taxonomies).
export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const users = await readObjects("Dim_Users");
  const members = users
    .filter((u) => (u.Is_Active ?? "true").trim().toLowerCase() !== "false")
    .map((u) => ({ id: u.User_ID, name: u.Full_Name || u.User_ID }));

  return NextResponse.json({ members });
}
