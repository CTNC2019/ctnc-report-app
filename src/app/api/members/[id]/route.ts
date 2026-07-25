import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession, isManager } from "@/lib/auth";
import { updateObjectByKey } from "@/lib/sheets";

export const runtime = "nodejs";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  const { id } = await ctx.params;
  const isSelf = me?.id === id;
  if (!me || (!isManager(me) && !isSelf)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const patch: Record<string, string> = {};
  if (body.fullName) patch.Full_Name = body.fullName;
  if (body.email !== undefined) patch.Email = body.email;
  if (isManager(me)) {
    if (body.role) patch.Role = body.role;
    if (body.active !== undefined) patch.Is_Active = body.active ? "true" : "false";
  }
  if (body.password) patch.Password_Hash = bcrypt.hashSync(body.password, 10);

  const ok = await updateObjectByKey("Dim_Users", "User_ID", id, patch);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
