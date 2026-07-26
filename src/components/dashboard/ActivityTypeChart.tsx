import { PieChart as PieChartIcon } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Legend, Tooltip, Cell } from "recharts";
import { SectionCard, EmptyState } from "@/components/ui";
import { TYPE_COLORS } from "./types";

type Props = { data: { code: string; label: string; count: number }[]; t: (key: string) => string };

export function ActivityTypeChart({ data, t }: Props) {
  const filtered = data.filter((x) => x.count > 0);
  return (
    <SectionCard icon={PieChartIcon} title={t("dash.chartTypeTitle")}>
      {filtered.length ? (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={filtered} dataKey="count" nameKey="label" innerRadius={50} outerRadius={90} paddingAngle={2}>
              {filtered.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState message={t("dash.noData")} />
      )}
    </SectionCard>
  );
}
