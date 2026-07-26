import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const VARIANT_CLS: Record<Variant, string> = {
  primary: "bg-primary-700 text-white hover:bg-primary-800 shadow-sm shadow-primary-900/10",
  secondary: "bg-white text-ink border border-border-subtle hover:bg-canvas",
  ghost: "bg-transparent text-ink-secondary hover:bg-canvas hover:text-ink",
  danger: "bg-danger-soft text-danger hover:bg-red-200 border border-red-200",
};

const SIZE_CLS: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5 rounded-lg",
  md: "text-sm px-5 py-2.5 gap-2 rounded-xl",
};

/** Shared button — consolidates the many hand-rolled button classNames that were
 *  duplicated across Dashboard/Reports/Members/Approve/Form into one place. */
export function Button({ variant = "primary", size = "md", className, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANT_CLS[variant],
        SIZE_CLS[size],
        className
      )}
      disabled={disabled}
      {...props}
    />
  );
}
