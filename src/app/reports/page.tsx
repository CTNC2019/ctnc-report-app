"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FileText, Trash2 } from "lucide-react";
import Nav from "@/components/Nav";
import { useLanguage } from "@/context/LanguageContext";
import { useSession } from "@/hooks/useSession";

type ReportRow = {
  id: string;
  userId: string;
  member: string;
  month: string;
  status: string;
  totalActivities: number;
};

const STATUS_STYLE: Record<string, string> = {
  Draft: "bg-slate-500/15 text-slate-300",
  Submitted: "bg-blue-500/15 text-blue-300",
  Approved: "bg-emerald-500/15 text-emerald-300",
  Returned: "bg-amber-500/15 text-amber-300",
};

export default function ReportsList() {
  const { t } = useLanguage();
  const { user, isAdmin, isManager } = useSession();
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => setRows(d.reports || []));
  }
  useEffect(load, []);

  // Edit: the owner can always edit their own report (any status) — editing an
  // Approved/Submitted report naturally moves it back into the review pipeline once
  // saved, since the form re-submits with a fresh Draft/Submitted status. Admins can
  // also fix anyone's report.
  // Owner can always edit their own report; Manager/Admin can edit and approve anyone's.
  // Staff without ownership only gets view access (no Edit control rendered for them).
  function canEdit(r: ReportRow): boolean {
    return r.userId === user?.id || isManager;
  }

  // Delete: the owner may only delete their own Draft (nothing has been submitted for
  // review yet). Once Submitted/Approved/Returned, only an Admin can remove it, to keep
  // an audit trail for anything a Manager has already seen.
  function canDelete(r: ReportRow): boolean {
    return isAdmin || (r.userId === user?.id && r.status === "Draft");
  }

  async function deleteReport(id: string) {
    if (!confirm(t("reports.deleteConfirm"))) return;
    setDeletingId(id);
    const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) load();
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error === "forbidden" ? t("reports.deleteForbidden") : data.error || "Error");
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-end mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <FileText className="w-7 h-7 text-emerald-400" /> {t("reports.title")}
            </h1>
            <p className="text-slate-400">{t("reports.subtitle")}</p>
          </div>
          <Link href="/form">
            <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
              <Plus className="w-5 h-5" /> {t("dash.newReport")}
            </button>
          </Link>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 text-xs uppercase tracking-wide border-b border-white/10">
                <th className="px-5 py-3">{t("reports.col.id")}</th>
                <th className="px-5 py-3">{t("reports.col.member")}</th>
                <th className="px-5 py-3">{t("reports.col.month")}</th>
                <th className="px-5 py-3">{t("reports.col.acts")}</th>
                <th className="px-5 py-3">{t("reports.col.status")}</th>
                <th className="px-5 py-3">{t("reports.col.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows === null && (
                <tr><td colSpan={6} className="px-5 py-6 text-slate-500">{t("common.loading")}</td></tr>
              )}
              {rows?.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-6 text-slate-500">{t("reports.empty")}</td></tr>
              )}
              {rows?.map((r) => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3 font-mono text-emerald-300">{r.id}</td>
                  <td className="px-5 py-3">{r.member}</td>
                  <td className="px-5 py-3">{r.month}</td>
                  <td className="px-5 py-3">{r.totalActivities}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${STATUS_STYLE[r.status] || STATUS_STYLE.Draft}`}>
                      {t("status." + r.status.toLowerCase())}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <Link href={`/reports/${r.id}`} className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700">
                        {t("reports.view")}
                      </Link>
                      {canEdit(r) && (
                        <Link href={`/form?id=${r.id}`} className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300">
                          {t("reports.edit")}
                        </Link>
                      )}
                      {canDelete(r) && (
                        <button
                          onClick={() => deleteReport(r.id)}
                          disabled={deletingId === r.id}
                          title={t("reports.delete")}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
