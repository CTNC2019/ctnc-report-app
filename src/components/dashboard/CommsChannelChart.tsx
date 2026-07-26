import { Megaphone } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from "recharts";
import type { RenderableText } from "recharts/types/component/Text";
import { SectionCard } from "@/components/ui";
import { COMM_COLORS } from "./types";

type Props = {
  commsChannels: { code: string; label: string; count: number }[];
  commsTrend: { startDate: string; endDate: string; label: string; channels: Record<string, number> }[];
  t: (key: string) => string;
};

export function CommsChannelChart({ commsChannels, commsTrend, t }: Props) {
  const trendData = commsTrend.map((pt) => {
    const row: Record<string, string | number> = { label: pt.label };
    commsChannels.forEach((c) => (row[c.code] = pt.channels[c.code] || 0));
    return row;
  });

  return (
    <SectionCard icon={Megaphone} title={t("dash.chartCommsTitle")}>
      {/* Compact by design (per user feedback: previous version felt too wide/sprawling
          for a quick overview) — reduced height and tighter bars, with a data label
          inside each stacked segment so exact counts are readable without hovering. */}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={trendData} margin={{ left: -20, top: 8 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
          <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} width={28} />
          <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {commsChannels.map((c, i) => (
            <Bar key={c.code} dataKey={c.code} name={c.label} stackId="comm" fill={COMM_COLORS[i % COMM_COLORS.length]}>
              <LabelList dataKey={c.code} position="inside" fontSize={9} fill="#fff" formatter={(v: RenderableText): RenderableText => (Number(v) > 0 ? String(v) : "")} />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}
