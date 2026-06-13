import type { Pricing } from "../schema/index";
import type { Usage, CostEstimate, CostBreakdownItem } from "./token-cost";
import { applyCache, applyTiered, applyBatch } from "./token-cost";

/**
 * 计算一个 usage 在某 pricing 下的总成本
 */
export function estimateCost(
  pricing: Pricing,
  usage: Usage,
  options: { useBatch?: boolean; useTiered?: boolean } = {},
): CostEstimate {
  const { useBatch = false, useTiered = true } = options;
  const breakdown: CostBreakdownItem[] = [];

  // 1) 输入
  let inputCost = 0;
  if (useTiered && pricing.tiered_rules && pricing.tiered_rules.length > 0) {
    inputCost = applyTiered(usage.input_tokens, pricing.input_per_1m_usd, pricing.tiered_rules, "input");
    breakdown.push({
      label: "输入 token（阶梯）",
      amount_usd: inputCost,
      formula: `tiered × ${usage.input_tokens} tokens`,
    });
  } else {
    const { cost, effectivePer1m } = applyCache(
      usage.input_tokens,
      usage.cached_input_tokens,
      pricing.input_per_1m_usd,
      pricing.input_cached_read_per_1m_usd,
    );
    inputCost = cost;
    breakdown.push({
      label: "输入 token（含缓存）",
      amount_usd: inputCost,
      formula: `~$${effectivePer1m.toFixed(4)} / 1M effective`,
    });
  }

  // 2) 输出
  const outputCost = applyTiered(
    usage.output_tokens,
    pricing.output_per_1m_usd,
    pricing.tiered_rules,
    "output",
  );
  breakdown.push({
    label: "输出 token",
    amount_usd: outputCost,
    formula: `$${pricing.output_per_1m_usd} / 1M × ${usage.output_tokens}`,
  });

  let total = inputCost + outputCost;

  // 3) 音频
  if (usage.audio_input_tokens && pricing.audio_input_per_1m_usd) {
    const c = (usage.audio_input_tokens / 1_000_000) * pricing.audio_input_per_1m_usd;
    total += c;
    breakdown.push({ label: "音频输入", amount_usd: c, formula: `${usage.audio_input_tokens} audio-in tokens` });
  }
  if (usage.audio_output_tokens && pricing.audio_output_per_1m_usd) {
    const c = (usage.audio_output_tokens / 1_000_000) * pricing.audio_output_per_1m_usd;
    total += c;
    breakdown.push({ label: "音频输出", amount_usd: c, formula: `${usage.audio_output_tokens} audio-out tokens` });
  }

  // 4) 图片
  if (usage.image_count && pricing.image_per_unit_usd) {
    const c = usage.image_count * pricing.image_per_unit_usd;
    total += c;
    breakdown.push({ label: "图片", amount_usd: c, formula: `${usage.image_count} 张 × $${pricing.image_per_unit_usd}` });
  }

  // 5) 视频
  if (usage.video_seconds && pricing.video_per_second_usd) {
    const c = usage.video_seconds * pricing.video_per_second_usd;
    total += c;
    breakdown.push({ label: "视频", amount_usd: c, formula: `${usage.video_seconds}s × $${pricing.video_per_second_usd}/s` });
  }

  // 6) 固定费用
  if (usage.calls && pricing.per_call_usd) {
    const c = usage.calls * pricing.per_call_usd;
    total += c;
    breakdown.push({ label: "调用费", amount_usd: c, formula: `${usage.calls} 次 × $${pricing.per_call_usd}` });
  }

  if (useBatch && pricing.batch_discount) {
    const before = total;
    total = applyBatch(total, pricing.batch_discount);
    breakdown.push({
      label: `批量折扣 ×${pricing.batch_discount}`,
      amount_usd: total - before,
      formula: `${before.toFixed(4)} → ${total.toFixed(4)}`,
    });
  }

  return {
    model_id: pricing.model_id,
    provider_id: pricing.source_id,
    total_usd: round2(total),
    breakdown: breakdown.map((b) => ({ ...b, amount_usd: round2(b.amount_usd) })),
    effective_unit_input: pricing.input_per_1m_usd,
    effective_unit_output: pricing.output_per_1m_usd,
  };
}

function round2(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * 批量估算
 */
export function rankByCost(
  pricings: Pricing[],
  usage: Usage,
  options: { useBatch?: boolean } = {},
): Array<CostEstimate & { score?: number }> {
  return pricings
    .map((p) => estimateCost(p, usage, options))
    .sort((a, b) => a.total_usd - b.total_usd);
}
