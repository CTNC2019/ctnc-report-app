import crypto from "crypto";
import { cookies } from "next/headers";
import { readObjects } from "@/lib/sheets";

export const SESSION_COOKIE = "ctnc_session";

export type SessionUser = {
  id: string; // User_ID, e.g. CTNC-01
  name: string;
  role: string; // admin | manager | staff
  email: string;
  avatarUrl?: string;
  remember?: boolean; // whether the 30-day "remember me" cookie duration should be reapplied on reissue
};

function secret(): string {
  // Falls back to a fixed dev secret so local `npm run dev` works without setup.
  // Set SESSION_SECRET in Vercel env vars for production.
  return process.env.SESSION_SECRET || "ctnc-dev-secret-change-me";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionCookieValue(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifySessionCookieValue(value: string | undefined): SessionUser | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  if (sign(payload) !== sig) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/** Read + verify the session from the incoming request cookies (Route Handlers / Server Components). */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return verifySessionCookieValue(store.get(SESSION_COOKIE)?.value);
}

export function isManager(u: SessionUser | null): boolean {
  return !!u && (u.role === "admin" || u.role === "manager");
}

/** Full user administration (create/deactivate/delete/role changes) is admin-only. */
export function isAdmin(u: SessionUser | null): boolean {
  return !!u && u.role === "admin";
}

/**
 * The session cookie bakes the user's role in at login time and is never re-verified
 * against the sheet on subsequent requests. That means if an Admin changes someone's
 * role (e.g. demotes a manager to staff), the demoted user keeps their old, more
 * permissive role in their *current* session until they log out and back in.
 *
 * For actions that cross ownership boundaries (editing/deleting someone else's data,
 * managing other members' accounts) that staleness window is a real permission gap.
 * getLiveSession() re-reads the user's role straight from Dim_Users so these checks
 * always reflect the current, authoritative permission — no re-login required.
 * It also returns null for a user who has since been deactivated or removed.
 */
export async function getLiveSession(me: SessionUser | null): Promise<SessionUser | null> {
  if (!me) return null;
  const users = await readObjects("Dim_Users");
  const row = users.find((u) => u.User_ID === me.id);
  if (!row) return null;
  const active = (row.Is_Active ?? "true").trim().toLowerCase() !== "false";
  if (!active) return null;
  return { ...me, role: row.Role || me.role };
}
