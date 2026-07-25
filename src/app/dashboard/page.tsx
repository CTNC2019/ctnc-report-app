"use client";

import { motion } from "framer-motion";
import { FileText, CheckCircle, Clock, AlertTriangle, Plus, BarChart3, Users, Settings } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Dashboard() {
  const { t } = useLanguage();

  const stats = [
    { titleKey: "dash.stat.reports", value: "3/8", icon: FileText, color: "text-blue-400", bg: "bg-blue-400/10" },
    { titleKey: "dash.stat.proposals", value: "5", icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
    { titleKey: "dash.stat.activities", value: "24", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { titleKey: "dash.stat.issues", value: "2", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10" },
  ];

  const deadlines = [
    { taskKey: "dash.deadline.task1", siteKey: "dash.deadline.site1", date: "30/07/2026", statusKey: "dash.deadline.status1" },
    { taskKey: "dash.deadline.task2", siteKey: "dash.deadline.site2", date: "05/08/2026", statusKey: "dash.deadline.status2" },
    { taskKey: "dash.deadline.task3", siteKey: "dash.deadline.site3", date: "12/08/2026", statusKey: "dash.deadline.status3" },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {/* Topbar */}
      <nav className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white tracking-tight">CTNC Portal</span>
            </div>
            <div className="flex gap-4 items-center">
              <LanguageSwitcher />
              <span className="text-sm text-slate-400">{t("dash.greeting")} <b className="text-white">CTNC-01</b></span>
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t("dash.title")}</h1>
            <p className="text-slate-400">{t("dash.subtitle")}</p>
          </div>
          <Link href="/form">
            <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
              <Plus className="w-5 h-5" />
              {t("dash.newReport")}
            </button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col hover:bg-white/10 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <h3 className="text-slate-400 text-sm font-medium mb-1">{t(stat.titleKey)}</h3>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Deadlines & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              {t("dash.deadlines")}
            </h2>
            <div className="space-y-4">
              {deadlines.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                  <div>
                    <h4 className="font-semibold text-slate-200">{t(item.taskKey)}</h4>
                    <p className="text-sm text-slate-400">{t(item.siteKey)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">{item.date}</p>
                    <span className="text-xs px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 mt-1 inline-block">
                      {t(item.statusKey)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              {t("dash.quickActions")}
            </h2>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-sm font-medium">
                {t("dash.action.proposal")}
              </button>
              <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-sm font-medium">
                {t("dash.action.issue")}
              </button>
              <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-sm font-medium">
                {t("dash.action.settings")}
              </button>
              <Link href="/">
                <button className="w-full text-left px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors text-sm font-medium text-red-400 mt-2">
                  {t("dash.logout")}
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
