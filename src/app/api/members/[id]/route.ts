import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession, getLiveSession, isAdmin } from "@/lib/auth";
import { deleteRowsByKey, updateObjectByKey } from "@/lib/sheets";

export const runtime = "nodejs";

// This route is the Admin-only member administration panel: create/edit role,
// active status, email, and password-reset for OTHER users. Self-service profile
// edits (own name, avatar, password) go through /api/profile instead.
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const me = await getLiveSession(session);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const body = await request.json();
  const patch: Record<string, string> = {};
  if (body.fullName) patch.Full_Name = body.fullName;
  if (body.email !== undefined) patch.Email = body.email;
  if (body.role) patch.Role = body.role;
  if (body.active !== undefined) patch.Is_Active = body.active ? "true" : "false";
  if (body.password) patch.Password_Hash = bcrypt.hashSync(body.password, 10);

  const ok = await updateObjectByKey("Dim_Users", "User_ID", id, patch);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const me = await getLiveSession(session);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  if (me.id === id) {
    return NextResponse.json({ error: "cannot delete yourself" }, { status: 400 });
  }

  await deleteRowsByKey("Dim_Users", "User_ID", id);
  return NextResponse.json({ success: true });
}
