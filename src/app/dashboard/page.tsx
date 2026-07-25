"use client";

import { motion } from "framer-motion";
import { FileText, CheckCircle, Clock, AlertTriangle, Plus, BarChart3, Users, Settings } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  // Mock data for UI
  const stats = [
    { title: "Báo cáo tháng này", value: "3/8", icon: FileText, color: "text-blue-400", bg: "bg-blue-400/10" },
    { title: "Đề xuất đang xử lý", value: "5", icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
    { title: "Hoạt động hoàn thành", value: "24", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { title: "Vấn đề cần hỗ trợ", value: "2", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10" },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {/* Sidebar / Topbar */}
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
              <span className="text-sm text-slate-400">Xin chào, <b className="text-white">CTNC-01</b></span>
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
            <h1 className="text-3xl font-bold text-white mb-2">Tổng quan dự án</h1>
            <p className="text-slate-400">Theo dõi tiến độ và các chỉ số quan trọng trong tháng 07/2026</p>
          </div>
          <Link href="/form">
            <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
              <Plus className="w-5 h-5" />
              Tạo Báo Cáo Mới
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
              <h3 className="text-slate-400 text-sm font-medium mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Recent Activity / Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              Deadlines Sắp Tới
            </h2>
            <div className="space-y-4">
              {[
                { task: "Nộp báo cáo quý 2", site: "Tay Hoa", date: "30/07/2026", status: "Gần đến hạn" },
                { task: "Hoàn thiện Proposal GCF", site: "Toàn dự án", date: "05/08/2026", status: "Đang xử lý" },
                { task: "Survey đa dạng sinh học", site: "Song Hinh", date: "12/08/2026", status: "Chưa bắt đầu" }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                  <div>
                    <h4 className="font-semibold text-slate-200">{item.task}</h4>
                    <p className="text-sm text-slate-400">{item.site}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">{item.date}</p>
                    <span className="text-xs px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 mt-1 inline-block">
                      {item.status}
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
              Hành động nhanh
            </h2>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-sm font-medium">
                Cập nhật Proposal
              </button>
              <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-sm font-medium">
                Ghi nhận vấn đề (Issue)
              </button>
              <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-sm font-medium">
                Cấu hình Tài khoản
              </button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
