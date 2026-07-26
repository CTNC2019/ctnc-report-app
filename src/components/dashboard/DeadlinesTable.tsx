import { CalendarClock } from "lucide-react";
import { SectionCard, EmptyState, Badge } from "@/components/ui";
import { daysUntil, type DashboardData } from "./types";

type Props = { deadlines: DashboardData["deadlines"]; t: (key: string) => string };

function lang_days(t: (k: string) => string) {
  const s = t("dash.daysUnit");
  return s === "dash.daysUnit" ? "ngày" : s;
}

export function DeadlinesTable({ deadlines, t }: Props) {
  return (
    <SectionCard icon={CalendarClock} iconClassName="text-accent-blue" title={t("dash.deadlinesTitle")}>
      {deadlines.length === 0 ? (
        <EmptyState message={t("dash.noData")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-primary-900 text-white">
                <th className="text-left px-3 py-2 rounded-l-lg font-medium">{t("form.eventDate")}</th>
                <th className="text-left px-3 py-2 font-medium">{t("form.eventDesc")}</th>
                <th className="text-left px-3 py-2 font-medium">{t("form.issuePic")}</th>
                <th className="text-left px-3 py-2 rounded-r-lg"></th>
              </tr>
            </thead>
            <tbody>
              {deadlines.map((d, idx) => {
                const days = daysUntil(d.date);
                return (
                  <tr key={idx} className="border-b border-border-subtle last:border-0">
                    <td className="px-3 py-2.5 text-ink whitespace-nowrap">{d.date}</td>
                    <td className="px-3 py-2.5 text-ink">{d.event}</td>
                    <td className="px-3 py-2.5 text-ink-secondary">{d.pic}</td>
                    <td className="px-3 py-2.5">
                      {days !== null && (
                        <Badge tone={days <= 7 ? "danger" : "success"}>
                          {days < 0 ? t("dash.overdue") : `${days} ${lang_days(t)}`}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
