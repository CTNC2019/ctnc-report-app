import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFullDashboardData } from "@/lib/reportData";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || undefined;
  const lang = searchParams.get("lang") === "en" ? "en" : "vi";

  const data = await getFullDashboardData(month, lang);
  return NextResponse.json(data);
}
