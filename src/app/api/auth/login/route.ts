import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { readObjects } from "@/lib/sheets";
import { createSessionCookieValue, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { userId, password, remember } = await request.json();
    if (!userId || !password) {
      return NextResponse.json({ success: false, error: "missing" }, { status: 400 });
    }
    const users = await readObjects("Dim_Users");
    // Login accepts either the work email (primary, current convention) or the legacy
    // internal User_ID (e.g. CTNC-01) so older bookmarks/muscle memory keep working.
    const identifier = String(userId).trim().toLowerCase();
    const u = users.find(
      (x) =>
        (x.Email || "").trim().toLowerCase() === identifier ||
        (x.User_ID || "").trim().toLowerCase() === identifier
    );
    const inactive = ["false", "0", "no"].includes((u?.Is_Active ?? "").trim().toLowerCase());
    if (!u || !u.Password_Hash || inactive) {
      return NextResponse.json({ success: false, error: "invalid" }, { status: 401 });
    }
    const ok = bcrypt.compareSync(password, u.Password_Hash);
    if (!ok) {
      return NextResponse.json({ success: false, error: "invalid" }, { status: 401 });
    }
    const sessionUser = {
      id: u.User_ID,
      name: u.Full_Name || u.User_ID,
      role: (u.Role || "staff").toLowerCase(),
      email: u.Email || "",
      avatarUrl: u.Avatar_URL || "",
      remember: !!remember,
    };
    const store = await cookies();
    const cookieOpts: Parameters<typeof store.set>[2] = {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    };
    // "Remember me": persist the session for 30 days. Otherwise use a browser-session
    // cookie (no maxAge) that goes away when the browser is closed, plus a short
    // fallback so an accidental tab-only close doesn't force an immediate re-login.
    if (remember) {
      cookieOpts.maxAge = 60 * 60 * 24 * 30;
    } else {
      cookieOpts.maxAge = 60 * 60 * 12;
    }
    store.set(SESSION_COOKIE, createSessionCookieValue(sessionUser), cookieOpts);
    return NextResponse.json({ success: true, user: sessionUser });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
