"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, FileText, AlertTriangle, CheckCircle, Undo2, Megaphone, ListChecks, CalendarClock, Pencil, Trash2 } from "lucide-react";
import Nav from "@/components/Nav";
import CommentsThread from "@/components/CommentsThread";
import { useLanguage } from "@/context/LanguageContext";
import { useSession } from "@/hooks/useSession";

type Activity = { activityType: string; desc: string };
type SiteEntry = {
  siteCode: string;
  activities: Activity[];
  keyActivities: string;
  keyResults: string;
  difficulties: string;
  followUp: string;
  plan: string;
  photos: { url: string; caption: string }[];
  relatedDocs: { url: string; label: string }[];
};
type ReportDetail = {
  id: string;
  userId: string;
  member: string;
  month: string;
  status: string;
  sites: SiteEntry[];
  proposals: { name: string; writer: string; writerName: string; donor: string; status: string; deadline: string; note: string }[];
  reportItems: { itemName: string; typeCode: string; statusUpdate: string; deadlineAction: string }[];
  comms: { channelCode: string; count: string; thisMonth: string; nextMonth: string }[];
  issues: { siteCode: string; description: string; actionNeeded: string; pic: string }[];
  priorities: { siteCode: string; activity: string; pic: string; deadline: string }[];
  deadlines: { date: string; event: string; siteDonor: string; pic: string }[];
};



function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">{icon} {title}</h2>
      {children}
    </section>
  );
}

