"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Save, Send, CheckCircle, Plus, Trash2, Upload, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { useSession } from "@/hooks/useSession";

// Dropdown labels (sites, activity types...) are sheet-driven: fetched from
// /api/master-data (which reads the "Master_Data" Google Sheet tab) instead of being
// hardcoded here. See MasterData state + the loading effect below. sheets.ts on the
// server holds the built-in fallback wording used if that sheet tab isn't set up yet.
type MasterItem = { code: string; vi: string; en: string };
type MasterData = {
  sites: MasterItem[];
  activityTypes: MasterItem[];
  reportTypes: MasterItem[];
  commChannels: MasterItem[];
  proposalStatuses: MasterItem[];
};

type Photo = { url: string; caption: string };
type DocLink = { url: string; label: string };
type Activity = { key: number; activityType: string; desc: string };
type SiteEntry = {
  siteCode: string;
  activities: Activity[];
  keyActivities: string;
  keyResults: string;
  difficulties: string;
  followUp: string;
  plan: string;
  photos: Photo[];
  relatedDocs: DocLink[];
};
type Proposal = { key: number; name: string; writer: string; donor: string; status: string; deadline: string; note: string };
type ReportDataItem = { key: number; itemName: string; typeCode: string; statusUpdate: string; deadlineAction: string };
type CommEntry = { channelCode: string; count: string; thisMonth: string; nextMonth: string };
type IssueItem = { key: number; siteCode: string; description: string; actionNeeded: string; pic: string };
type PriorityItem = { key: number; siteCode: string; activity: string; pic: string; deadline: string };
type DeadlineItem = { key: number; date: string; event: string; siteDonor: string; pic: string };

let seq = 1;
const nextKey = () => seq++;

function nowMonth() {
  const d = new Date();
  return String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}

function emptySites(sites: MasterItem[]): SiteEntry[] {
  return sites.map((s) => ({
    siteCode: s.code,
    activities: [],
    keyActivities: "",
    keyResults: "",
    difficulties: "",
    followUp: "",
    plan: "",
    photos: [],
    relatedDocs: [],
  }));
}
function emptyComms(channels: MasterItem[]): CommEntry[] {
  return channels.map((c) => ({ channelCode: c.code, count: "", thisMonth: "", nextMonth: "" }));
}

const inputCls = "w-full px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none";
const labelCls = "block text-sm font-medium text-emerald-100 mb-2";
const cardCls = "p-6 bg-slate-800/50 border border-slate-700 rounded-2xl relative";

