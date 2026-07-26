import { ClipboardList } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { SectionCard, EmptyState } from "@/components/ui";
import { GREENS } from "./types";

type Props = { data: { donor: string; count: number }[]; t: (key: string) => string };

export function ProposalsByDonorChart({ data, t }: Props) {
  return (
    <SectionCard icon={ClipboardList} title={t("dash.chartDonorTitle")} className="lg:col-span-2">
      {data.length ? (
        <ResponsiveContainer width="100%" height={Math.max(140, data.length * 40)}>
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
            <YAxis type="category" dataKey="donor" stroke="#64748b" fontSize={11} width={140} />
            <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 12 }} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => <Cell key={i} fill={GREENS[i % GREENS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState message={t("dash.noData")} />
      )}
    </SectionCard>
  );
}
