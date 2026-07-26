"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckSquare, CheckCircle, Undo2 } from "lucide-react";
import Nav from "@/components/Nav";
import { useLanguage } from "@/context/LanguageContext";
import { Card, Button, Badge, PageHeader, EmptyState, Skeleton } from "@/components/ui";

type ReportRow = { id: string; member: string; month: string; status: string; totalActivities: number };

export default function ApprovePage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => setRows((d.reports || []).filter((r: ReportRow) => r.status === "Submitted")));
  }
  useEffect(load, []);

  async function setStatus(id: string, status: "Approved" | "Returned") {
    if (status === "Returned" && !confirm(t("approve.confirmReturn"))) return;
    setBusyId(id);
    await fetch(`/api/reports/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    load();
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader icon={CheckSquare} title={t("approve.title")} subtitle={t("approve.subtitle")} />

        {rows === null && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        )}
        {rows?.length === 0 && (
          <Card>
            <EmptyState icon={CheckSquare} message={t("approve.empty")} />
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows?.map((r) => (
            <Card key={r.id} interactive>
              <div className="flex justify-between items-start mb-2">
                <Link href={`/reports/${r.id}`} className="font-mono text-primary-700 hover:underline">{r.id}</Link>
                <Badge tone="info">{t("status.submitted")}</Badge>
              </div>
              <p className="text-sm text-ink">{r.member} · {r.month}</p>
              <p className="text-xs text-ink-muted mt-1">{r.totalActivities} {t("form.numActs").toLowerCase()}</p>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="secondary"
                  disabled={busyId === r.id}
                  onClick={() => setStatus(r.id, "Returned")}
                  className="flex-1 text-amber-700 border-amber-200 bg-warning-soft hover:bg-amber-100"
                >
                  <Undo2 className="w-4 h-4" /> {t("approve.return")}
                </Button>
                <Button disabled={busyId === r.id} onClick={() => setStatus(r.id, "Approved")} className="flex-1">
                  <CheckCircle className="w-4 h-4" /> {t("approve.approve")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