export default function ReportView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const { t } = useLanguage();
  const router = useRouter();
  const { user, isManager, isAdmin } = useSession();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [busy, setBusy] = useState(false);
  // Sheet-driven activity-type labels (see /api/master-data) — code -> display name.
  const [activityLabels, setActivityLabels] = useState<Record<string, string>>({});

  function load() {
    fetch(`/api/reports/${id}`)
      .then((r) => r.json())
      .then((d) => setReport(d.report || null));
  }
  useEffect(load, [id]);

  useEffect(() => {
    fetch("/api/master-data")
      .then((r) => r.json())
      .then((d: { activityTypes: { code: string; vi: string; en: string }[] }) => {
        const map: Record<string, string> = {};
        (d.activityTypes || []).forEach((x) => (map[x.code] = x.vi));
        setActivityLabels(map);
      });
  }, []);

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

  // Same rules as the reports list: owner can always edit their own report (an edit
  // naturally moves an Approved/Submitted report back into the review pipeline once
  // saved); owner can only delete while still a Draft; Admin can do either, anytime.
  // Owner can always edit their own report; Manager/Admin can edit and approve anyone's.
  const canEdit = !!report && (report.userId === user?.id || isManager);
  const canDelete = !!report && (isAdmin || (report.userId === user?.id && report.status === "Draft"));

  async function deleteReport() {
    if (!report) return;
    if (!confirm(t("reports.deleteConfirm"))) return;
    setBusy(true);
    const res = await fetch(`/api/reports/${report.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.push("/reports");
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error === "forbidden" ? t("reports.deleteForbidden") : data.error || "Error");
    }
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
              <div className="flex gap-2 flex-wrap">
                {isManager && report.status === "Submitted" && (
                  <>
                    <button disabled={busy} onClick={() => setStatus("Returned")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-medium disabled:opacity-50">
                      <Undo2 className="w-4 h-4" /> {t("approve.return")}
                    </button>
                    <button disabled={busy} onClick={() => setStatus("Approved")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-bold disabled:opacity-50">
                      <CheckCircle className="w-4 h-4" /> {t("approve.approve")}
                    </button>
                  </>
                )}
                {canEdit && (
                  <Link href={`/form?id=${report.id}`} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-medium">
                    <Pencil className="w-4 h-4" /> {t("reports.edit")}
                  </Link>
                )}
                {canDelete && (
                  <button disabled={busy} onClick={deleteReport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium disabled:opacity-50">
                    <Trash2 className="w-4 h-4" /> {t("reports.delete")}
                  </button>
                )}
              </div>
            </div>

            <Section icon={<MapPin className="w-5 h-5 text-emerald-400" />} title={t("form.step.sites")}>
              <div className="space-y-3">
                {report.sites.map((s, i) => (
                  <div key={i} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <div className="flex justify-between text-sm mb-2">
                      <b className="text-white">{s.siteCode}</b>
                      <span className="text-slate-400">{s.activities.length} hoạt động</span>
                    </div>
                    {s.activities.length > 0 && (
                      <ul className="text-sm text-slate-300 list-disc list-inside space-y-0.5 mb-2">
                        {s.activities.map((a, ai) => (
                          <li key={ai}>
                            <span className="text-emerald-300">{activityLabels[a.activityType] || a.activityType}</span>
                            {a.desc && ` — ${a.desc}`}
                          </li>
                        ))}
                      </ul>
                    )}
                    {s.keyActivities && <p className="text-xs text-slate-500 mt-1">{t("form.keyActivities")}: {s.keyActivities}</p>}
                    {s.keyResults && <p className="text-xs text-slate-500 mt-1">{t("form.keyResults")}: {s.keyResults}</p>}
                    {s.difficulties && <p className="text-xs text-slate-500 mt-1">{t("form.difficulties")}: {s.difficulties}</p>}
                    {s.followUp && <p className="text-xs text-slate-500 mt-1">{t("form.followUp")}: {s.followUp}</p>}
                    {s.plan && <p className="text-xs text-slate-500">{t("form.plan")}: {s.plan}</p>}
                    {s.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {s.photos.map((p, pi) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={pi} src={p.url} alt={p.caption || "photo"} title={p.caption} className="w-16 h-16 object-cover rounded-lg border border-white/10" />
                        ))}
                      </div>
                    )}
                    {s.relatedDocs.length > 0 && (
                      <ul className="text-xs text-emerald-300 space-y-0.5 mt-2">
                        {s.relatedDocs.map((d, di) => (
                          <li key={di}>
                            <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-emerald-200">
                              {d.label || d.url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                {report.sites.length === 0 && <p className="text-sm text-slate-500">{t("form.noItems")}</p>}
              </div>
            </Section>

            <Section icon={<FileText className="w-5 h-5 text-blue-400" />} title={t("form.step.proposals")}>
              <div className="space-y-3">
                {report.proposals.map((p, i) => (
                  <div key={i} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <div className="flex justify-between text-sm">
                      <b className="text-white">{p.name}</b>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">{p.status}</span>
                    </div>
                    {(p.writerName || p.donor) && (
                      <p className="text-xs text-slate-500 mt-1">
                        {p.writerName && <>{t("form.propWriter")}: {p.writerName}</>}
                        {p.writerName && p.donor && " · "}
                        {p.donor && <>{t("form.propDonor")}: {p.donor}</>}
                      </p>
                    )}
                    {p.note && <p className="text-sm text-slate-400 mt-1">{p.note}</p>}
                  </div>
                ))}
                {report.proposals.length === 0 && <p className="text-sm text-slate-500">{t("form.noItems")}</p>}
              </div>
            </Section>

            <Section icon={<FileText className="w-5 h-5 text-purple-400" />} title={t("form.step.reportsdata")}>
              <div className="space-y-3">
                {report.reportItems.map((r, i) => (
                  <div key={i} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <div className="flex justify-between text-sm">
                      <b className="text-white">{r.itemName}</b>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">{r.typeCode}</span>
                    </div>
                    {r.statusUpdate && <p className="text-sm text-slate-400 mt-1">{r.statusUpdate}</p>}
                    {r.deadlineAction && <p className="text-xs text-slate-500 mt-1">{r.deadlineAction}</p>}
                  </div>
                ))}
                {report.reportItems.length === 0 && <p className="text-sm text-slate-500">{t("form.noItems")}</p>}
              </div>
            </Section>

            <Section icon={<Megaphone className="w-5 h-5 text-pink-400" />} title={t("form.step.comms")}>
              <div className="space-y-3">
                {report.comms.filter((c) => Number(c.count) > 0 || c.thisMonth).map((c, i) => (
                  <div key={i} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <div className="flex justify-between text-sm mb-1">
                      <b className="text-white">{c.channelCode}</b>
                      <span className="text-slate-400">{c.count}</span>
                    </div>
                    {c.thisMonth && <p className="text-sm text-slate-400">{c.thisMonth}</p>}
                  </div>
                ))}
                {report.comms.every((c) => !(Number(c.count) > 0 || c.thisMonth)) && <p className="text-sm text-slate-500">{t("form.noItems")}</p>}
              </div>
            </Section>

            <Section icon={<AlertTriangle className="w-5 h-5 text-amber-400" />} title={t("form.step.issues")}>
              <div className="space-y-3">
                {report.issues.map((x, i) => (
                  <div key={i} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <b className="text-white text-sm">{x.description}</b>
                    <p className="text-xs text-slate-500 mt-1">
                      {x.siteCode && `${x.siteCode} · `}{x.pic && `${t("form.issuePic")}: ${x.pic} · `}{x.actionNeeded}
                    </p>
                  </div>
                ))}
                {report.issues.length === 0 && <p className="text-sm text-slate-500">{t("form.noItems")}</p>}
              </div>
            </Section>

            <Section icon={<ListChecks className="w-5 h-5 text-emerald-400" />} title={t("form.step.priorities")}>
              <div className="space-y-3">
                {report.priorities.map((x, i) => (
                  <div key={i} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <div className="flex gap-2 items-start">
                      <span className="w-6 h-6 shrink-0 rounded-full bg-emerald-500 text-slate-900 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <div>
                        <b className="text-white text-sm">{x.activity}</b>
                        <p className="text-xs text-slate-500 mt-1">{x.siteCode && `${x.siteCode} · `}{x.pic && `${x.pic} · `}{x.deadline}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {report.priorities.length === 0 && <p className="text-sm text-slate-500">{t("form.noItems")}</p>}
              </div>
            </Section>

            <Section icon={<CalendarClock className="w-5 h-5 text-sky-400" />} title={t("form.step.deadlines")}>
              <div className="space-y-3">
                {report.deadlines.map((x, i) => (
                  <div key={i} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <div className="flex justify-between text-sm">
                      <b className="text-white">{x.event}</b>
                      <span className="text-slate-400">{x.date}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{x.siteDonor && `${x.siteDonor} · `}{x.pic}</p>
                  </div>
                ))}
                {report.deadlines.length === 0 && <p className="text-sm text-slate-500">{t("form.noItems")}</p>}
              </div>
            </Section>

            {user && <CommentsThread reportId={report.id} currentUserId={user.id} isManager={isManager} />}
          </div>
        )}
      </main>
    </div>
  );
}
