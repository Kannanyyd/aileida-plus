/**
 * 使用量
 */
export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens?: number;
  audio_input_tokens?: number;
  audio_output_tokens?: number;
  image_count?: number;
  video_seconds?: number;
  calls?: number;
}

export interface CostBreakdownItem {
  label: string;
  amount_usd: number;
  formula: string;
}

export interface CostEstimate {
  model_id: string;
  provider_id: string;
  total_usd: number;
  breakdown: CostBreakdownItem[];
  effective_unit_input: number;
  effective_unit_output: number;
}

/**
 * 阶梯计费
 */
export function applyTiered(
  tokens: number,
  unit: number,
  rules?: Array<{ up_to?: number; input_per_1m?: number; output_per_1m?: number }> | null,
  kind: "input" | "output" = "input",
): number {
  if (!rules || rules.length === 0) return (tokens / 1_000_000) * unit;
  const sorted = [...rules].sort((a, b) => (a.up_to ?? 0) - (b.up_to ?? 0));
  let remaining = tokens;
  let consumed = 0;
  let total = 0;
  for (const rule of sorted) {
    if (remaining <= 0) break;
    const cap = (rule.up_to ?? 0) - consumed;
    const take = Math.min(remaining, cap);
    const price = kind === "input" ? (rule.input_per_1m ?? 0) : (rule.output_per_1m ?? 0);
    total += (take / 1_000_000) * price;
    remaining -= take;
    consumed += take;
  }
  // 超出最高档时，按最后一档价格
  if (remaining > 0) {
    const last = sorted[sorted.length - 1];
    const price = kind === "input" ? (last.input_per_1m ?? 0) : (last.output_per_1m ?? 0);
    total += (remaining / 1_000_000) * price;
  }
  return total;
}

/**
 * 缓存命中折扣
 */
export function applyCache(
  inputTokens: number,
  cachedTokens: number | undefined,
  inputPer1m: number,
  cachedReadPer1m: number | undefined,
): { cost: number; effectivePer1m: number } {
  if (!cachedTokens || cachedTokens <= 0 || cachedReadPer1m == null) {
    return { cost: (inputTokens / 1_000_000) * inputPer1m, effectivePer1m: inputPer1m };
  }
  const cached = Math.min(cachedTokens, inputTokens);
  const fresh = Math.max(0, inputTokens - cached);
  const cost = (fresh / 1_000_000) * inputPer1m + (cached / 1_000_000) * cachedReadPer1m;
  const effectivePer1m = inputTokens > 0 ? (cost * 1_000_000) / inputTokens : inputPer1m;
  return { cost, effectivePer1m };
}

/**
 * 批量折扣
 */
export function applyBatch(cost: number, batchDiscount?: number): number {
  if (batchDiscount == null) return cost;
  return cost * batchDiscount;
}
