"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckSquare, CheckCircle, Undo2 } from "lucide-react";
import Nav from "@/components/Nav";
import { useLanguage } from "@/context/LanguageContext";

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
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <CheckSquare className="w-7 h-7 text-emerald-400" /> {t("approve.title")}
          </h1>
          <p className="text-slate-400">{t("approve.subtitle")}</p>
        </div>

        {rows === null && <p className="text-slate-400">{t("common.loading")}</p>}
        {rows?.length === 0 && <p className="text-slate-500 bg-white/5 border border-white/10 rounded-2xl p-6">{t("approve.empty")}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows?.map((r) => (
            <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex justify-between items-start mb-2">
                <Link href={`/reports/${r.id}`} className="font-mono text-emerald-300 hover:underline">{r.id}</Link>
                <span className="text-xs px-2 py-1 rounded-md bg-blue-500/15 text-blue-300 font-medium">{t("status.submitted")}</span>
              </div>
              <p className="text-sm text-slate-300">{r.member} · {r.month}</p>
              <p className="text-xs text-slate-500 mt-1">{r.totalActivities} {t("form.numActs").toLowerCase()}</p>
              <div className="flex gap-2 mt-4">
                <button
                  disabled={busyId === r.id}
                  onClick={() => setStatus(r.id, "Returned")}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-medium disabled:opacity-50"
                >
                  <Undo2 className="w-4 h-4" /> {t("approve.return")}
                </button>
                <button
                  disabled={busyId === r.id}
                  onClick={() => setStatus(r.id, "Approved")}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-bold disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" /> {t("approve.approve")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
