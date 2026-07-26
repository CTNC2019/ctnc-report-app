"use client";

import { useEffect, useState, use as usePromise } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, FileText, AlertTriangle, CheckCircle, Undo2, Megaphone, ListChecks, CalendarClock, Pencil, Trash2 } from "lucide-react";
import Nav from "@/components/Nav";
import CommentsThread from "@/components/CommentsThread";
import { useLanguage } from "@/context/LanguageContext";
import { useSession } from "@/hooks/useSession";
import { Card, Button, Badge, EmptyState } from "@/components/ui";

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

const STATUS_TONE: Record<string, "neutral" | "info" | "success" | "warning"> = {
  Draft: "neutral",
  Submitted: "info",
  Approved: "success",
  Returned: "warning",
};

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 last:mb-0">
      <h2 className="text-base font-bold text-ink mb-3 flex items-center gap-2">{icon} {title}</h2>
      {children}
    </section>
  );
}

function ItemCard({ children }: { children: React.ReactNode }) {
  return <div className="p-4 bg-canvas border border-border-subtle rounded-xl">{children}</div>;
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
    <div className="min-h-screen bg-canvas">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/reports" className="inline-flex items-center gap-2 text-ink-secondary hover:text-ink mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> {t("reports.title")}
        </Link>

        {!report ? (
          <p className="text-ink-secondary">{t("common.loading")}</p>
        ) : (
          <Card className="p-6 sm:p-8">
            <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-ink font-mono">{report.id}</h1>
                <p className="text-ink-secondary text-sm mt-1.5 flex items-center gap-2 flex-wrap">
                  {report.member} · {report.month} <Badge tone={STATUS_TONE[report.status] || "neutral"}>{t("status." + report.status.toLowerCase())}</Badge>
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {isManager && report.status === "Submitted" && (
                  <>
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => setStatus("Returned")} className="text-amber-700 border-amber-200 bg-warning-soft hover:bg-amber-100">
                      <Undo2 className="w-4 h-4" /> {t("approve.return")}
                    </Button>
                    <Button size="sm" disabled={busy} onClick={() => setStatus("Approved")}>
                      <CheckCircle className="w-4 h-4" /> {t("approve.approve")}
                    </Button>
                  </>
                )}
                {canEdit && (
                  <Link href={`/form?id=${report.id}`}>
                    <Button variant="secondary" size="sm" className="text-accent-blue border-blue-200 bg-info-soft hover:bg-blue-100">
                      <Pencil className="w-4 h-4" /> {t("reports.edit")}
                    </Button>
                  </Link>
                )}
                {canDelete && (
                  <Button variant="danger" size="sm" disabled={busy} onClick={deleteReport}>
                    <Trash2 className="w-4 h-4" /> {t("reports.delete")}
                  </Button>
                )}
              </div>
            </div>

            <Section icon={<MapPin className="w-5 h-5 text-primary-600" />} title={t("form.step.sites")}>
              <div className="space-y-3">
                {report.sites.map((s, i) => (
                  <ItemCard key={i}>
                    <div className="flex justify-between text-sm mb-2">
                      <b className="text-ink">{s.siteCode}</b>
                      <span className="text-ink-secondary">{s.activities.length} hoạt động</span>
                    </div>
                    {s.activities.length > 0 && (
                      <ul className="text-sm text-ink-secondary list-disc list-inside space-y-0.5 mb-2">
                        {s.activities.map((a, ai) => (
                          <li key={ai}>
                            <span className="text-primary-700">{activityLabels[a.activityType] || a.activityType}</span>
                            {a.desc && ` — ${a.desc}`}
                          </li>
                        ))}
                      </ul>
                    )}
                    {s.keyActivities && <p className="text-xs text-ink-muted mt-1">{t("form.keyActivities")}: {s.keyActivities}</p>}
                    {s.keyResults && <p className="text-xs text-ink-muted mt-1">{t("form.keyResults")}: {s.keyResults}</p>}
                    {s.difficulties && <p className="text-xs text-ink-muted mt-1">{t("form.difficulties")}: {s.difficulties}</p>}
                    {s.followUp && <p className="text-xs text-ink-muted mt-1">{t("form.followUp")}: {s.followUp}</p>}
                    {s.plan && <p className="text-xs text-ink-muted">{t("form.plan")}: {s.plan}</p>}
                    {s.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {s.photos.map((p, pi) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={pi} src={p.url} alt={p.caption || "photo"} title={p.caption} className="w-16 h-16 object-cover rounded-lg border border-border-subtle" />
                        ))}
                      </div>
                    )}
                    {s.relatedDocs.length > 0 && (
                      <ul className="text-xs text-primary-700 space-y-0.5 mt-2">
                        {s.relatedDocs.map((d, di) => (
                          <li key={di}>
                            <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary-800">
                              {d.label || d.url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </ItemCard>
                ))}
                {report.sites.length === 0 && <EmptyState message={t("form.noItems")} />}
              </div>
            </Section>

            <Section icon={<FileText className="w-5 h-5 text-accent-blue" />} title={t("form.step.proposals")}>
              <div className="space-y-3">
                {report.proposals.map((p, i) => (
                  <ItemCard key={i}>
                    <div className="flex justify-between text-sm">
                      <b className="text-ink">{p.name}</b>
                      <Badge tone="neutral">{p.status}</Badge>
                    </div>
                    {(p.writerName || p.donor) && (
                      <p className="text-xs text-ink-muted mt-1">
                        {p.writerName && <>{t("form.propWriter")}: {p.writerName}</>}
                        {p.writerName && p.donor && " · "}
                        {p.donor && <>{t("form.propDonor")}: {p.donor}</>}
                      </p>
                    )}
                    {p.note && <p className="text-sm text-ink-secondary mt-1">{p.note}</p>}
                  </ItemCard>
                ))}
                {report.proposals.length === 0 && <EmptyState message={t("form.noItems")} />}
              </div>
            </Section>

            <Section icon={<FileText className="w-5 h-5 text-accent-indigo" />} title={t("form.step.reportsdata")}>
              <div className="space-y-3">
                {report.reportItems.map((r, i) => (
                  <ItemCard key={i}>
                    <div className="flex justify-between text-sm">
                      <b className="text-ink">{r.itemName}</b>
                      <Badge tone="neutral">{r.typeCode}</Badge>
                    </div>
                    {r.statusUpdate && <p className="text-sm text-ink-secondary mt-1">{r.statusUpdate}</p>}
                    {r.deadlineAction && <p className="text-xs text-ink-muted mt-1">{r.deadlineAction}</p>}
                  </ItemCard>
                ))}
                {report.reportItems.length === 0 && <EmptyState message={t("form.noItems")} />}
              </div>
            </Section>

            <Section icon={<Megaphone className="w-5 h-5 text-pink-600" />} title={t("form.step.comms")}>
              <div className="space-y-3">
                {report.comms.filter((c) => Number(c.count) > 0 || c.thisMonth).map((c, i) => (
                  <ItemCard key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <b className="text-ink">{c.channelCode}</b>
                      <span className="text-ink-secondary">{c.count}</span>
                    </div>
                    {c.thisMonth && <p className="text-sm text-ink-secondary">{c.thisMonth}</p>}
                  </ItemCard>
                ))}
                {report.comms.every((c) => !(Number(c.count) > 0 || c.thisMonth)) && <EmptyState message={t("form.noItems")} />}
              </div>
            </Section>

            <Section icon={<AlertTriangle className="w-5 h-5 text-amber-600" />} title={t("form.step.issues")}>
              <div className="space-y-3">
                {report.issues.map((x, i) => (
                  <ItemCard key={i}>
                    <b className="text-ink text-sm">{x.description}</b>
                    <p className="text-xs text-ink-muted mt-1">
                      {x.siteCode && `${x.siteCode} · `}{x.pic && `${t("form.issuePic")}: ${x.pic} · `}{x.actionNeeded}
                    </p>
                  </ItemCard>
                ))}
                {report.issues.length === 0 && <EmptyState message={t("form.noItems")} />}
              </div>
            </Section>

            <Section icon={<ListChecks className="w-5 h-5 text-primary-600" />} title={t("form.step.priorities")}>
              <div className="space-y-3">
                {report.priorities.map((x, i) => (
                  <ItemCard key={i}>
                    <div className="flex gap-2 items-start">
                      <span className="w-6 h-6 shrink-0 rounded-full bg-primary-700 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <div>
                        <b className="text-ink text-sm">{x.activity}</b>
                        <p className="text-xs text-ink-muted mt-1">{x.siteCode && `${x.siteCode} · `}{x.pic && `${x.pic} · `}{x.deadline}</p>
                      </div>
                    </div>
                  </ItemCard>
                ))}
                {report.priorities.length === 0 && <EmptyState message={t("form.noItems")} />}
              </div>
            </Section>

            <Section icon={<CalendarClock className="w-5 h-5 text-accent-blue" />} title={t("form.step.deadlines")}>
              <div className="space-y-3">
                {report.deadlines.map((x, i) => (
                  <ItemCard key={i}>
                    <div className="flex justify-between text-sm">
                      <b className="text-ink">{x.event}</b>
                      <span className="text-ink-secondary">{x.date}</span>
                    </div>
                    <p className="text-xs text-ink-muted mt-1">{x.siteDonor && `${x.siteDonor} · `}{x.pic}</p>
                  </ItemCard>
                ))}
                {report.deadlines.length === 0 && <EmptyState message={t("form.noItems")} />}
              </div>
            </Section>

            {user && <CommentsThread reportId={report.id} currentUserId={user.id} isManager={isManager} />}
          </Card>
        )}
      </main>
    </div>
  );
}
