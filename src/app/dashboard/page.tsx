"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
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
  Megaphone,
  ClipboardList,
  CalendarClock,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
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
    activeProposals: number;
    commsOutputs: number;
    issuesNeedingSupport: number;
    prioritiesSetThisMonth: number;
    completionRate: number;
    totalMembers: number;
  };
  members: MemberStatus[];
  siteStats: { code: string; name: string; totalActs: number }[];
  typeStats: { code: string; label: string; count: number }[];
  trend: { month: string; reportsSubmitted: number; totalActivities: number }[];
  proposals: { status: string; label: string; count: number }[];
  commsChannels: { code: string; label: string; count: number }[];
  commsTrend: { month: string; channels: Record<string, number> }[];
  issues: { reportId: string; member: string; siteCode: string; description: string; actionNeeded: string; pic: string }[];
  priorities: { reportId: string; member: string; priorityNo: string; siteCode: string; activity: string; pic: string; deadline: string }[];
  deadlines: { reportId: string; member: string; date: string; event: string; siteDonor: string; pic: string }[];
};

const STATUS_STYLE: Record<string, string> = {
  Draft: "bg-slate-200 text-slate-600",
  Submitted: "bg-blue-100 text-blue-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Returned: "bg-amber-100 text-amber-700",
  Missing: "bg-red-100 text-red-700",
};

const GREEN = "#1B5E20";
const GREENS = ["#1B5E20", "#2E7D32", "#388E3C", "#43A047", "#66BB6A", "#81C784", "#A5D6A7"];
const TYPE_COLORS = ["#1B5E20", "#388E3C", "#66BB6A", "#F9A825", "#0D47A1", "#5C6BC0", "#9E9E9E"];
const COMM_COLORS = ["#0D47A1", "#1B5E20", "#66BB6A", "#F9A825", "#9E9E9E"];

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(-2).map((p) => p[0]).join("").toUpperCase();
}

