import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const TONE_CLS: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  info: "bg-info-soft text-accent-blue",
  success: "bg-success-soft text-primary-800",
  warning: "bg-warning-soft text-amber-700",
  danger: "bg-danger-soft text-danger",
};

/** Small status pill — used for report status, active/inactive, deadline urgency, etc.
 *  Centralizes the STATUS_STYLE maps that were previously redefined per-page. */
export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full", TONE_CLS[tone], className)}
      {...props}
    />
  );
}
