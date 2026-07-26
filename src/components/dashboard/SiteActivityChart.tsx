import { MapPin } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { SectionCard } from "@/components/ui";
import { CHART_PALETTE } from "./types";

type Props = { data: { code: string; name: string; totalActs: number }[]; t: (key: string) => string };

export function SiteActivityChart({ data, t }: Props) {
  return (
    <SectionCard icon={MapPin} title={t("dash.chartSiteTitle")}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ left: -20, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" stroke="#64748b" fontSize={11} interval={0} angle={-35} textAnchor="end" height={70} />
          <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
          <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 12 }} />
          <Bar dataKey="totalActs" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}