function FormInner() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { user } = useSession();
  const editId = useSearchParams().get("id");
  const L = (item: { vi: string; en: string }) => (lang === "en" ? item.en : item.vi);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [month, setMonth] = useState(nowMonth());
  const [activeSite, setActiveSite] = useState(0);

  const [sites, setSites] = useState<SiteEntry[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [reportItems, setReportItems] = useState<ReportDataItem[]>([]);
  const [comms, setComms] = useState<CommEntry[]>([]);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [priorities, setPriorities] = useState<PriorityItem[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sheet-driven labels must arrive before the form can render (site tabs, activity
  // type dropdowns, etc. are all built from this). For a brand-new report, seed the
  // site tabs + fixed comm channels as soon as it arrives; editing an existing report
  // is handled by the next effect once both editId's fetch and masterData are ready.
  useEffect(() => {
    fetch("/api/master-data")
      .then((r) => r.json())
      .then((d: MasterData) => {
        setMasterData(d);
        if (!editId) {
          setSites(emptySites(d.sites));
          setComms(emptyComms(d.commChannels));
          setLoaded(true);
        }
      });
  }, [editId]);

  // Real member list (Dim_Users), used for the Proposal "Writer" dropdown per the
  // revised report template — separate from the sheet-driven label taxonomy above.
  useEffect(() => {
    fetch("/api/members")
      .then((r) => r.json())
      .then((d: { members: { id: string; name: string }[] }) => setMembers(d.members || []))
      .catch(() => {});
  }, []);

  // Edit an existing report: wait for master data too, so unfilled sites/channels are
  // still seeded correctly alongside whatever the report already has saved.
  useEffect(() => {
    if (!editId || !masterData) return;
    fetch(`/api/reports/${editId}`)
      .then((r) => r.json())
      .then((d) => {
        const rep = d.report;
        if (!rep) return;
        setMonth(rep.month || nowMonth());
        if (rep.sites?.length) {
          setSites(
            masterData.sites.map((s) => {
              const found = rep.sites.find((x: SiteEntry) => x.siteCode === s.code);
              return found
                ? { ...found, activities: (found.activities || []).map((a: Activity) => ({ ...a, key: nextKey() })) }
                : {
                    siteCode: s.code,
                    activities: [],
                    keyActivities: "",
                    keyResults: "",
                    difficulties: "",
                    followUp: "",
                    plan: "",
                    photos: [],
                    relatedDocs: [],
                  };
            })
          );
        } else {
          setSites(emptySites(masterData.sites));
        }
        setProposals((rep.proposals || []).map((p: Proposal) => ({ ...p, key: nextKey() })));
        setReportItems((rep.reportItems || []).map((x: ReportDataItem) => ({ ...x, key: nextKey() })));
        if (rep.comms?.length) setComms(rep.comms);
        else setComms(emptyComms(masterData.commChannels));
        setIssues((rep.issues || []).map((x: IssueItem) => ({ ...x, key: nextKey() })));
        setPriorities((rep.priorities || []).map((x: PriorityItem) => ({ ...x, key: nextKey() })));
        setDeadlines((rep.deadlines || []).map((x: DeadlineItem) => ({ ...x, key: nextKey() })));
        setLoaded(true);
      });
  }, [editId, masterData]);

  const reportId = user ? `${user.id}-${month.replace("/", "")}` : "…";
  const stepTitles = [
    t("form.step.general"),
    t("form.step.sites"),
    t("form.step.proposals"),
    t("form.step.reportsdata"),
    t("form.step.comms"),
    t("form.step.issues"),
    t("form.step.priorities"),
    t("form.step.deadlines"),
    t("form.step.review"),
  ];
  const totalSteps = stepTitles.length;

  const nextStep = () => currentStep < totalSteps && setCurrentStep((s) => s + 1);
  const prevStep = () => (currentStep > 1 ? setCurrentStep((s) => s - 1) : router.push("/reports"));

  // --- Site activities helpers ---
  const updateSite = (idx: number, patch: Partial<SiteEntry>) =>
    setSites((s) => s.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  const addActivity = (idx: number) =>
    updateSite(idx, { activities: [...sites[idx].activities, { key: nextKey(), activityType: "SMART_TRAINING", desc: "" }] });
  const removeActivity = (idx: number, key: number) =>
    updateSite(idx, { activities: sites[idx].activities.filter((a) => a.key !== key) });
  const updateActivity = (idx: number, key: number, patch: Partial<Activity>) =>
    updateSite(idx, { activities: sites[idx].activities.map((a) => (a.key === key ? { ...a, ...patch } : a)) });

  async function handlePhotoUpload(idx: number, file: File) {
    setUploadingFor(sites[idx].siteCode);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        updateSite(idx, { photos: [...sites[idx].photos, { url: data.url, caption: "" }] });
      } else {
        alert("Lỗi tải ảnh: " + (data.error || "unknown"));
      }
    } catch {
      alert("Lỗi mạng khi tải ảnh.");
    } finally {
      setUploadingFor(null);
    }
  }
  const removePhoto = (idx: number, url: string) => updateSite(idx, { photos: sites[idx].photos.filter((p) => p.url !== url) });
  const setCaption = (idx: number, url: string, caption: string) =>
    updateSite(idx, { photos: sites[idx].photos.map((p) => (p.url === url ? { ...p, caption } : p)) });

  // --- Related documents (1.6) — list of pasted URLs with an optional short label ---
  const addDoc = (idx: number) => updateSite(idx, { relatedDocs: [...sites[idx].relatedDocs, { url: "", label: "" }] });
  const removeDoc = (idx: number, i: number) => updateSite(idx, { relatedDocs: sites[idx].relatedDocs.filter((_, j) => j !== i) });
  const updateDoc = (idx: number, i: number, patch: Partial<DocLink>) =>
    updateSite(idx, { relatedDocs: sites[idx].relatedDocs.map((d, j) => (j === i ? { ...d, ...patch } : d)) });

  const addProposal = () => setProposals((s) => [...s, { key: nextKey(), name: "", writer: user?.id || "", donor: "", status: "Writing", deadline: "", note: "" }]);
  const removeProposal = (key: number) => setProposals((s) => s.filter((x) => x.key !== key));

  const addReportItem = () => setReportItems((s) => [...s, { key: nextKey(), itemName: "", typeCode: "Annual", statusUpdate: "", deadlineAction: "" }]);
  const removeReportItem = (key: number) => setReportItems((s) => s.filter((x) => x.key !== key));

  const addIssue = () => setIssues((s) => [...s, { key: nextKey(), siteCode: "", description: "", actionNeeded: "", pic: "" }]);
  const removeIssue = (key: number) => setIssues((s) => s.filter((x) => x.key !== key));

  const addPriority = () => priorities.length < 6 && setPriorities((s) => [...s, { key: nextKey(), siteCode: "", activity: "", pic: "", deadline: "" }]);
  const removePriority = (key: number) => setPriorities((s) => s.filter((x) => x.key !== key));

  const addDeadline = () => setDeadlines((s) => [...s, { key: nextKey(), date: "", event: "", siteDonor: "", pic: "" }]);
  const removeDeadline = (key: number) => setDeadlines((s) => s.filter((x) => x.key !== key));

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
          sites: sites.map((s) => ({
            siteCode: s.siteCode,
            activities: s.activities.map(({ activityType, desc }) => ({ activityType, desc })),
            keyActivities: s.keyActivities,
            keyResults: s.keyResults,
            difficulties: s.difficulties,
            followUp: s.followUp,
            plan: s.plan,
            photos: s.photos,
            relatedDocs: s.relatedDocs,
          })),
          proposals: proposals.map(({ name, writer, donor, status, deadline, note }) => ({ name, writer, donor, status, deadline, note })),
          reportItems: reportItems.map(({ itemName, typeCode, statusUpdate, deadlineAction }) => ({ itemName, typeCode, statusUpdate, deadlineAction })),
          comms: comms.map(({ channelCode, count, thisMonth, nextMonth }) => ({ channelCode, count, thisMonth, nextMonth })),
          issues: issues.map(({ siteCode, description, actionNeeded, pic }) => ({ siteCode, description, actionNeeded, pic })),
          priorities: priorities.map(({ siteCode, activity, pic, deadline }, i) => ({ priorityNo: i + 1, siteCode, activity, pic, deadline })),
          deadlines: deadlines.map(({ date, event, siteDonor, pic }) => ({ date, event, siteDonor, pic })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (status === "Submitted") setDone(true);
        else router.push("/reports");
      } else {
        alert("Lỗi khi lưu báo cáo: " + (data.error || "unknown"));
      }
    } catch {
      alert("Đã xảy ra lỗi mạng!");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!loaded || !masterData) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">{t("common.loading")}</div>;
  }

  const site = sites[activeSite];
  const siteMeta = masterData.sites[activeSite];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/reports" className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{t("form.title")}</h1>
            <p className="text-emerald-400/80 text-sm mt-1">{stepTitles[currentStep - 1]} · {currentStep}/{totalSteps}</p>
          </div>
        </div>

        <div className="w-full h-1.5 bg-slate-800 rounded-full mb-8 overflow-hidden">
          <motion.div className="h-full bg-emerald-500" initial={{ width: "0%" }} animate={{ width: `${(currentStep / totalSteps) * 100}%` }} transition={{ duration: 0.3 }} />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {/* Step 1: General */}
            {currentStep === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-2">{t("form.step.general")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelCls}>{t("form.reportId")}</label>
                    <input disabled value={reportId} className={inputCls + " opacity-70 cursor-not-allowed font-mono"} />
                  </div>
                  <div>
                    <label className={labelCls}>{t("form.month")}</label>
                    <input type="text" value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t("form.preparedBy")}</label>
                    <input disabled value={user?.name || ""} className={inputCls + " opacity-70 cursor-not-allowed"} />
                  </div>
                  <div>
                    <label className={labelCls}>{t("form.dateePrepared")}</label>
                    <input disabled value={new Date().toLocaleDateString(lang === "en" ? "en-GB" : "vi-VN")} className={inputCls + " opacity-70 cursor-not-allowed"} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Sites */}
            {currentStep === 2 && site && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-2">{t("form.step.sites")}</h2>
                <div className="flex flex-wrap gap-2">
                  {masterData.sites.map((s, i) => (
                    <button
                      key={s.code}
                      onClick={() => setActiveSite(i)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        i === activeSite ? "bg-emerald-500 text-slate-900 border-emerald-500" : "bg-slate-800 text-slate-300 border-slate-700 hover:border-emerald-500/50"
                      }`}
                    >
                      {s.code} · {sites[i].activities.length}
                    </button>
                  ))}
                </div>

                <div className={cardCls}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">{L(siteMeta)} ({siteMeta.code})</h3>
                    <span className="text-xs text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full">
                      {t("form.numActsAuto")}: {site.activities.length}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <label className={labelCls + " mb-0"}>{t("form.addActivity")}</label>
                      <button onClick={() => addActivity(activeSite)} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs text-white">
                        <Plus className="w-3.5 h-3.5" /> {t("form.addActivity")}
                      </button>
                    </div>
                    {site.activities.length === 0 && <p className="text-sm text-slate-500">{t("form.noItems")}</p>}
                    {site.activities.map((a) => (
                      <div key={a.key} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-slate-900/60 rounded-xl p-3">
                        <select value={a.activityType} onChange={(e) => updateActivity(activeSite, a.key, { activityType: e.target.value })} className="px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white text-sm sm:w-56">
                          {masterData.activityTypes.map((x) => <option key={x.code} value={x.code}>{L(x)}</option>)}
                        </select>
                        <input type="text" placeholder={t("form.activityDesc")} value={a.desc} onChange={(e) => updateActivity(activeSite, a.key, { desc: e.target.value })} className="flex-1 px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white text-sm w-full" />
                        <button onClick={() => removeActivity(activeSite, a.key)} className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                      <label className={labelCls}>{t("form.keyActivities")}</label>
                      <textarea rows={2} value={site.keyActivities} onChange={(e) => updateSite(activeSite, { keyActivities: e.target.value })} className={inputCls + " resize-none"} />
                    </div>
                    <div>
                      <label className={labelCls}>{t("form.keyResults")}</label>
                      <textarea rows={2} value={site.keyResults} onChange={(e) => updateSite(activeSite, { keyResults: e.target.value })} className={inputCls + " resize-none"} />
                    </div>
                    <div>
                      <label className={labelCls}>{t("form.difficulties")}</label>
                      <textarea rows={2} value={site.difficulties} onChange={(e) => updateSite(activeSite, { difficulties: e.target.value })} className={inputCls + " resize-none"} />
                    </div>
                    <div>
                      <label className={labelCls}>{t("form.followUp")}</label>
                      <textarea rows={2} value={site.followUp} onChange={(e) => updateSite(activeSite, { followUp: e.target.value })} className={inputCls + " resize-none"} />
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className={labelCls + " mb-0"}>{t("form.photos")}</label>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFor === site.siteCode}
                        className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs text-white disabled:opacity-60"
                      >
                        {uploadingFor === site.siteCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        {uploadingFor === site.siteCode ? t("form.uploading") : t("form.uploadPhoto")}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handlePhotoUpload(activeSite, f);
                          e.target.value = "";
                        }}
                      />
                    </div>
                    {site.photos.length === 0 && <p className="text-sm text-slate-500">{t("form.noItems")}</p>}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {site.photos.map((p) => (
                        <div key={p.url} className="relative bg-slate-900/60 rounded-xl overflow-hidden border border-white/10">
                          <button onClick={() => removePhoto(activeSite, p.url)} className="absolute top-1.5 right-1.5 z-10 p-1 bg-black/60 text-red-300 rounded-full hover:bg-black/80">
                            <X className="w-3.5 h-3.5" />
                          </button>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt={p.caption || "photo"} className="w-full h-24 object-cover" />
                          <input
                            type="text"
                            placeholder={t("form.photoCaption")}
                            value={p.caption}
                            onChange={(e) => setCaption(activeSite, p.url, e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-900 text-xs text-white border-t border-white/10 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className={labelCls + " mb-0"}>{t("form.relatedDocs")}</label>
                      <button onClick={() => addDoc(activeSite)} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs text-white">
                        <Plus className="w-3.5 h-3.5" /> {t("form.addDoc")}
                      </button>
                    </div>
                    {site.relatedDocs.length === 0 && <p className="text-sm text-slate-500">{t("form.noItems")}</p>}
                    <div className="space-y-2">
                      {site.relatedDocs.map((d, i) => (
                        <div key={i} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-slate-900/60 rounded-xl p-3">
                          <input
                            type="text"
                            placeholder="https://..."
                            value={d.url}
                            onChange={(e) => updateDoc(activeSite, i, { url: e.target.value })}
                            className="flex-1 px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white text-sm w-full"
                          />
                          <input
                            type="text"
                            placeholder={t("form.docLabel")}
                            value={d.label}
                            onChange={(e) => updateDoc(activeSite, i, { label: e.target.value })}
                            className="px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white text-sm sm:w-56"
                          />
                          <button onClick={() => removeDoc(activeSite, i)} className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>{t("form.plan")}</label>
                    <textarea rows={2} value={site.plan} onChange={(e) => updateSite(activeSite, { plan: e.target.value })} className={inputCls + " resize-none"} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Proposals */}
            {currentStep === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-bold text-white">{t("form.step.proposals")}</h2>
                  <button onClick={addProposal} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm text-white border border-slate-600">
                    <Plus className="w-4 h-4" /> {t("form.addProposal")}
                  </button>
                </div>
                {proposals.length === 0 && <EmptyHint text={t("form.noItems")} />}
                {proposals.map((prop) => (
                  <div key={prop.key} className={cardCls + " group"}>
                    <RemoveBtn onClick={() => removeProposal(prop.key)} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label={t("form.propName")}>
                        <input type="text" value={prop.name} onChange={(e) => setProposals((s) => s.map((x) => (x.key === prop.key ? { ...x, name: e.target.value } : x)))} className={inputCls} />
                      </Field>
                      <Field label={t("form.propWriter")}>
                        <select value={prop.writer} onChange={(e) => setProposals((s) => s.map((x) => (x.key === prop.key ? { ...x, writer: e.target.value } : x)))} className={inputCls}>
                          <option value="">—</option>
                          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </Field>
                      <Field label={t("form.propDonor")}>
                        <input type="text" value={prop.donor} onChange={(e) => setProposals((s) => s.map((x) => (x.key === prop.key ? { ...x, donor: e.target.value } : x)))} className={inputCls} />
                      </Field>
                      <Field label={t("form.propStatus")}>
                        <select value={prop.status} onChange={(e) => setProposals((s) => s.map((x) => (x.key === prop.key ? { ...x, status: e.target.value } : x)))} className={inputCls}>
                          {masterData.proposalStatuses.map((x) => <option key={x.code} value={x.code}>{L(x)}</option>)}
                        </select>
                      </Field>
                      <Field label={t("form.propDeadline")}>
                        <input type="text" placeholder="MM/YYYY" value={prop.deadline} onChange={(e) => setProposals((s) => s.map((x) => (x.key === prop.key ? { ...x, deadline: e.target.value } : x)))} className={inputCls} />
                      </Field>
                      <Field label={t("form.propNote")} full>
                        <textarea rows={2} value={prop.note} onChange={(e) => setProposals((s) => s.map((x) => (x.key === prop.key ? { ...x, note: e.target.value } : x)))} className={inputCls + " resize-none"} />
                      </Field>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Step 4: Reports & data updates */}
            {currentStep === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-bold text-white">{t("form.step.reportsdata")}</h2>
                  <button onClick={addReportItem} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm text-white border border-slate-600">
                    <Plus className="w-4 h-4" /> {t("form.addReportItem")}
                  </button>
                </div>
                {reportItems.length === 0 && <EmptyHint text={t("form.noItems")} />}
                {reportItems.map((it) => (
                  <div key={it.key} className={cardCls + " group"}>
                    <RemoveBtn onClick={() => removeReportItem(it.key)} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label={t("form.itemName")}>
                        <input type="text" value={it.itemName} onChange={(e) => setReportItems((s) => s.map((x) => (x.key === it.key ? { ...x, itemName: e.target.value } : x)))} className={inputCls} />
                      </Field>
                      <Field label={t("form.itemType")}>
                        <select value={it.typeCode} onChange={(e) => setReportItems((s) => s.map((x) => (x.key === it.key ? { ...x, typeCode: e.target.value } : x)))} className={inputCls}>
                          {masterData.reportTypes.map((x) => <option key={x.code} value={x.code}>{L(x)}</option>)}
                        </select>
                      </Field>
                      <Field label={t("form.statusUpdate")} full>
                        <textarea rows={2} value={it.statusUpdate} onChange={(e) => setReportItems((s) => s.map((x) => (x.key === it.key ? { ...x, statusUpdate: e.target.value } : x)))} className={inputCls + " resize-none"} />
                      </Field>
                      <Field label={t("form.deadlineAction")} full>
                        <input type="text" value={it.deadlineAction} onChange={(e) => setReportItems((s) => s.map((x) => (x.key === it.key ? { ...x, deadlineAction: e.target.value } : x)))} className={inputCls} />
                      </Field>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Step 5: Communications (fixed 5 channels) */}
            {currentStep === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-2">{t("form.step.comms")}</h2>
                {comms.map((c, i) => {
                  const meta = masterData.commChannels[i];
                  return (
                    <div key={c.channelCode} className={cardCls}>
                      <h3 className="text-base font-bold text-white mb-4">{L(meta)}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field label={t("form.commCount")}>
                          <input type="number" min={0} value={c.count} onChange={(e) => setComms((s) => s.map((x, j) => (j === i ? { ...x, count: e.target.value } : x)))} className={inputCls} />
                        </Field>
                        <Field label={t("form.commThisMonth")} full>
                          <textarea rows={2} value={c.thisMonth} onChange={(e) => setComms((s) => s.map((x, j) => (j === i ? { ...x, thisMonth: e.target.value } : x)))} className={inputCls + " resize-none"} />
                        </Field>
                        <Field label={t("form.commNextMonth")} full>
                          <textarea rows={2} value={c.nextMonth} onChange={(e) => setComms((s) => s.map((x, j) => (j === i ? { ...x, nextMonth: e.target.value } : x)))} className={inputCls + " resize-none"} />
                        </Field>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* Step 6: Issues */}
            {currentStep === 6 && (
              <motion.div key="s6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-bold text-white">{t("form.step.issues")}</h2>
                  <button onClick={addIssue} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm text-white border border-slate-600">
                    <Plus className="w-4 h-4" /> {t("form.addIssue")}
                  </button>
                </div>
                {issues.length === 0 && <EmptyHint text={t("form.noItems")} />}
                {issues.map((x) => (
                  <div key={x.key} className={cardCls + " group"}>
                    <RemoveBtn onClick={() => removeIssue(x.key)} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label={t("form.issueDesc")} full>
                        <textarea rows={2} value={x.description} onChange={(e) => setIssues((s) => s.map((y) => (y.key === x.key ? { ...y, description: e.target.value } : y)))} className={inputCls + " resize-none"} />
                      </Field>
                      <Field label={t("form.site")}>
                        <select value={x.siteCode} onChange={(e) => setIssues((s) => s.map((y) => (y.key === x.key ? { ...y, siteCode: e.target.value } : y)))} className={inputCls}>
                          <option value="">—</option>
                          {masterData.sites.map((s) => <option key={s.code} value={s.code}>{L(s)} ({s.code})</option>)}
                        </select>
                      </Field>
                      <Field label={t("form.issuePic")}>
                        <input type="text" value={x.pic} onChange={(e) => setIssues((s) => s.map((y) => (y.key === x.key ? { ...y, pic: e.target.value } : y)))} className={inputCls} />
                      </Field>
                      <Field label={t("form.actionNeeded")} full>
                        <textarea rows={2} value={x.actionNeeded} onChange={(e) => setIssues((s) => s.map((y) => (y.key === x.key ? { ...y, actionNeeded: e.target.value } : y)))} className={inputCls + " resize-none"} />
                      </Field>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Step 7: Priorities (max 6) */}
            {currentStep === 7 && (
              <motion.div key="s7" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-bold text-white">{t("form.step.priorities")}</h2>
                  <button onClick={addPriority} disabled={priorities.length >= 6} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 px-4 py-2 rounded-lg text-sm text-white border border-slate-600">
                    <Plus className="w-4 h-4" /> {t("form.addPriority")} ({priorities.length}/6)
                  </button>
                </div>
                {priorities.length === 0 && <EmptyHint text={t("form.noItems")} />}
                {priorities.map((x, i) => (
                  <div key={x.key} className={cardCls + " group"}>
                    <RemoveBtn onClick={() => removePriority(x.key)} />
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-8 h-8 rounded-full bg-emerald-500 text-slate-900 font-bold flex items-center justify-center text-sm">{i + 1}</span>
                      <span className="text-sm text-slate-400">{t("form.priorityNo")}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label={t("form.site")}>
                        <select value={x.siteCode} onChange={(e) => setPriorities((s) => s.map((y) => (y.key === x.key ? { ...y, siteCode: e.target.value } : y)))} className={inputCls}>
                          <option value="">—</option>
                          {masterData.sites.map((s) => <option key={s.code} value={s.code}>{L(s)} ({s.code})</option>)}
                        </select>
                      </Field>
                      <Field label={t("form.issueDeadline")}>
                        <input type="text" placeholder="MM/YYYY" value={x.deadline} onChange={(e) => setPriorities((s) => s.map((y) => (y.key === x.key ? { ...y, deadline: e.target.value } : y)))} className={inputCls} />
                      </Field>
                      <Field label={t("form.plannedActivity")} full>
                        <textarea rows={2} value={x.activity} onChange={(e) => setPriorities((s) => s.map((y) => (y.key === x.key ? { ...y, activity: e.target.value } : y)))} className={inputCls + " resize-none"} />
                      </Field>
                      <Field label={t("form.issuePic")}>
                        <input type="text" value={x.pic} onChange={(e) => setPriorities((s) => s.map((y) => (y.key === x.key ? { ...y, pic: e.target.value } : y)))} className={inputCls} />
                      </Field>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Step 8: Deadlines */}
            {currentStep === 8 && (
              <motion.div key="s8" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-bold text-white">{t("form.step.deadlines")}</h2>
                  <button onClick={addDeadline} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm text-white border border-slate-600">
                    <Plus className="w-4 h-4" /> {t("form.addDeadline")}
                  </button>
                </div>
                {deadlines.length === 0 && <EmptyHint text={t("form.noItems")} />}
                {deadlines.map((x) => (
                  <div key={x.key} className={cardCls + " group"}>
                    <RemoveBtn onClick={() => removeDeadline(x.key)} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label={t("form.eventDate")}>
                        <input type="text" placeholder="DD/MM/YYYY" value={x.date} onChange={(e) => setDeadlines((s) => s.map((y) => (y.key === x.key ? { ...y, date: e.target.value } : y)))} className={inputCls} />
                      </Field>
                      <Field label={t("form.siteDonor")}>
                        <input type="text" value={x.siteDonor} onChange={(e) => setDeadlines((s) => s.map((y) => (y.key === x.key ? { ...y, siteDonor: e.target.value } : y)))} className={inputCls} />
                      </Field>
                      <Field label={t("form.eventDesc")} full>
                        <input type="text" value={x.event} onChange={(e) => setDeadlines((s) => s.map((y) => (y.key === x.key ? { ...y, event: e.target.value } : y)))} className={inputCls} />
                      </Field>
                      <Field label={t("form.issuePic")}>
                        <input type="text" value={x.pic} onChange={(e) => setDeadlines((s) => s.map((y) => (y.key === x.key ? { ...y, pic: e.target.value } : y)))} className={inputCls} />
                      </Field>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Step 9: Review & submit */}
            {currentStep === 9 && !done && (
              <motion.div key="s9-confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h2 className="text-2xl font-bold text-white mb-2">{t("form.step.review")}</h2>
                <div className="p-5 bg-slate-800/50 border border-slate-700 rounded-2xl text-sm text-slate-300 space-y-1">
                  <p><b className="text-white font-mono">{reportId}</b> · {month}</p>
                  <p className="text-slate-400">{t("form.step.sites")}: {sites.reduce((n, s) => n + s.activities.length, 0)} {lang === "en" ? "activities" : "hoạt động"}</p>
                  <p className="text-slate-400">{t("form.step.proposals")}: {proposals.length}</p>
                  <p className="text-slate-400">{t("form.step.reportsdata")}: {reportItems.length}</p>
                  <p className="text-slate-400">{t("form.step.issues")}: {issues.length}</p>
                  <p className="text-slate-400">{t("form.step.priorities")}: {priorities.length}</p>
                  <p className="text-slate-400">{t("form.step.deadlines")}: {deadlines.length}</p>
                </div>
              </motion.div>
            )}

            {currentStep === 9 && done && (
              <motion.div key="s9-done" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-center">
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

          {!(currentStep === 9 && done) && (
            <div className="flex justify-between mt-10 pt-6 border-t border-white/10">
              <button onClick={prevStep} className="px-6 py-2.5 rounded-xl font-medium text-slate-300 hover:bg-white/5 transition-colors">
                {t("form.back")}
              </button>
              {currentStep < 9 ? (
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

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="absolute top-4 right-4 p-2 text-red-400 hover:bg-red-400/20 rounded-lg opacity-60 hover:opacity-100 transition-opacity">
      <Trash2 className="w-5 h-5" />
    </button>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="text-center p-8 bg-white/5 border border-white/10 rounded-xl border-dashed">
      <p className="text-slate-400">{text}</p>
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
