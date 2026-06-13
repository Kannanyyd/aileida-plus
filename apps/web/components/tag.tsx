import { cn } from "@/lib/utils";

export function Tag({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning" | "cyan" | "primary";
  className?: string;
}) {
  const styles: Record<string, string> = {
    default: "bg-white/5 text-slate-300 border-white/10",
    success: "bg-success/15 text-success border-success/30",
    danger: "bg-danger/15 text-danger border-danger/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    cyan: "bg-cyan/15 text-cyan border-cyan/30",
    primary: "bg-primary-soft text-primary border-primary/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
