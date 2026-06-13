import { cn } from "@/lib/utils";

const VARIANT: Record<string, string> = {
  official: "bg-success/15 text-success border-success/30",
  "multi-source": "bg-primary-soft text-primary border-primary/30",
  "third-party": "bg-warning/15 text-warning border-warning/30",
  review: "bg-orange-500/15 text-orange-300 border-orange-400/30",
  stale: "bg-danger/15 text-danger border-danger/30",
};

const LABEL: Record<string, string> = {
  official: "官方确认",
  "multi-source": "多源验证",
  "third-party": "第三方参考",
  review: "待人工复核",
  stale: "可能过期",
};

export function ConfidenceBadge({
  variant,
  className,
}: {
  variant: keyof typeof VARIANT;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border",
        VARIANT[variant],
        className,
      )}
    >
      {LABEL[variant]}
    </span>
  );
}
