"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Save, Send, MapPin, FileText, CheckCircle, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useSession } from "@/hooks/useSession";

function AlertTriangleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  );
}

const siteCatalog = [
  { code: "TH", name: "Tay Hoa Protection Forest" },
  { code: "SH", name: "Song Hinh Protection Forest" },
  { code: "DC", name: "Deo Ca Special-use Forest" },
  { code: "VP", name: "Nui Vong Phu Protection Forest" },
  { code: "ES", name: "Ea So Nature Reserve" },
  { code: "NV", name: "Ninh Hoa Van Ninh Protection Forest" },
  { code: "BH", name: "Bac Hai Van Nature Reserve" },
  { code: "CD", name: "Con Dao National Park" },
];

type SiteUpdate = { key: number; siteCode: string; numActs: string; desc: string; results: string; plan: string };
type Proposal = { key: number; name: string; status: string; deadline: string; note: string };
type IssueItem = { key: number; type: "Issue" | "Priority"; siteCode: string; description: string; pic: string; deadline: string };

let seq = 1;
const nextKey = () => seq++;

function nowMonth() {
  const d = new Date();
  return String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}

function FormInner() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user } = useSession();
  const editId = useSearchParams().get("id");

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [loaded, setLoaded] = useState(!editId);
  const [month, setMonth] = useState(nowMonth());
  const [siteUpdates, setSiteUpdates] = useState<SiteUpdate[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [issues, setIssues] = useState<IssueItem[]>([]);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/reports/${editId}`)
      .then((r) => r.json())
      .then((d) => {
        const rep = d.report;
        if (!rep) return;
        setMonth(rep.month);
        setSiteUpdates((rep.siteUpdates || []).map((s: SiteUpdate) => ({ ...s, key: nextKey() })));
        setProposals((rep.proposals || []).map((p: Proposal) => ({ ...p, key: nextKey() })));
        setIssues((rep.issues || []).map((x: IssueItem) => ({ ...x, key: nextKey() })));
        setLoaded(true);
      });
  }, [editId]);

  const reportId = user ? `${user.id}-${month.replace("/", "")}` : "…";
  const steps = [
    { id: 1, title: t("form.step1"), icon: FileText },
    { id: 2, title: t("form.step2"), icon: MapPin },
    { id: 3, title: t("form.step3"), icon: FileText },
    { id: 4, title: t("form.step4"), icon: AlertTriangleIcon },
    { id: 5, title: t("form.step5"), icon: CheckCircle },
  ];

  const addSite = () => setSiteUpdates((s) => [...s, { key: nextKey(), siteCode: "TH", numActs: "", desc: "", results: "", plan: "" }]);
  const removeSite = (key: number) => setSiteUpdates((s) => s.filter((x) => x.key !== key));
  const addProposal = () => setProposals((s) => [...s, { key: nextKey(), name: "", status: "W", deadline: "", note: "" }]);
  const removeProposal = (key: number) => setProposals((s) => s.filter((x) => x.key !== key));
  const addIssue = () => setIssues((s) => [...s, { key: nextKey(), type: "Issue", siteCode: "", description: "", pic: "", deadline: "" }]);
  const removeIssue = (key: number) => setIssues((s) => s.filter((x) => x.key !== key));

  const nextStep = () => currentStep < 5 && setCurrentStep((s) => s + 1);
  const prevStep = () => (currentStep > 1 ? setCurrentStep((s) => s - 1) : router.push("/reports"));

  async function persist(status: "Draft" | "Submitted") {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: editId || undefined,
          month,
          status,
          siteUpdates: siteUpdates.map(({ siteCode, numActs, desc, results, plan }) => ({ siteCode, numActs: Number(numActs) || 0, desc, results, plan })),
          proposals: proposals.map(({ name, status, deadline, note }) => ({ name, status, deadline, note })),
          issues: issues.map(({ type, siteCode, description, pic, deadline }) => ({ type, siteCode, description, pic, deadline })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (status === "Submitted") {
          setDone(true);
        } else {
          router.push("/reports");
        }
      } else {
        alert("Lỗi khi lưu báo cáo: " + (data.error || "unknown"));
      }
    } catch {
      alert("Đã xảy ra lỗi mạng!");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!loaded) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">{t("common.loading")}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/reports" className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{t("form.title")}</h1>
            <p className="text-emerald-400/80 text-sm mt-1">{t("form.subtitle")}</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-8 relative px-4">
          <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-slate-800 -z-10 rounded-full">
            <motion.div className="h-full bg-emerald-500 rounded-full" initial={{ width: "0%" }} animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }} transition={{ duration: 0.3 }} />
          </div>
          {steps.map((step) => (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-slate-900 px-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${currentStep >= step.id ? "bg-emerald-500 border-emerald-500 text-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-slate-800 border-slate-700 text-slate-500"}`}>
                <step.icon className="w-5 h-5" />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-2">{t("form.step1")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-emerald-100 mb-2">{t("form.reportId")}</label>
                    <input disabled value={reportId} className="w-full px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 cursor-not-allowed font-mono" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-emerald-100 mb-2">{t("form.month")}</label>
                    <input type="text" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 text-white" />
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">{t("form.step2")}</h2>
                  <button onClick={addSite} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm text-white border border-slate-600">
                    <Plus className="w-4 h-4" /> {t("form.addSite")}
                  </button>
                </div>
                {siteUpdates.length === 0 && (
                  <div className="text-center p-8 bg-white/5 border border-white/10 rounded-xl border-dashed">
                    <p className="text-slate-400">{t("form.noItems")}</p>
                  </div>
                )}
                {siteUpdates.map((site) => (
                  <div key={site.key} className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl relative group">
                    <button onClick={() => removeSite(site.key)} className="absolute top-4 right-4 p-2 text-red-400 hover:bg-red-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-emerald-100 mb-2">{t("form.site")}</label>
                        <select value={site.siteCode} onChange={(e) => setSiteUpdates((s) => s.map((x) => (x.key === site.key ? { ...x, siteCode: e.target.value } : x)))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 text-white">
                          {siteCatalog.map((s) => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-emerald-100 mb-2">{t("form.numActs")}</label>
                        <input type="number" min={0} placeholder="VD: 5" value={site.numActs} onChange={(e) => setSiteUpdates((s) => s.map((x) => (x.key === site.key ? { ...x, numActs: e.target.value } : x)))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-emerald-100 mb-2">{t("form.desc")}</label>
                        <textarea rows={2} value={site.desc} onChange={(e) => setSiteUpdates((s) => s.map((x) => (x.key === site.key ? { ...x, desc: e.target.value } : x)))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 resize-none" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-emerald-100 mb-2">{t("form.results")}</label>
                        <textarea rows={2} value={site.results} onChange={(e) => setSiteUpdates((s) => s.map((x) => (x.key === site.key ? { ...x, results: e.target.value } : x)))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 resize-none" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-emerald-100 mb-2">{t("form.plan")}</label>
                        <textarea rows={2} value={site.plan} onChange={(e) => setSiteUpdates((s) => s.map((x) => (x.key === site.key ? { ...x, plan: e.target.value } : x)))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 resize-none" />
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">{t("form.step3")}</h2>
                  <button onClick={addProposal} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm text-white border border-slate-600">
                    <Plus className="w-4 h-4" /> {t("form.addProposal")}
                  </button>
                </div>
                {proposals.length === 0 && (
                  <div className="text-center p-8 bg-white/5 border border-white/10 rounded-xl border-dashed">
                    <p className="text-slate-400">{t("form.noItems")}</p>
                  </div>
                )}
                {proposals.map((prop) => (
                  <div key={prop.key} className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl relative group">
                    <button onClick={() => removeProposal(prop.key)} className="absolute top-4 right-4 p-2 text-red-400 hover:bg-red-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-emerald-100 mb-2">{t("form.propName")}</label>
                        <input type="text" value={prop.name} onChange={(e) => setProposals((s) => s.map((x) => (x.key === prop.key ? { ...x, name: e.target.value } : x)))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-emerald-100 mb-2">{t("form.propStatus")}</label>
                        <select value={prop.status} onChange={(e) => setProposals((s) => s.map((x) => (x.key === prop.key ? { ...x, status: e.target.value } : x)))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 text-white">
                          <option value="S">Successful (S)</option>
                          <option value="U">Unsuccessful (U)</option>
                          <option value="W">Writing (W)</option>
                          <option value="R">Needs Review (R)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-emerald-100 mb-2">{t("form.propDeadline")}</label>
                        <input type="text" placeholder="MM/YYYY" value={prop.deadline} onChange={(e) => setProposals((s) => s.map((x) => (x.key === prop.key ? { ...x, deadline: e.target.value } : x)))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-emerald-100 mb-2">{t("form.propNote")}</label>
                        <textarea rows={2} value={prop.note} onChange={(e) => setProposals((s) => s.map((x) => (x.key === prop.key ? { ...x, note: e.target.value } : x)))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 resize-none" />
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">{t("form.step4")}</h2>
                  <button onClick={addIssue} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm text-white border border-slate-600">
                    <Plus className="w-4 h-4" /> {t("form.addIssue")}
                  </button>
                </div>
                {issues.length === 0 && (
                  <div className="text-center p-8 bg-white/5 border border-white/10 rounded-xl border-dashed">
                    <p className="text-slate-400">{t("form.noItems")}</p>
                  </div>
                )}
                {issues.map((x) => (
                  <div key={x.key} className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl relative group">
                    <button onClick={() => removeIssue(x.key)} className="absolute top-4 right-4 p-2 text-red-400 hover:bg-red-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-emerald-100 mb-2">{t("form.issueType")}</label>
                        <select value={x.type} onChange={(e) => setIssues((s) => s.map((y) => (y.key === x.key ? { ...y, type: e.target.value as "Issue" | "Priority" } : y)))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 text-white">
                          <option value="Issue">{t("form.issueType.issue")}</option>
                          <option value="Priority">{t("form.issueType.priority")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-emerald-100 mb-2">{t("form.site")}</label>
                        <select value={x.siteCode} onChange={(e) => setIssues((s) => s.map((y) => (y.key === x.key ? { ...y, siteCode: e.target.value } : y)))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 text-white">
                          <option value="">—</option>
                          {siteCatalog.map((s) => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-emerald-100 mb-2">{t("form.issueDesc")}</label>
                        <textarea rows={2} value={x.description} onChange={(e) => setIssues((s) => s.map((y) => (y.key === x.key ? { ...y, description: e.target.value } : y)))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 resize-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-emerald-100 mb-2">{t("form.issuePic")}</label>
                        <input type="text" value={x.pic} onChange={(e) => setIssues((s) => s.map((y) => (y.key === x.key ? { ...y, pic: e.target.value } : y)))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-emerald-100 mb-2">{t("form.issueDeadline")}</label>
                        <input type="text" placeholder="MM/YYYY" value={x.deadline} onChange={(e) => setIssues((s) => s.map((y) => (y.key === x.key ? { ...y, deadline: e.target.value } : y)))} className="w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {currentStep === 5 && !done && (
              <motion.div key="step5-confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h2 className="text-2xl font-bold text-white mb-2">{t("form.step5")}</h2>
                <div className="p-5 bg-slate-800/50 border border-slate-700 rounded-2xl text-sm text-slate-300">
                  <p><b className="text-white font-mono">{reportId}</b> · {month}</p>
                  <p className="mt-1 text-slate-400">{siteUpdates.length} {t("form.step2").toLowerCase()} · {proposals.length} {t("form.step3").toLowerCase()} · {issues.length} {t("form.step4").toLowerCase()}</p>
                </div>
              </motion.div>
            )}

            {currentStep === 5 && done && (
              <motion.div key="step5-done" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">{t("form.success.title")}</h2>
                <p className="text-slate-400 max-w-md mb-8">{t("form.success.desc")}</p>
                <Link href="/dashboard">
                  <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-colors font-medium">{t("form.backDash")}</button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {!(currentStep === 5 && done) && (
          <div className="flex justify-between mt-10 pt-6 border-t border-white/10">
            <button onClick={prevStep} className="px-6 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/5 transition-colors">
              {t("form.back")}
            </button>
            {currentStep < 4 ? (
              <button onClick={nextStep} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-2.5 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95">
                {t("form.next")} <ArrowRight className="w-4 h-4" />
              </button>
            ) : currentStep === 4 ? (
              <button onClick={nextStep} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-2.5 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95">
                {t("form.next")} <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => persist("Draft")} disabled={isSubmitting} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-xl font-medium disabled:opacity-70">
                  <Save className="w-4 h-4" /> {t("form.saveDraft")}
                </button>
                <button onClick={() => persist("Submitted")} disabled={isSubmitting} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-70">
                  {isSubmitting ? t("form.submitting") : t("form.submit")}
                  {!isSubmitting && <Send className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReportForm() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <FormInner />
    </Suspense>
  );
}
