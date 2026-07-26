import Link from "next/link";
import { Users } from "lucide-react";
import { SectionCard, Badge } from "@/components/ui";
import { initials, type MemberStatus } from "./types";

type Props = { members: MemberStatus[]; t: (key: string) => string };

const TONE_BY_STATUS: Record<MemberStatus["status"], "neutral" | "info" | "success" | "warning" | "danger"> = {
  Draft: "neutral",
  Submitted: "info",
  Approved: "success",
  Returned: "warning",
  Missing: "danger",
};

export function MemberStatusGrid({ members, t }: Props) {
  const submittedCount = members.filter((m) => m.status !== "Missing").length;

  return (
    <SectionCard
      icon={Users}
      title={t("dash.membersTitle")}
      className="mb-6"
      trailing={
        <Badge tone="success">
          {submittedCount}/{members.length} {t("dash.submitted")}
        </Badge>
      }
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map((m) => {
          const statusLabel = t("status." + m.status.toLowerCase());
          const pill = <Badge tone={TONE_BY_STATUS[m.status]}>{statusLabel}</Badge>;
          return (
            <div key={m.userId} className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-border-subtle">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-primary-50 text-primary-800">
                {initials(m.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{m.name}</p>
                <p className="text-xs text-ink-secondary">{m.userId} · {m.totalActs} HĐ</p>
              </div>
              {m.reportId ? (
                <Link href={`/reports/${m.reportId}`} className="flex-shrink-0">{pill}</Link>
              ) : (
                pill
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
