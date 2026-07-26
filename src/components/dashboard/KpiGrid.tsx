import { FileText, Percent, ClipboardList, Clock, Megaphone, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/ui";
import type { DashboardData } from "./types";

type Props = { kpi: DashboardData["kpi"]; t: (key: string) => string };

/** The 6 top-line KPI tiles. Values/labels are unchanged from the original inline
 *  block — only extracted into its own component and given a mount animation. */
export function KpiGrid({ kpi, t }: Props) {
  const items = [
    { label: t("dash.stat.reports"), value: kpi.reportsThisMonth, color: "#1B5E20", icon: FileText },
    { label: `${t("dash.completionRate")} (%)`, value: `${kpi.completionRate}%`, color: "#0D47A1", icon: Percent },
    { label: t("dash.stat.activities"), value: kpi.activitiesCompleted, color: "#2E7D32", icon: ClipboardList },
    { label: t("dash.stat.proposals"), value: kpi.activeProposals, color: "#F9A825", icon: Clock },
    { label: t("dash.stat.comms"), value: kpi.commsOutputs, color: "#5C6BC0", icon: Megaphone },
    { label: t("dash.stat.issues"), value: kpi.issuesNeedingSupport, color: "#C62828", icon: AlertTriangle },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {items.map((item, i) => (
        <StatCard key={item.label} {...item} index={i} />
      ))}
    </div>
  );
}
