import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
  interactive?: boolean;
};

/** Base surface for every panel on the light theme — replaces the ad-hoc
 *  `bg-white rounded-xl p-6 shadow-sm` (and its dark-theme `bg-white/5` sibling)
 *  that used to be repeated across every page. */
export function Card({ className, padded = true, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-border-subtle rounded-xl shadow-sm",
        padded && "p-6",
        interactive && "transition-all duration-150 hover:shadow-md hover:-translate-y-0.5",
        className
      )}
      {...props}
    />
  );
}
