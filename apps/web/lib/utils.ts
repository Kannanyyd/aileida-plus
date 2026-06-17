import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsd(per1m: number | null | undefined): string {
  if (per1m == null) return "-";
  if (per1m < 0.01) return `$${per1m.toFixed(4)}`;
  if (per1m < 1) return `$${per1m.toFixed(3)}`;
  return `$${per1m.toFixed(2)}`;
}

export function formatNativeCny(value: number | null | undefined): string {
  if (value == null) return "-";
  if (value < 0.01) return `¥${value.toFixed(4)}`;
  if (value < 1) return `¥${value.toFixed(3)}`;
  return `¥${value.toFixed(2)}`;
}

export function formatCny(usdPer1m: number | null | undefined, rate = 7.18): string {
  if (usdPer1m == null) return "-";
  return formatNativeCny(usdPer1m * rate);
}

export function priceDisplay(input: {
  usd: number | null | undefined;
  currencyNative?: string | null;
  nativeCny?: number | null;
  estimatedCurrency?: boolean | null;
  preferCny?: boolean;
}) {
  if (input.currencyNative === "CNY" && input.nativeCny != null) {
    return {
      primary: formatNativeCny(input.nativeCny),
      secondary: formatUsd(input.usd),
      label: "国内价",
      estimated: false,
    };
  }
  if (input.preferCny || input.estimatedCurrency) {
    return {
      primary: formatCny(input.usd),
      secondary: formatUsd(input.usd),
      label: "按美元折算",
      estimated: true,
    };
  }
  return {
    primary: formatUsd(input.usd),
    secondary: input.usd == null ? "-" : formatCny(input.usd),
    label: "海外价",
    estimated: false,
  };
}

export function formatContext(tokens: number | null | undefined): string {
  if (tokens == null) return "-";
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
  return `${tokens}`;
}

export function relativeTime(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const diff = Date.now() - new Date(d).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec} 秒前`;
  if (sec < 3600) return `${Math.floor(sec / 60)} 分钟前`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} 小时前`;
  return `${Math.floor(sec / 86400)} 天前`;
}
