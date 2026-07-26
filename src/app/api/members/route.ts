import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession, getLiveSession, isAdmin } from "@/lib/auth";
import { appendObjects, readObjects } from "@/lib/sheets";

export const runtime = "nodejs";

// This single endpoint serves two very different audiences, so the response shape is
// role-aware:
//  - Admin (the Members administration page) needs the full record — name, email, role,
//    active status — including inactive accounts, to manage the team.
//  - Any other signed-in member (e.g. the "Writer" dropdown on a Proposal) only needs a
//    safe {id, name} pair, restricted to active members, and must NOT see colleagues'
//    email/role/active status.
// A previous version of this route only implemented the second case, which silently
// broke the admin-only Members page (blank Role/Email/Active columns) — this restores
// the full admin view without regressing the lightweight dropdown use case.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await getLiveSession(session);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const users = await readObjects("Dim_Users");

  if (isAdmin(me)) {
    const members = users.map((u) => ({
      id: u.User_ID,
      name: u.Full_Name || u.User_ID,
      email: u.Email || "",
      role: (u.Role || "staff").toLowerCase(),
      active: (u.Is_Active ?? "true").trim().toLowerCase() !== "false",
    }));
    return NextResponse.json({ members });
  }

  const members = users
    .filter((u) => (u.Is_Active ?? "true").trim().toLowerCase() !== "false")
    .map((u) => ({ id: u.User_ID, name: u.Full_Name || u.User_ID }));
  return NextResponse.json({ members });
}

// Add member — admin-only. Mirrors the field set the login route reads from Dim_Users.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await getLiveSession(session);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json();
  const userId = String(body.userId || "").trim();
  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim();
  const role = String(body.role || "staff").trim().toLowerCase();
  const password = String(body.password || "");

  if (!userId || !fullName || !password) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const users = await readObjects("Dim_Users");
  if (users.some((u) => (u.User_ID || "").trim().toLowerCase() === userId.toLowerCase())) {
    return NextResponse.json({ error: "user id already exists" }, { status: 409 });
  }
  if (email && users.some((u) => (u.Email || "").trim().toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ error: "email already exists" }, { status: 409 });
  }

  await appendObjects("Dim_Users", [
    {
      User_ID: userId,
      Full_Name: fullName,
      Email: email,
      Role: role,
      Password_Hash: bcrypt.hashSync(password, 10),
      Is_Active: "true",
      Avatar_URL: "",
    },
  ]);

  return NextResponse.json({ success: true });
}
