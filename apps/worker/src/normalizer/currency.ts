/**
 * 货币归一化：将各种货币/单位的价格统一为 USD / 1M tokens
 */
const FX_USD = {
  USD: 1,
  CNY: 0.139, // ≈ 1 / 7.18
  EUR: 1.08,
  JPY: 0.0066,
  GBP: 1.27,
};

export function toUsdPer1M(
  amount: number,
  unit: "per_1m" | "per_1k" | "per_token" | "per_call" | "per_image" | "per_second",
  currency: string,
): number {
  const upper = currency.toUpperCase();
  const fx = (FX_USD as Record<string, number>)[upper];
  if (fx == null) {
    // 未知币种，原样返回（让下游进 review）
    return amount;
  }
  const usd = amount * fx;
  switch (unit) {
    case "per_1m":
      return usd;
    case "per_1k":
      return usd * 1000;
    case "per_token":
      return usd * 1_000_000;
    case "per_call":
    case "per_image":
    case "per_second":
      return usd;
  }
}
