import { ClipboardList } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { SectionCard } from "@/components/ui";
import { COMM_COLORS } from "./types";

type Props = { data: { status: string; label: string; count: number }[]; t: (key: string) => string };

export function ProposalPipelineChart({ data, t }: Props) {
  return (
    <SectionCard icon={ClipboardList} title={t("dash.chartProposalsTitle")}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
          <YAxis type="category" dataKey="label" stroke="#64748b" fontSize={11} width={110} />
          <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 12 }} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COMM_COLORS[i % COMM_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  );
}
