import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getSession, createSessionCookieValue, SESSION_COOKIE } from "@/lib/auth";
import { readObjects, updateObjectByKey } from "@/lib/sheets";

export const runtime = "nodejs";

// Self-service profile: any authenticated user can view/update their OWN name,
// avatar, and password here. Role, active status, and email (the login
// credential) are intentionally out of scope — those are Admin-only via
// /api/members/[id].
export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const users = await readObjects("Dim_Users");
  const u = users.find((x) => x.User_ID === me.id);
  if (!u) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    profile: {
      id: u.User_ID,
      name: u.Full_Name || u.User_ID,
      email: u.Email || "",
      role: (u.Role || "staff").toLowerCase(),
      avatarUrl: u.Avatar_URL || "",
    },
  });
}

export async function PATCH(request: Request) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const patch: Record<string, string> = {};

  if (typeof body.fullName === "string" && body.fullName.trim()) {
    patch.Full_Name = body.fullName.trim();
  }
  if (typeof body.avatarUrl === "string") {
    patch.Avatar_URL = body.avatarUrl;
  }

  if (body.newPassword) {
    if (String(body.newPassword).length < 6) {
      return NextResponse.json({ error: "password too short" }, { status: 400 });
    }
    const users = await readObjects("Dim_Users");
    const u = users.find((x) => x.User_ID === me.id);
    const currentOk = u?.Password_Hash && bcrypt.compareSync(String(body.currentPassword || ""), u.Password_Hash);
    if (!currentOk) {
      return NextResponse.json({ error: "current password incorrect" }, { status: 400 });
    }
    patch.Password_Hash = bcrypt.hashSync(String(body.newPassword), 10);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const ok = await updateObjectByKey("Dim_Users", "User_ID", me.id, patch);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Reissue the session cookie so the updated name/avatar show up immediately
  // in the nav, without requiring the user to log out and back in. Role/email
  // and the original remember-me duration preference are preserved as-is.
  const updated = {
    ...me,
    name: patch.Full_Name || me.name,
    avatarUrl: patch.Avatar_URL !== undefined ? patch.Avatar_URL : me.avatarUrl,
  };
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionCookieValue(updated), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: me.remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12,
  });

  return NextResponse.json({ success: true, profile: updated });
}