function daysUntil(dateStr: string): number | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || "");
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(dateStr || "");
  let d: Date | null = null;
  if (iso) d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  else if (dmy) d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  if (!d || isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function KpiCard({ label, value, color, icon: Icon }: { label: string; value: string | number; color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between mb-1">
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="text-3xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-slate-500 mt-1 leading-snug">{label}</div>
    </div>
  );
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

  const commTrendData = data
    ? data.commsTrend.map((pt) => {
        const row: Record<string, string | number> = { month: pt.month };
        data.commsChannels.forEach((c) => (row[c.code] = pt.channels[c.code] || 0));
        return row;
      })
    : [];

  return (
    <div className="min-h-screen bg-slate-900">
      <Nav />

      <main className="min-h-[calc(100vh-64px)] bg-slate-100 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 mb-1">{t("dash.title")}</h1>
              <p className="text-slate-500 text-sm">{t("dash.subtitleShort")} — {data?.month || ""}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {data && (
                <select
                  value={data.month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-700 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-sm"
                >
                  {data.availableMonths.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              )}
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl p-1.5 shadow-sm">
                <button disabled={!data || exporting !== null} onClick={() => exportFile("excel")} title={t("dash.exportExcel")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors">
                  <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
                <button disabled={!data || exporting !== null} onClick={() => exportFile("word")} title={t("dash.exportWord")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 transition-colors">
                  <FileType2 className="w-4 h-4" /> Word
                </button>
                <button disabled={!data || exporting !== null} onClick={() => exportFile("pdf")} title={t("dash.exportPdf")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors">
                  <FileDown className="w-4 h-4" /> PDF
                </button>
              </div>
              <Link href="/form">
                <button className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg transition-all hover:scale-105 active:scale-95" style={{ background: GREEN }}>
                  <Plus className="w-5 h-5" />
                  {t("dash.newReport")}
                </button>
              </Link>
            </div>
          </div>

          {!data ? (
            <p className="text-slate-500">{t("common.loading")}</p>
          ) : (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <KpiCard label={t("dash.stat.reports")} value={data.kpi.reportsThisMonth} color={GREEN} icon={FileText} />
                <KpiCard label={`${t("dash.completionRate")} (%)`} value={`${data.kpi.completionRate}%`} color="#0D47A1" icon={Percent} />
                <KpiCard label={t("dash.stat.activities")} value={data.kpi.activitiesCompleted} color="#2E7D32" icon={ClipboardList} />
                <KpiCard label={t("dash.stat.proposals")} value={data.kpi.activeProposals} color="#F9A825" icon={Clock} />
                <KpiCard label={t("dash.stat.comms")} value={data.kpi.commsOutputs} color="#5C6BC0" icon={Megaphone} />
                <KpiCard label={t("dash.stat.issues")} value={data.kpi.issuesNeedingSupport} color="#C62828" icon={AlertTriangle} />
              </div>

              {/* Members grid */}
              <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
                <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" style={{ color: GREEN }} /> {t("dash.membersTitle")}
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.members.map((m) => (
                    <div key={m.userId} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "#E8F5E9", color: GREEN }}>
                        {initials(m.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{m.name}</p>
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

              {/* 4 charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b-2" style={{ borderColor: "#E8F5E9" }}>
                    <MapPin className="w-4 h-4 inline mr-1.5" style={{ color: GREEN }} />{t("dash.chartSiteTitle")}
                  </h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.siteStats} margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="code" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 12 }} />
                      <Bar dataKey="totalActs" radius={[6, 6, 0, 0]}>
                        {data.siteStats.map((_, i) => <Cell key={i} fill={GREENS[i % GREENS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b-2" style={{ borderColor: "#E8F5E9" }}>
                    <PieChartIcon className="w-4 h-4 inline mr-1.5" style={{ color: GREEN }} />{t("dash.chartTypeTitle")}
                  </h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={data.typeStats.filter((x) => x.count > 0)} dataKey="count" nameKey="label" innerRadius={50} outerRadius={90} paddingAngle={2}>
                        {data.typeStats.filter((x) => x.count > 0).map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  {data.typeStats.every((x) => x.count === 0) && <p className="text-center text-xs text-slate-400 -mt-32">{t("dash.noData")}</p>}
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b-2" style={{ borderColor: "#E8F5E9" }}>
                    <ClipboardList className="w-4 h-4 inline mr-1.5" style={{ color: GREEN }} />{t("dash.chartProposalsTitle")}
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.proposals} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" stroke="#64748b" fontSize={11} width={110} />
                      <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 12 }} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {data.proposals.map((_, i) => <Cell key={i} fill={COMM_COLORS[i % COMM_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b-2" style={{ borderColor: "#E8F5E9" }}>
                    <Megaphone className="w-4 h-4 inline mr-1.5" style={{ color: GREEN }} />{t("dash.chartCommsTitle")}
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={commTrendData} margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {data.commsChannels.map((c, i) => (
                        <Bar key={c.code} dataKey={c.code} name={c.label} stackId="comm" fill={COMM_COLORS[i % COMM_COLORS.length]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Issues + deadlines tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" /> {t("dash.issuesTitle")} ({data.issues.length})
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: GREEN }} className="text-white">
                          <th className="text-left px-3 py-2 rounded-l-lg">{t("form.issueDesc")}</th>
                          <th className="text-left px-3 py-2">{t("form.site")}</th>
                          <th className="text-left px-3 py-2 rounded-r-lg">{t("form.issuePic")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.issues.map((i, idx) => (
                          <tr key={idx} className="border-b border-slate-100">
                            <td className="px-3 py-2 text-slate-700">{i.description}</td>
                            <td className="px-3 py-2 text-slate-500">{i.siteCode}</td>
                            <td className="px-3 py-2 text-slate-500">{i.pic}</td>
                          </tr>
                        ))}
                        {data.issues.length === 0 && (
                          <tr><td colSpan={3} className="px-3 py-4 text-center text-slate-400">{t("dash.noData")}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-sky-600" /> {t("dash.deadlinesTitle")}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: GREEN }} className="text-white">
                          <th className="text-left px-3 py-2 rounded-l-lg">{t("form.eventDate")}</th>
                          <th className="text-left px-3 py-2">{t("form.eventDesc")}</th>
                          <th className="text-left px-3 py-2">{t("form.issuePic")}</th>
                          <th className="text-left px-3 py-2 rounded-r-lg"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.deadlines.map((d, idx) => {
                          const days = daysUntil(d.date);
                          return (
                            <tr key={idx} className="border-b border-slate-100">
                              <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{d.date}</td>
                              <td className="px-3 py-2 text-slate-700">{d.event}</td>
                              <td className="px-3 py-2 text-slate-500">{d.pic}</td>
                              <td className="px-3 py-2">
                                {days !== null && (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${days <= 7 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                                    {days < 0 ? t("dash.overdue") : `${days} ${lang_days(t)}`}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {data.deadlines.length === 0 && (
                          <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">{t("dash.noData")}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Priorities list */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Flag className="w-4 h-4 text-blue-600" /> {t("dash.prioritiesTitle")} ({data.priorities.length})
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.priorities.map((p, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs flex gap-2">
                      <span className="w-5 h-5 shrink-0 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: GREEN }}>{p.priorityNo}</span>
                      <div>
                        <p className="text-slate-700">{p.activity}</p>
                        <p className="text-slate-500 mt-0.5">{p.siteCode && `${p.siteCode} · `}{p.pic}</p>
                      </div>
                    </div>
                  ))}
                  {data.priorities.length === 0 && <p className="text-xs text-slate-400">{t("dash.noData")}</p>}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function lang_days(t: (k: string) => string) {
  const s = t("dash.daysUnit");
  return s === "dash.daysUnit" ? "ngày" : s;
}
