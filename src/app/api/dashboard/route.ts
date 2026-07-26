import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFullDashboardData } from "@/lib/reportData";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const lang = searchParams.get("lang") === "en" ? "en" : "vi";

  const data = await getFullDashboardData(startDate, endDate, lang);
  return NextResponse.json(data);
}
