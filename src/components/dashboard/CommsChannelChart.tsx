import { Megaphone } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { SectionCard } from "@/components/ui";
import { COMM_COLORS } from "./types";

type Props = {
  commsChannels: { code: string; label: string; count: number }[];
  commsTrend: { month: string; channels: Record<string, number> }[];
  t: (key: string) => string;
};

export function CommsChannelChart({ commsChannels, commsTrend, t }: Props) {
  const trendData = commsTrend.map((pt) => {
    const row: Record<string, string | number> = { month: pt.month };
    commsChannels.forEach((c) => (row[c.code] = pt.channels[c.code] || 0));
    return row;
  });

  return (
    <SectionCard icon={Megaphone} title={t("dash.chartCommsTitle")}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={trendData} margin={{ left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
          <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
          <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {commsChannels.map((c, i) => (
            <Bar key={c.code} dataKey={c.code} name={c.label} stackId="comm" fill={COMM_COLORS[i % COMM_COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}
