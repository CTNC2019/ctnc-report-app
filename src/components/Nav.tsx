"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, FileText, CheckSquare, Users, LogOut } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useSession } from "@/hooks/useSession";

export default function Nav() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { user, isManager } = useSession();

  const links = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/reports", label: t("nav.reports"), icon: FileText },
    ...(isManager ? [{ href: "/approve", label: t("nav.approve"), icon: CheckSquare }] : []),
    ...(isManager ? [{ href: "/members", label: t("nav.members"), icon: Users }] : []),
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <nav className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white tracking-tight">CTNC Dashboard</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {links.map((l) => {
                const active = pathname === l.href || pathname.startsWith(l.href + "/");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active ? "bg-emerald-500/15 text-emerald-300" : "text-slate-400 hover:text-white hover:bg-white/5"
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
              <span className="text-sm text-slate-400 hidden sm:inline">
                {t("dash.greeting")} <b className="text-white">{user.name}</b>{" "}
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-400">
                  {t("role." + user.role) !== "role." + user.role ? t("role." + user.role) : user.role}
                </span>
              </span>
            )}
            <button
              onClick={logout}
              className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/30 text-slate-300 hover:text-red-400 transition-colors"
              title={t("dash.logout")}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
