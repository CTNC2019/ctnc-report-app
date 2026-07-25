"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Save, Send, MapPin, FileText, CheckCircle, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

const steps = [
  { id: 1, title: "Thông tin chung", icon: FileText },
  { id: 2, title: "Báo cáo Khu vực", icon: MapPin },
  { id: 3, title: "Đề xuất & Báo cáo", icon: FileText },
  { id: 4, title: "Thách thức & Ưu tiên", icon: AlertTriangleIcon },
  { id: 5, title: "Hoàn tất", icon: CheckCircle }
];

function AlertTriangleIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
}

const siteCatalog = [
  { code: "TH", name: "Tay Hoa Protection Forest" },
  { code: "SH", name: "Song Hinh Protection Forest" },
  { code: "DC", name: "Deo Ca Special-use Forest" },
  { code: "VP", name: "Nui Vong Phu Protection Forest" },
  { code: "ES", name: "Ea So Nature Reserve" },
  { code: "NV", name: "Ninh Hoa Van Ninh Protection Forest" },
  { code: "BH", name: "Bac Hai Van Nature Reserve" },
  { code: "CD", name: "Con Dao National Park" }
];

export default function ReportForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Parent Data
  const [formData, setFormData] = useState({
    reportingMonth: "07/2026",
    preparedBy: "CTNC-01",
    date: new Date().toISOString().split('T')[0],
  });

  // Child Data - Sites
  const [siteUpdates, setSiteUpdates] = useState<any[]>([]);
  // Child Data - Proposals
  const [proposals, setProposals] = useState<any[]>([]);
  // Child Data - Issues
  const [issues, setIssues] = useState<any[]>([]);

  const addSiteUpdate = () => {
    setSiteUpdates([...siteUpdates, { id: Date.now(), siteCode: "TH", numActs: "", desc: "", results: "", plan: "" }]);
  };
  const removeSite = (id: number) => setSiteUpdates(siteUpdates.filter(s => s.id !== id));

  const addProposal = () => {
    setProposals([...proposals, { id: Date.now(), name: "", status: "W", deadline: "", note: "" }]);
  };
  const removeProposal = (id: number) => setProposals(proposals.filter(p => p.id !== id));

  const nextStep = () => currentStep < steps.length && setCurrentStep(s => s + 1);
  const prevStep = () => currentStep > 1 && setCurrentStep(s => s - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      reportId: `${formData.preparedBy}-${formData.reportingMonth.replace('/', '')}`,
      ...formData,
      siteUpdates,
      proposals,
      issues
    };
    
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setCurrentStep(5);
      } else {
        alert("Lỗi khi gửi báo cáo: " + data.error);
      }
    } catch (err) {
      alert("Đã xảy ra lỗi mạng!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Biểu mẫu Báo Cáo Tháng</h1>
            <p className="text-emerald-400/80 text-sm mt-1">Hệ thống dữ liệu quan hệ (Relational DB) tối ưu</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex justify-between items-center mb-8 relative px-4">
          <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-slate-800 -z-10 rounded-full">
            <motion.div 
              className="h-full bg-emerald-500 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {steps.map(step => (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-slate-900 px-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                currentStep >= step.id 
                  ? 'bg-emerald-500 border-emerald-500 text-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.5)]' 
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}>
                <step.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        {/* Form Content */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <AnimatePresence mode="wait">
            
            {/* STEP 1 */}
            {currentStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-2">Bảng Cha: Thông tin Báo Cáo</h2>
                <p className="text-slate-400 text-sm mb-6">Mỗi báo cáo sẽ được gán một Report_ID duy nhất để liên kết với các bảng con.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-emerald-100 mb-2">Report ID (Khóa chính - PK)</label>
                    <input disabled value={`${formData.preparedBy}-${formData.reportingMonth.replace('/', '')}`} className="w-full px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 cursor-not-allowed font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-emerald-100 mb-2">Tháng báo cáo (MM/YYYY)</label>
                    <input type="text" value={formData.reportingMonth} onChange={e => setFormData({...formData, reportingMonth: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 text-white" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2 */}
            {currentStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Bảng Con 1: Hoạt động Khu vực</h2>
                    <p className="text-slate-400 text-sm">Thêm nhiều khu vực trong cùng một báo cáo. UI hiển thị tên, DB lưu mã (Site_Code).</p>
                  </div>
                  <button onClick={addSiteUpdate} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm text-white transition-colors border border-slate-600">
                    <Plus className="w-4 h-4" /> Thêm Site
                  </button>
                </div>

                {siteUpdates.length === 0 && (
                  <div className="text-center p-8 bg-white/5 border border-white/10 rounded-xl border-dashed">
                    <p className="text-slate-400">Chưa có khu vực nào được báo cáo. Bấm nút Thêm Site.</p>
                  </div>
                )}

                {siteUpdates.map((site, index) => (
                  <div key={site.id} className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl relative group">
                    <button onClick={() => removeSite(site.id)} className="absolute top-4 right-4 p-2 text-red-400 hover:bg-red-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-emerald-100 mb-2">Chọn Khu Vực (Lưu FK: Site_Code)</label>
                        <select 
                          value={site.siteCode}
                          onChange={e => {
                            const newSites = [...siteUpdates];
                            newSites[index].siteCode = e.target.value;
                            setSiteUpdates(newSites);
                          }}
                          className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 text-white"
                        >
                          {siteCatalog.map(s => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-emerald-100 mb-2">Số lượng hoạt động</label>
                        <input type="number" placeholder="VD: 5" className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-emerald-100 mb-2">Mô tả chi tiết</label>
                        <textarea rows={2} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 resize-none" />
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* STEP 3 */}
            {currentStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Bảng Con 2: Đề xuất (Proposals)</h2>
                    <p className="text-slate-400 text-sm">Lưu Status dưới dạng mã (S, U, W, R).</p>
                  </div>
                  <button onClick={addProposal} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm text-white transition-colors border border-slate-600">
                    <Plus className="w-4 h-4" /> Thêm Đề xuất
                  </button>
                </div>

                {proposals.length === 0 && (
                  <div className="text-center p-8 bg-white/5 border border-white/10 rounded-xl border-dashed">
                    <p className="text-slate-400">Không có đề xuất nào trong tháng này.</p>
                  </div>
                )}

                {proposals.map((prop, index) => (
                  <div key={prop.id} className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl relative group">
                    <button onClick={() => removeProposal(prop.id)} className="absolute top-4 right-4 p-2 text-red-400 hover:bg-red-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-emerald-100 mb-2">Tên Đề xuất</label>
                        <input type="text" className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-emerald-100 mb-2">Trạng thái (Status Code)</label>
                        <select className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 text-white">
                          <option value="S">Successful (S)</option>
                          <option value="U">Unsuccessful (U)</option>
                          <option value="W">Writing (W)</option>
                          <option value="R">Needs Review (R)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* STEP 4 & 5 (Simplified for demo) */}
            {currentStep === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-2xl font-bold text-white mb-6">Thách thức & Ưu tiên (Tương tự)</h2>
                <div className="p-8 bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-2xl text-center">
                  Giao diện này sẽ hoạt động giống hệt Bảng con 1 & 2. Bỏ qua bước này để tiếp tục quá trình Gửi dữ liệu.
                </div>
              </motion.div>
            )}

            {currentStep === 5 && (
              <motion.div key="step5" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Thành công!</h2>
                <p className="text-slate-400 max-w-md mb-8">
                  Payload JSON (Cây dữ liệu quan hệ) đã được mô phỏng gửi thành công tới Backend API.
                </p>
                <Link href="/dashboard">
                  <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-colors font-medium">Quay lại Dashboard</button>
                </Link>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Navigation */}
          {currentStep < 5 && (
            <div className="flex justify-between mt-10 pt-6 border-t border-white/10">
              <button onClick={prevStep} disabled={currentStep === 1} className="px-6 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-30">Quay lại</button>
              {currentStep < 4 ? (
                <button onClick={nextStep} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-2.5 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95">Tiếp tục <ArrowRight className="w-4 h-4" /></button>
              ) : (
                <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-70">
                  {isSubmitting ? "Đang xử lý Payload..." : "Mô phỏng Gửi API"}
                  {!isSubmitting && <Send className="w-4 h-4" />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
