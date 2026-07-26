import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession, isAdmin } from "@/lib/auth";
import { appendObjects, readObjects } from "@/lib/sheets";

export const runtime = "nodejs";

export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const users = await readObjects("Dim_Users");
  const list = users.map((u) => ({
    id: u.User_ID,
    name: u.Full_Name,
    email: u.Email,
    role: u.Role,
    active: (u.Is_Active ?? "true").trim().toLowerCase() !== "false",
  }));
  return NextResponse.json({ members: list });
}

export async function POST(request: Request) {
  const me = await getSession();
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json();
  const { userId, fullName, email, role, password } = body;
  if (!userId || !fullName || !password) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const users = await readObjects("Dim_Users");
  if (users.some((u) => u.User_ID.toLowerCase() === String(userId).toLowerCase())) {
    return NextResponse.json({ error: "user id exists" }, { status: 409 });
  }

  await appendObjects("Dim_Users", [
    {
      User_ID: userId,
      Full_Name: fullName,
      Email: email || "",
      Role: role || "staff",
      Is_Active: "true",
      Password_Hash: bcrypt.hashSync(password, 10),
    },
  ]);
  return NextResponse.json({ success: true });
}
