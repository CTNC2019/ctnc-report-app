import { NextResponse } from "next/server";
import { getSession, isManager } from "@/lib/auth";
import { appendObjects, readObjects } from "@/lib/sheets";

export const runtime = "nodejs";

type CommentRow = {
  Comment_ID: string;
  Report_ID: string;
  Parent_ID: string;
  Author_ID: string;
  Text: string;
  Visibility: string; // "all" | "selected"
  Visible_To: string; // comma-separated User_IDs, only meaningful when Visibility === "selected"
  Created_At: string;
};

function canSee(c: CommentRow, meId: string, meIsManager: boolean): boolean {
  if (meIsManager) return true;
  if (c.Author_ID === meId) return true;
  if ((c.Visibility || "all") !== "selected") return true;
  const list = (c.Visible_To || "").split(",").map((s) => s.trim()).filter(Boolean);
  return list.includes(meId);
}

async function loadReportOrError(id: string, meId: string, meIsManager: boolean) {
  const reports = await readObjects("Fact_Reports");
  const report = reports.find((r) => r.Report_ID === id);
  if (!report) return { error: NextResponse.json({ error: "not found" }, { status: 404 }) } as const;
  if (report.User_ID !== meId && !meIsManager) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) } as const;
  }
  return { report } as const;
}

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const meIsManager = isManager(me);
  const gate = await loadReportOrError(id, me.id, meIsManager);
  if ("error" in gate) return gate.error;

  const [all, users] = await Promise.all([
    readObjects("Data_Comments") as unknown as Promise<CommentRow[]>,
    readObjects("Dim_Users"),
  ]);
  const nameOf = (uid: string) => users.find((u) => u.User_ID === uid)?.Full_Name || uid;

  const comments = all
    .filter((c) => c.Report_ID === id)
    .filter((c) => canSee(c, me.id, meIsManager))
    .map((c) => ({
      id: c.Comment_ID,
      parentId: c.Parent_ID || null,
      authorId: c.Author_ID,
      authorName: nameOf(c.Author_ID),
      text: c.Text,
      visibility: c.Visibility || "all",
      visibleTo: (c.Visible_To || "").split(",").map((s) => s.trim()).filter(Boolean),
      createdAt: c.Created_At,
    }))
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

  return NextResponse.json({ comments });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const meIsManager = isManager(me);
  const gate = await loadReportOrError(id, me.id, meIsManager);
  if ("error" in gate) return gate.error;

  const body = await request.json();
  const text: string = (body.text || "").trim();
  const parentId: string | null = body.parentId || null;
  if (!text) return NextResponse.json({ error: "missing text" }, { status: 400 });

  const all = (await readObjects("Data_Comments")) as unknown as CommentRow[];

  let visibility = "all";
  let visibleTo = "";

  if (parentId) {
    // Reply: inherit the parent comment's visibility scope; anyone who can see the
    // parent (including the report owner and any staff granted access) may reply.
    const parent = all.find((c) => c.Comment_ID === parentId && c.Report_ID === id);
    if (!parent) return NextResponse.json({ error: "parent comment not found" }, { status: 404 });
    if (!canSee(parent, me.id, meIsManager)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    visibility = parent.Visibility || "all";
    visibleTo = parent.Visible_To || "";
  } else {
    // New root/top-level comment: manager-only, with an explicit visibility choice.
    if (!meIsManager) {
      return NextResponse.json({ error: "only managers can start a new comment thread" }, { status: 403 });
    }
    visibility = body.visibility === "selected" ? "selected" : "all";
    if (visibility === "selected") {
      const ids: string[] = Array.isArray(body.visibleTo) ? body.visibleTo.filter(Boolean) : [];
      if (!ids.length) {
        return NextResponse.json({ error: "select at least one member for restricted visibility" }, { status: 400 });
      }
      visibleTo = ids.join(",");
    }
  }

  const now = new Date().toISOString();
  const commentId = `CM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  await appendObjects("Data_Comments", [
    {
      Comment_ID: commentId,
      Report_ID: id,
      Parent_ID: parentId || "",
      Author_ID: me.id,
      Text: text,
      Visibility: visibility,
      Visible_To: visibleTo,
      Created_At: now,
    },
  ]);

  return NextResponse.json({
    success: true,
    comment: {
      id: commentId,
      parentId: parentId || null,
      authorId: me.id,
      authorName: me.name,
      text,
      visibility,
      visibleTo: visibleTo ? visibleTo.split(",") : [],
      createdAt: now,
    },
  });
}
