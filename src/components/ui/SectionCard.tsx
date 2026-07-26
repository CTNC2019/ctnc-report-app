import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";
import { cn } from "@/lib/utils";

type SectionCardProps = {
  icon?: LucideIcon;
  iconClassName?: string;
  title: string;
  trailing?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

/** Card with a standard icon + title header — the chart/table panels on Dashboard
 *  (and similar sectioned panels elsewhere) previously repeated this exact
 *  `<h2><Icon/>{title}</h2>` block by hand in every panel. */
export function SectionCard({ icon: Icon, iconClassName, title, trailing, className, children }: SectionCardProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle flex-wrap gap-2">
        <h2 className="text-sm font-bold text-ink flex items-center gap-2">
          {Icon && <Icon className={cn("w-4 h-4 text-primary-700", iconClassName)} />}
          {title}
        </h2>
        {trailing}
      </div>
      {children}
    </Card>
  );
}
