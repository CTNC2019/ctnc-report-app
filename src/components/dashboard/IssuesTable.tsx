import { AlertTriangle } from "lucide-react";
import { SectionCard, EmptyState } from "@/components/ui";
import type { DashboardData } from "./types";

type Props = { issues: DashboardData["issues"]; t: (key: string) => string };

export function IssuesTable({ issues, t }: Props) {
  return (
    <SectionCard icon={AlertTriangle} iconClassName="text-danger" title={`${t("dash.issuesTitle")} (${issues.length})`}>
      {issues.length === 0 ? (
        <EmptyState message={t("dash.noData")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-primary-900 text-white">
                <th className="text-left px-3 py-2 rounded-l-lg font-medium">{t("form.issueDesc")}</th>
                <th className="text-left px-3 py-2 font-medium">{t("form.site")}</th>
                <th className="text-left px-3 py-2 rounded-r-lg font-medium">{t("form.issuePic")}</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((i, idx) => (
                <tr key={idx} className="border-b border-border-subtle last:border-0">
                  <td className="px-3 py-2.5 text-ink">{i.description}</td>
                  <td className="px-3 py-2.5 text-ink-secondary">{i.siteCode}</td>
                  <td className="px-3 py-2.5 text-ink-secondary">{i.pic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
