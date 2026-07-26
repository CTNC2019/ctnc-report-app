"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FileText, Trash2 } from "lucide-react";
import Nav from "@/components/Nav";
import { useLanguage } from "@/context/LanguageContext";
import { useSession } from "@/hooks/useSession";
import { Button, Badge, Card, PageHeader, EmptyState, Skeleton } from "@/components/ui";
import { formatDisplayDate } from "@/lib/dateRange";

type ReportRow = {
  id: string;
  userId: string;
  member: string;
  startDate: string;
  endDate: string;
  status: string;
  totalActivities: number;
};

const STATUS_TONE: Record<string, "neutral" | "info" | "success" | "warning"> = {
  Draft: "neutral",
  Submitted: "info",
  Approved: "success",
  Returned: "warning",
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
    <div className="min-h-screen bg-canvas">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          icon={FileText}
          title={t("reports.title")}
          subtitle={t("reports.subtitle")}
          actions={
            <Link href="/form">
              <Button>
                <Plus className="w-5 h-5" /> {t("dash.newReport")}
              </Button>
            </Link>
          }
        />

        <Card padded={false} className="overflow-hidden">
          {rows === null ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState icon={FileText} message={t("reports.empty")} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-secondary text-xs uppercase tracking-wide border-b border-border-subtle">
                  <th className="px-5 py-3 font-medium">{t("reports.col.id")}</th>
                  <th className="px-5 py-3 font-medium">{t("reports.col.member")}</th>
                  <th className="px-5 py-3 font-medium">{t("reports.col.month")}</th>
                  <th className="px-5 py-3 font-medium">{t("reports.col.acts")}</th>
                  <th className="px-5 py-3 font-medium">{t("reports.col.status")}</th>
                  <th className="px-5 py-3 font-medium">{t("reports.col.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border-subtle last:border-0 hover:bg-canvas transition-colors">
                    <td className="px-5 py-3 font-mono text-primary-700">{r.id}</td>
                    <td className="px-5 py-3 text-ink">{r.member}</td>
                    <td className="px-5 py-3 text-ink-secondary">{formatDisplayDate(r.startDate)} – {formatDisplayDate(r.endDate)}</td>
                    <td className="px-5 py-3 text-ink-secondary">{r.totalActivities}</td>
                    <td className="px-5 py-3">
                      <Badge tone={STATUS_TONE[r.status] || "neutral"}>{t("status." + r.status.toLowerCase())}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <Link href={`/reports/${r.id}`}>
                          <Button variant="secondary" size="sm">{t("reports.view")}</Button>
                        </Link>
                        {canEdit(r) && (
                          <Link href={`/form?id=${r.id}`}>
                            <Button variant="secondary" size="sm" className="text-accent-blue border-blue-200 bg-info-soft hover:bg-blue-100">
                              {t("reports.edit")}
                            </Button>
                          </Link>
                        )}
                        {canDelete(r) && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => deleteReport(r.id)}
                            disabled={deletingId === r.id}
                            title={t("reports.delete")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </main>
    </div>
  );
}
