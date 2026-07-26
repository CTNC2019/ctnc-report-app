import type { LucideIcon } from "lucide-react";

type PageHeaderProps = {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

/** Consistent page title block — icon + title + subtitle on the left, action
 *  buttons on the right. Every top-level page (Dashboard, Reports, Members,
 *  Approve, Profile) previously hand-rolled this same flex layout. */
export function PageHeader({ icon: Icon, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-end mb-8 flex-wrap gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-1.5 flex items-center gap-3">
          {Icon && <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary-700" />}
          {title}
        </h1>
        {subtitle && <p className="text-ink-secondary text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
    </div>
  );
}
