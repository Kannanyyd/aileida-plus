import { ExternalLink } from "lucide-react";
import { formatCny, formatNativeCny, formatUsd, priceDisplay } from "@/lib/utils";

const FLAG_LABELS: Record<string, string> = {
  aggregator_only: "聚合平台价",
  missing_price_source_url: "缺少来源",
  domestic_price_missing: "暂无国内价",
  preview_or_beta: "预览/测试",
  suspicious_name: "名称待核对",
  source_conflict: "来源冲突",
  currency_estimated_only: "按汇率折算",
  needs_manual_review: "待人工复核",
};

export function PriceValue({
  usd,
  currencyNative,
  nativeCny,
  estimatedCurrency,
  preferCny,
  compact = false,
}: {
  usd: number | null | undefined;
  currencyNative?: string | null;
  nativeCny?: number | null;
  estimatedCurrency?: boolean | null;
  preferCny?: boolean;
  compact?: boolean;
}) {
  const display = priceDisplay({ usd, currencyNative, nativeCny, estimatedCurrency, preferCny });
  return (
    <span className="inline-flex flex-col items-end leading-tight">
      <span className="font-mono text-white">{display.primary}</span>
      {!compact && <span className="mt-0.5 text-[10px] text-slate-500">{display.label}</span>}
      {display.estimated && <span className="mt-0.5 text-[10px] text-warning">仅供参考</span>}
      {!compact && display.secondary !== "-" && <span className="mt-0.5 font-mono text-[10px] text-slate-500">{display.secondary}</span>}
    </span>
  );
}

export function PriceSourceBadges({
  channel,
  isOfficial,
  isAggregator,
  isDomestic,
  currencyNative,
  estimatedCurrency,
  confidence,
  flags = [],
}: {
  channel?: string | null;
  isOfficial?: boolean | null;
  isAggregator?: boolean | null;
  isDomestic?: boolean | null;
  currencyNative?: string | null;
  estimatedCurrency?: boolean | null;
  confidence?: number | null;
  flags?: string[] | null;
}) {
  const normalizedFlags = flags ?? [];
  const confidenceLabel = confidence == null ? "置信度待确认" : `置信度 ${Math.round(confidence * 100)}%`;
  const channelLabel = isOfficial
    ? "官方价"
    : isAggregator
      ? "聚合平台价"
      : channel === "cloud_platform"
        ? "云平台价"
        : "第三方价";

  return (
    <span className="inline-flex flex-wrap gap-1">
      <span className={`rounded px-1.5 py-0.5 text-[10px] ${isOfficial ? "bg-success/10 text-success" : isAggregator ? "bg-orange-500/10 text-orange-300" : "bg-cyan/10 text-cyan"}`}>
        {channelLabel}
      </span>
      {isDomestic && <span className="rounded bg-cyan/10 px-1.5 py-0.5 text-[10px] text-cyan">国内可用</span>}
      {currencyNative === "CNY" ? (
        <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] text-success">国内价</span>
      ) : estimatedCurrency ? (
        <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">按美元折算</span>
      ) : (
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">海外价</span>
      )}
      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">{confidenceLabel}</span>
      {normalizedFlags.slice(0, 3).map((flag) => (
        <span key={flag} className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning">
          {FLAG_LABELS[flag] ?? flag}
        </span>
      ))}
    </span>
  );
}

export function SourceLink({ href, label = "来源" }: { href?: string | null; label?: string }) {
  if (!href || href === "unknown") return <span className="text-[10px] text-warning">来源待确认</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export function formatNativeOrUsd(args: {
  usd: number | null | undefined;
  currencyNative?: string | null;
  nativeCny?: number | null;
  preferCny?: boolean;
}) {
  if (args.currencyNative === "CNY" && args.nativeCny != null) return formatNativeCny(args.nativeCny);
  if (args.preferCny) return `约 ${formatCny(args.usd)}`;
  return formatUsd(args.usd);
}
