"use client";
import { useEffect, useState } from "react";

export type SessionUser = { id: string; name: string; role: string; email: string };

export function useSession() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined); // undefined = loading
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);
  const isManager = user ? user.role === "admin" || user.role === "manager" : false;
  return { user, loading: user === undefined, isManager };
}
