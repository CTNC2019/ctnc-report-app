import { cn } from "@/lib/utils";

/** Loading placeholder — replaces the bare "Đang tải..." text with a shape that
 *  hints at the content about to appear, reducing perceived load time. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-slate-200/70 rounded-lg", className)} />;
}
