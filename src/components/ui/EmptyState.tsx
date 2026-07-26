import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon?: LucideIcon;
  message: string;
};

/** Consistent "nothing here yet" placeholder — replaces the plain gray text lines
 *  scattered across tables/lists (`{t("dash.noData")}` etc.) with a calmer, more
 *  intentional empty state. */
export function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      {Icon && <Icon className="w-8 h-8 text-ink-muted mb-3" strokeWidth={1.5} />}
      <p className="text-sm text-ink-muted">{message}</p>
    </div>
  );
}
