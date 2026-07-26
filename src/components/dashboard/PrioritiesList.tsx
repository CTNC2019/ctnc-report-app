import { Flag } from "lucide-react";
import { SectionCard, EmptyState } from "@/components/ui";
import type { DashboardData } from "./types";

type Props = { priorities: DashboardData["priorities"]; t: (key: string) => string };

export function PrioritiesList({ priorities, t }: Props) {
  return (
    <SectionCard icon={Flag} iconClassName="text-accent-blue" title={`${t("dash.prioritiesTitle")} (${priorities.length})`}>
      {priorities.length === 0 ? (
        <EmptyState message={t("dash.noData")} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {priorities.map((p, idx) => (
            <div key={idx} className="p-3 rounded-xl border border-border-subtle bg-canvas text-xs flex gap-2">
              <span className="w-5 h-5 shrink-0 rounded-full text-white text-[10px] font-bold flex items-center justify-center bg-primary-900">
                {p.priorityNo}
              </span>
              <div>
                <p className="text-ink">{p.activity}</p>
                <p className="text-ink-secondary mt-0.5">{p.siteCode && `${p.siteCode} · `}{p.pic}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
