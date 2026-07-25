"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  Percent,
  Users,
  FileSpreadsheet,
  FileType2,
  FileDown,
  Flag,
  MapPin,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ComposedChart,
  Line,
  Legend,
  Cell,
} from "recharts";
import { useLanguage } from "@/context/LanguageContext";
import Nav from "@/components/Nav";

type MemberStatus = {
  userId: string;
  name: string;
  role: string;
  status: "Draft" | "Submitted" | "Approved" | "Returned" | "Missing";
  submittedAt: string;
  reportId: string | null;
  totalActs: number;
};

type DashboardData = {
  month: string;
  availableMonths: string[];
  kpi: {
    reportsThisMonth: string;
    pendingApprovals: number;
    activitiesCompleted: number;
    issuesNeedingSupport: number;
    completionRate: number;
    totalMembers: number;
  };
  members: MemberStatus[];
  siteStats: { code: string; name: string; totalActs: number }[];
  trend: { month: string; reportsSubmitted: number; totalActivities: number }[];
  proposals: { status: string; label: string; count: number }[];
  issues: { reportId: string; member: string; siteCode: string; description: string; pic: string; deadline: string }[];
  priorities: { reportId: string; member: string; siteCode: string; description: string; pic: string; deadline: string }[];
};

const STATUS_STYLE: Record<string, string> = {
  Draft: "bg-slate-500/15 text-slate-300",
  Submitted: "bg-blue-500/15 text-blue-300",
  Approved: "bg-emerald-500/15 text-emerald-300",
  Returned: "bg-amber-500/15 text-amber-300",
  Missing: "bg-red-500/15 text-red-300",
};

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6", "#eab308", "#6366f1"];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

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

  const stats = data
    ? [
        { titleKey: "dash.stat.reports", value: data.kpi.reportsThisMonth, icon: FileText, color: "text-blue-400", bg: "bg-blue-400/10" },
        { titleKey: "dash.completionRate", value: `${data.kpi.completionRate}%`, icon: Percent, color: "text-emerald-400", bg: "bg-emerald-400/10" },
        { titleKey: "dash.stat.proposals", value: String(data.kpi.pendingApprovals), icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
        { titleKey: "dash.stat.activities", value: String(data.kpi.activitiesCompleted), icon: CheckCircle, color: "text-purple-400", bg: "bg-purple-400/10" },
        { titleKey: "dash.stat.issues", value: String(data.kpi.issuesNeedingSupport), icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Nav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-end mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t("dash.title")}</h1>
            <p className="text-slate-400">{t("dash.subtitleShort")} — {data?.month || ""}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {data && (
              <select
                value={data.month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {data.availableMonths.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-xl p-1.5">
              <button
                disabled={!data || exporting !== null}
                onClick={() => exportFile("excel")}
                title={t("dash.exportExcel")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
              <button
                disabled={!data || exporting !== null}
                onClick={() => exportFile("word")}
                title={t("dash.exportWord")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-300 hover:bg-blue-500/15 disabled:opacity-50 transition-colors"
              >
                <FileType2 className="w-4 h-4" /> Word
              </button>
              <button
                disabled={!data || exporting !== null}
                onClick={() => exportFile("pdf")}
                title={t("dash.exportPdf")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-300 hover:bg-red-500/15 disabled:opacity-50 transition-colors"
              >
                <FileDown className="w-4 h-4" /> PDF
              </button>
            </div>
            <Link href="/form">
              <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
                <Plus className="w-5 h-5" />
                {t("dash.newReport")}
              </button>
            </Link>
          </div>
        </div>

        {!data ? (
          <p className="text-slate-400">{t("common.loading")}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {stats.map((stat, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col hover:bg-white/10 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.bg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <h3 className="text-slate-400 text-xs font-medium mb-1">{t(stat.titleKey)}</h3>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" /> {t("dash.membersTitle")}
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {data.members.map((m) => (
                    <div key={m.userId} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {initials(m.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{m.name}</p>
                        <p className="text-xs text-slate-500">{m.userId} · {m.totalActs} HĐ</p>
                      </div>
                      {m.reportId ? (
                        <Link href={`/reports/${m.reportId}`} className={`text-xs px-2 py-1 rounded-md font-medium flex-shrink-0 ${STATUS_STYLE[m.status]}`}>
                          {t("status." + m.status.toLowerCase())}
                        </Link>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded-md font-medium flex-shrink-0 ${STATUS_STYLE[m.status]}`}>
                          {t("status." + m.status.toLowerCase())}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
                <div>
                  <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" /> {t("dash.issuesTitle")} ({data.issues.length})
                  </h2>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {data.issues.length === 0 && <p className="text-xs text-slate-500">{t("dash.noData")}</p>}
                    {data.issues.map((i, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-xs">
                        <p className="text-slate-200">{i.description}</p>
                        <p className="text-slate-500 mt-1">{i.member}{i.pic && ` · ${i.pic}`}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                    <Flag className="w-4 h-4 text-blue-400" /> {t("dash.prioritiesTitle")} ({data.priorities.length})
                  </h2>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {data.priorities.length === 0 && <p className="text-xs text-slate-500">{t("dash.noData")}</p>}
                    {data.priorities.map((i, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs">
                        <p className="text-slate-200">{i.description}</p>
                        <p className="text-slate-500 mt-1">{i.member}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-400" /> {t("dash.chartSiteTitle")}
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.siteStats} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#26334d" horizontal={false} />
                    <XAxis type="number" stroke="#8fa3bf" fontSize={12} allowDecimals={false} />
                    <YAxis type="category" dataKey="code" stroke="#8fa3bf" fontSize={12} width={40} />
                    <Tooltip
                      contentStyle={{ background: "#151f31", border: "1px solid #26334d", borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Bar dataKey="totalActs" radius={[0, 6, 6, 0]}>
                      {data.siteStats.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" /> {t("dash.chartTrendTitle")}
                </h2>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={data.trend} margin={{ left: -10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#26334d" />
                    <XAxis dataKey="month" stroke="#8fa3bf" fontSize={11} />
                    <YAxis stroke="#8fa3bf" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#151f31", border: "1px solid #26334d", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: "#e2e8f0" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => (v === "reportsSubmitted" ? t("dash.trendReports") : t("dash.trendActivities"))} />
                    <Bar dataKey="reportsSubmitted" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={22} />
                    <Line type="monotone" dataKey="totalActivities" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-400" /> {t("dash.chartProposalsTitle")}
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.proposals} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#26334d" />
                  <XAxis dataKey="label" stroke="#8fa3bf" fontSize={11} />
                  <YAxis stroke="#8fa3bf" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#151f31", border: "1px solid #26334d", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: "#e2e8f0" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={50}>
                    {data.proposals.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
