"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, CheckSquare, Users, LogOut, UserCircle, ChevronDown } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useSession } from "@/hooks/useSession";

export default function Nav() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { user, isManager, isAdmin } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const links = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/reports", label: t("nav.reports"), icon: FileText },
    ...(isManager ? [{ href: "/approve", label: t("nav.approve"), icon: CheckSquare }] : []),
    // User administration (create/deactivate/delete/role changes) is admin-only.
    ...(isAdmin ? [{ href: "/members", label: t("nav.members"), icon: Users }] : []),
  ];

  // Close the account dropdown on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <nav className="border-b border-border-subtle bg-white/85 backdrop-blur-xl sticky top-0 z-50">
      {/* Tier 1 — brand strip: logo + full center name, centered across the whole page */}
      <div className="border-b border-border-subtle bg-primary-900/[0.03]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ctnc-logo.png" alt="CTNC" className="w-9 h-9 object-contain shrink-0" />
          <span className="font-bold tracking-wide text-sm sm:text-base text-center leading-tight text-primary-800">
            CENTER FOR TECHNOLOGY AND NATURE CONSERVATION
          </span>
        </div>
      </div>

      {/* Tier 2 — app title + menu (left), language + account (right) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="font-bold text-xl text-ink tracking-tight">REPORTING DASHBOARD</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {links.map((l) => {
                const active = pathname === l.href || pathname.startsWith(l.href + "/");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active ? "bg-primary-50 text-primary-800" : "text-ink-secondary hover:text-ink hover:bg-canvas"
                    }`}
                  >
                    <l.icon className="w-4 h-4" />
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <LanguageSwitcher />
            {user && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
                >
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-border-subtle group-hover:border-primary-400" />
                  ) : (
                    <UserCircle className="w-8 h-8 text-ink-muted group-hover:text-primary-600" />
                  )}
                  <span className="text-sm text-ink-secondary hidden sm:inline">
                    {t("dash.greeting")} <b className="text-ink group-hover:text-primary-700">{user.name}</b>{" "}
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 border border-border-subtle text-ink-secondary">
                      {t("role." + user.role) !== "role." + user.role ? t("role." + user.role) : user.role}
                    </span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-ink-muted transition-transform ${menuOpen ? "rotate-180" : ""}`} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border-subtle bg-surface shadow-lg overflow-hidden z-50">
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-secondary hover:bg-canvas hover:text-ink transition-colors"
                    >
                      <UserCircle className="w-4 h-4" /> {t("nav.profile")}
                    </Link>
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-danger hover:bg-danger-soft transition-colors border-t border-border-subtle"
                    >
                      <LogOut className="w-4 h-4" /> {t("dash.logout")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
