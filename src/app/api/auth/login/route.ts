import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { readObjects } from "@/lib/sheets";
import { createSessionCookieValue, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { userId, password } = await request.json();
    if (!userId || !password) {
      return NextResponse.json({ success: false, error: "missing" }, { status: 400 });
    }
    const users = await readObjects("Dim_Users");
    const u = users.find(
      (x) => (x.User_ID || "").trim().toLowerCase() === String(userId).trim().toLowerCase()
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
    };
    const store = await cookies();
    store.set(SESSION_COOKIE, createSessionCookieValue(sessionUser), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return NextResponse.json({ success: true, user: sessionUser });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
