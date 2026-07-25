"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, FileText, AlertTriangle, CheckCircle, Undo2 } from "lucide-react";
import Nav from "@/components/Nav";
import { useLanguage } from "@/context/LanguageContext";
import { useSession } from "@/hooks/useSession";

type ReportDetail = {
  id: string;
  userId: string;
  member: string;
  month: string;
  status: string;
  siteUpdates: { siteCode: string; numActs: string; desc: string; results: string; plan: string }[];
  proposals: { name: string; status: string; deadline: string; note: string }[];
  issues: { type: string; siteCode: string; description: string; pic: string; deadline: string }[];
};

const PROP_STATUS: Record<string, string> = { S: "Successful", U: "Unsuccessful", W: "Writing", R: "Needs review" };

export default function ReportView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const { t } = useLanguage();
  const { isManager } = useSession();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch(`/api/reports/${id}`)
      .then((r) => r.json())
      .then((d) => setReport(d.report || null));
  }
  useEffect(load, [id]);

  async function setStatus(status: "Approved" | "Returned") {
    if (status === "Returned" && !confirm(t("approve.confirmReturn"))) return;
    setBusy(true);
    await fetch(`/api/reports/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    load();
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/reports" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> {t("reports.title")}
        </Link>

        {!report ? (
          <p className="text-slate-400">{t("common.loading")}</p>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
            <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white font-mono">{report.id}</h1>
                <p className="text-slate-400 text-sm mt-1">
                  {report.member} · {report.month} · <span className="text-slate-300">{t("status." + report.status.toLowerCase())}</span>
                </p>
              </div>
              {isManager && report.status === "Submitted" && (
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    onClick={() => setStatus("Returned")}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-medium disabled:opacity-50"
                  >
                    <Undo2 className="w-4 h-4" /> {t("approve.return")}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => setStatus("Approved")}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-bold disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" /> {t("approve.approve")}
                  </button>
                </div>
              )}
            </div>

            <section className="mb-6">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-400" /> {t("form.step2")}</h2>
              <div className="space-y-3">
                {report.siteUpdates.map((s, i) => (
                  <div key={i} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <div className="flex justify-between text-sm mb-1">
                      <b className="text-white">{s.siteCode}</b>
                      <span className="text-slate-400">{s.numActs} {t("form.numActs").toLowerCase()}</span>
                    </div>
                    {s.desc && <p className="text-sm text-slate-300">{s.desc}</p>}
                    {s.results && <p className="text-xs text-slate-500 mt-1">{t("form.results")}: {s.results}</p>}
                    {s.plan && <p className="text-xs text-slate-500">{t("form.plan")}: {s.plan}</p>}
                  </div>
                ))}
                {report.siteUpdates.length === 0 && <p className="text-sm text-slate-500">{t("form.noItems")}</p>}
              </div>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-400" /> {t("form.step3")}</h2>
              <div className="space-y-3">
                {report.proposals.map((p, i) => (
                  <div key={i} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <div className="flex justify-between text-sm">
                      <b className="text-white">{p.name}</b>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">{PROP_STATUS[p.status] || p.status}</span>
                    </div>
                    {p.note && <p className="text-sm text-slate-400 mt-1">{p.note}</p>}
                  </div>
                ))}
                {report.proposals.length === 0 && <p className="text-sm text-slate-500">{t("form.noItems")}</p>}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-400" /> {t("form.step4")}</h2>
              <div className="space-y-3">
                {report.issues.map((x, i) => (
                  <div key={i} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <div className="flex justify-between text-sm">
                      <b className="text-white">{x.description}</b>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        {x.type === "Priority" ? t("form.issueType.priority") : t("form.issueType.issue")}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {x.siteCode && `${x.siteCode} · `}{x.pic && `${t("form.issuePic")}: ${x.pic} · `}{x.deadline}
                    </p>
                  </div>
                ))}
                {report.issues.length === 0 && <p className="text-sm text-slate-500">{t("form.noItems")}</p>}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
