"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, FileSpreadsheet, FileType2, FileDown } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import Nav from "@/components/Nav";
import { Button, PageHeader, Skeleton } from "@/components/ui";
import {
  KpiGrid,
  SiteActivityChart,
  ActivityTypeChart,
  ProposalPipelineChart,
  CommsChannelChart,
  ProposalsByDonorChart,
  MemberStatusGrid,
  IssuesTable,
  DeadlinesTable,
  PrioritiesList,
  type DashboardData,
} from "@/components/dashboard";

// Data fetching, export triggering, and the API contract below are unchanged from
// before this visual refactor — only the JSX composition moved into components/dashboard.
export default function Dashboard() {
  const { t } = useLanguage();
  const [data, setData] = useState<DashboardData | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    const url = month ? `/api/dashboard?month=${encodeURIComponent(month)}` : "/api/dashboard";
    fetch(url)
      .then((r) => r.json())
      .then((d: DashboardData) => {
        setData(d);
        if (!month) setMonth(d.month);
      })
      .catch(() => {});
  }, [month]);

  function exportFile(format: "excel" | "word" | "pdf") {
    if (!data) return;
    setExporting(format);
    const url = `/api/export/${format}?month=${encodeURIComponent(data.month)}`;
    const a = document.createElement("a");
    a.href = url;
    a.click();
    setTimeout(() => setExporting(null), 1500);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Nav />

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title={t("dash.title")}
            subtitle={`${t("dash.subtitleShort")} — ${data?.month || ""}`}
            actions={
              data && (
                <>
                  <select
                    value={data.month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="bg-surface border border-border-subtle text-ink text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                  >
                    {data.availableMonths.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <div className="flex items-center gap-1.5 bg-surface border border-border-subtle rounded-xl p-1.5 shadow-sm">
                    <button disabled={exporting !== null} onClick={() => exportFile("excel")} title={t("dash.exportExcel")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50 transition-colors">
                      <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button disabled={exporting !== null} onClick={() => exportFile("word")} title={t("dash.exportWord")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-accent-blue hover:bg-info-soft disabled:opacity-50 transition-colors">
                      <FileType2 className="w-4 h-4" /> Word
                    </button>
                    <button disabled={exporting !== null} onClick={() => exportFile("pdf")} title={t("dash.exportPdf")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-danger hover:bg-danger-soft disabled:opacity-50 transition-colors">
                      <FileDown className="w-4 h-4" /> PDF
                    </button>
                  </div>
                  <Link href="/form">
                    <Button>
                      <Plus className="w-5 h-5" />
                      {t("dash.newReport")}
                    </Button>
                  </Link>
                </>
              )
            }
          />

          {!data ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-72" />
                <Skeleton className="h-72" />
              </div>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <KpiGrid kpi={data.kpi} t={t} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <SiteActivityChart data={data.siteStats} t={t} />
                <ActivityTypeChart data={data.typeStats} t={t} />
                <ProposalPipelineChart data={data.proposals} t={t} />
                <CommsChannelChart commsChannels={data.commsChannels} commsTrend={data.commsTrend} t={t} />
                <ProposalsByDonorChart data={data.proposalsByDonor} t={t} />
              </div>

              <MemberStatusGrid members={data.members} t={t} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <IssuesTable issues={data.issues} t={t} />
                <DeadlinesTable deadlines={data.deadlines} t={t} />
              </div>

              <PrioritiesList priorities={data.priorities} t={t} />
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
