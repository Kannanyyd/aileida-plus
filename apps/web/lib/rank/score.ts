/**
 * 性价比评分 v2：支持多样性去重 + 多榜单 + 筛选器
 */
import type { ModelWithPricing } from "../db/queries";

export interface ScoreWeights {
  price: number;
  context: number;
  capability: number;
  freshness: number;
  confidence: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  price: 0.3, context: 0.2, capability: 0.25, freshness: 0.15, confidence: 0.1,
};

/** 模型分层 */
export type ModelTier = "current_frontier" | "current_mainstream" | "previous_generation" | "legacy" | "deprecated";

export function getModelTier(m: ModelWithPricing): ModelTier {
  if (m.status === "deprecated") return "deprecated";
  const caps = m.capabilities ?? [];
  // 前沿：多能力 + 活跃 + 长上下文
  if (m.status === "active" && caps.length >= 3 && (m.context_length ?? 0) >= 128000) return "current_frontier";
  if (m.status === "active" && caps.length >= 2) return "current_mainstream";
  if (m.status === "active") return "current_mainstream";
  if (m.status === "preview" || m.status === "beta") return "current_frontier";
  return "legacy";
}

/** 新鲜度得分：frontier=100, mainstream=75, prev-gen=45, legacy=20, deprecated=0 */
function freshnessScore(m: ModelWithPricing): number {
  const tier = getModelTier(m);
  switch (tier) {
    case "current_frontier": return 100;
    case "current_mainstream": return 75;
    case "previous_generation": return 45;
    case "legacy": return 20;
    case "deprecated": return 0;
  }
}

/** 榜单预设 */
export const RANKING_PRESETS: Record<string, { weights: ScoreWeights; label: string; filter?: (m: ModelWithPricing) => boolean }> = {
  "frontier-value": { weights: { price: 0.25, context: 0.2, capability: 0.25, freshness: 0.2, confidence: 0.1 }, label: "最新主力模型性价比榜",
    filter: (m) => m.status === "active" && (m.capabilities ?? []).length >= 2 },
  "china-available": { weights: { price: 0.3, context: 0.15, capability: 0.2, freshness: 0.2, confidence: 0.15 }, label: "国内可用模型榜",
    filter: (m) => (m.provider_region === "cn" || /deepseek|moonshot|zhipu|siliconflow|minimax|volcengine|baidu|qianfan|alibaba|tencent|stepfun/i.test(m.provider_slug)) && m.status === "active" },
  "global-official": { weights: { price: 0.25, context: 0.2, capability: 0.25, freshness: 0.2, confidence: 0.1 }, label: "海外官方模型榜",
    filter: (m) => m.provider_region !== "cn" && m.status === "active" },
  "coding": { weights: { price: 0.15, context: 0.2, capability: 0.3, freshness: 0.25, confidence: 0.1 }, label: "编程模型榜",
    filter: (m) => m.status === "active" && ((m.capabilities ?? []).includes("function-call") || m.model_name.toLowerCase().includes("code")) },
  "long-context": { weights: { price: 0.1, context: 0.5, capability: 0.15, freshness: 0.15, confidence: 0.1 }, label: "长文本模型榜",
    filter: (m) => m.status === "active" && (m.context_length ?? 0) >= 100000 },
  "reasoning": { weights: { price: 0.2, context: 0.15, capability: 0.3, freshness: 0.25, confidence: 0.1 }, label: "推理模型榜",
    filter: (m) => m.status === "active" && ((m.capabilities ?? []).includes("reasoning") || /o1|o3|o4|deepseek-r/i.test(m.model_name)) },
  "multimodal": { weights: { price: 0.15, context: 0.15, capability: 0.35, freshness: 0.25, confidence: 0.1 }, label: "多模态模型榜",
    filter: (m) => m.status === "active" && ((m.capabilities ?? []).includes("vision") || (m.modality ?? []).some((x) => x === "image" || x === "audio" || x === "video")) },
  "chinese-writing": { weights: { price: 0.2, context: 0.15, capability: 0.25, freshness: 0.25, confidence: 0.15 }, label: "中文写作模型榜",
    filter: (m) => m.status === "active" && (m.provider_region === "cn" || (m.capabilities ?? []).length >= 3) },
  "cheapest": { weights: { price: 0.75, context: 0.05, capability: 0.05, freshness: 0.1, confidence: 0.05 }, label: "极致低价榜",
    filter: (m) => m.status === "active" },
  "free-tier": { weights: { price: 0.0, context: 0.25, capability: 0.3, freshness: 0.3, confidence: 0.05 }, label: "免费/优惠榜",
    filter: (m) => m.status === "active" && (m.input_per_1m_usd ?? 0) === 0 },
  "old-models": { weights: { price: 0.65, context: 0.1, capability: 0.1, freshness: 0.05, confidence: 0.1 }, label: "旧模型低价榜",
    filter: (m) => m.status === "deprecated" || getModelTier(m) === "legacy" || getModelTier(m) === "previous_generation" },
};

export interface ScoreBreakdown {
  total: number; price: number; context: number; capability: number; freshness: number; confidence: number;
}

export interface RankOptions {
  limit?: number;
  offset?: number;
  maxPerProvider?: number;
  maxPerFamily?: number;
  diversityMode?: boolean;
  hideLegacy?: boolean;
  hideDeprecated?: boolean;
}

/** 筛掉旧模型/废弃模型 */
function filterModels(models: ModelWithPricing[], opts: RankOptions): ModelWithPricing[] {
  let result = models;
  if (opts.hideDeprecated) result = result.filter((m) => m.status !== "deprecated");
  if (opts.hideLegacy) result = result.filter((m) => m.status === "active" && !/(legacy|old|v0|v1)/i.test(m.model_name));
  return result;
}

function priceScore(m: ModelWithPricing, others: ModelWithPricing[]): number {
  if (others.length === 0) return 70;
  const blended = (m.input_per_1m_usd ?? 0) * 0.5 + (m.output_per_1m_usd ?? 0) * 0.5;
  if (blended <= 0) return 100;
  const othersBlended = others.filter((o) => o.model_id !== m.model_id)
    .map((o) => (o.input_per_1m_usd ?? 0) * 0.5 + (o.output_per_1m_usd ?? 0) * 0.5)
    .filter((p) => p > 0).sort((a, b) => a - b);
  if (othersBlended.length === 0) return 70;
  const min = othersBlended[0], max = othersBlended[othersBlended.length - 1];
  if (min === max) return 100;
  return clamp(100 - ((blended - min) / (max - min)) * 100, 0, 100);
}

function contextScore(m: ModelWithPricing): number {
  const ctx = m.context_length ?? 0;
  if (ctx <= 0) return 0;
  if (ctx >= 2_000_000) return 100;
  if (ctx >= 1_000_000) return 90;
  if (ctx >= 500_000) return 80;
  if (ctx >= 200_000) return 70;
  if (ctx >= 128_000) return 60;
  if (ctx >= 32_000) return 40;
  if (ctx >= 8_000) return 25;
  return 10;
}

const CAP_WEIGHTS: Record<string, number> = { vision: 18, "function-call": 16, "json-mode": 8, "long-context": 16, cache: 10, audio: 8, video: 8, reasoning: 18 };
function capabilityScore(m: ModelWithPricing): number {
  return clamp((m.capabilities ?? []).reduce((acc, c) => acc + (CAP_WEIGHTS[c] ?? 4), 0), 0, 100);
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

export function scoreModel(m: ModelWithPricing, others: ModelWithPricing[], w: ScoreWeights = DEFAULT_WEIGHTS): ScoreBreakdown {
  const price = priceScore(m, others), context = contextScore(m), capability = capabilityScore(m);
  const freshness = freshnessScore(m), confidence = m.confidence_score * 100;
  const total = w.price * price + w.context * context + w.capability * capability + w.freshness * freshness + w.confidence * confidence;
  return { total: Math.round(total * 10) / 10, price: Math.round(price * 10) / 10, context: Math.round(context * 10) / 10, capability: Math.round(capability * 10) / 10, freshness: Math.round(freshness * 10) / 10, confidence: Math.round(confidence * 10) / 10 };
}

/** 排名原因描述 */
function rankReason(s: ScoreBreakdown, m: ModelWithPricing, preset: string): string {
  const reasons: string[] = [];
  if (preset === "cheapest" && s.price >= 90) reasons.push("价格极低");
  if (s.context >= 70) reasons.push("上下文窗口大");
  if (s.capability >= 70) reasons.push("能力全面");
  if (m.provider_region === "cn") reasons.push("国内可用");
  if ((m.capabilities ?? []).includes("reasoning")) reasons.push("支持深度推理");
  if ((m.capabilities ?? []).includes("function-call")) reasons.push("支持函数调用");
  if (m.status === "active") reasons.push("当前主流模型");
  if (m.confidence_score >= 0.85) reasons.push("官方确认价格");
  if (reasons.length === 0) reasons.push(`${preset}榜综合评分较高`);
  return reasons.join(" + ");
}

export function rank(models: ModelWithPricing[], presetKey: string, opts: RankOptions = {}) {
  const preset = RANKING_PRESETS[presetKey] ?? RANKING_PRESETS["frontier-value"];
  const w = preset.weights;
  let candidates = filterModels(models, opts);
  if (preset.filter) candidates = candidates.filter(preset.filter);
  const all = candidates;

  const scored = candidates.map((m) => ({ model: m, score: scoreModel(m, all, w) })).sort((a, b) => b.score.total - a.score.total);

  // 多样性去重
  const maxPerProv = opts.maxPerProvider ?? (opts.diversityMode ? 5 : 999);
  const maxPerFam = opts.maxPerFamily ?? (opts.diversityMode ? 3 : 999);
  const provCount = new Map<string, number>();
  const famCount = new Map<string, number>();
  const deduped: typeof scored = [];

  for (const item of scored) {
    const prov = item.model.provider_slug;
    const fam = item.model.family ?? item.model.model_name.split(/[/-]/)[0] ?? "unknown";
    const pc = provCount.get(prov) ?? 0;
    const fc = famCount.get(fam) ?? 0;
    if (pc >= maxPerProv) continue;
    if (fc >= maxPerFam) continue;
    provCount.set(prov, pc + 1);
    famCount.set(fam, fc + 1);
    deduped.push(item);
  }

  const total = deduped.length;
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  const paged = deduped.slice(offset, offset + limit);

  return {
    preset: presetKey,
    label: preset.label,
    total,
    offset,
    limit,
    diversityMode: opts.diversityMode ?? true,
    items: paged.map((item, i) => ({
      rank: offset + i + 1,
      model_id: item.model.model_id,
      model_slug: item.model.model_slug,
      model_name: item.model.model_name,
      family: item.model.family,
      provider: item.model.provider_slug,
      provider_name: item.model.provider_name_zh,
      provider_region: item.model.provider_region,
      input_per_1m_usd: item.model.input_per_1m_usd,
      output_per_1m_usd: item.model.output_per_1m_usd,
      context_length: item.model.context_length,
      capabilities: item.model.capabilities,
      status: item.model.status,
      score: item.score,
      reason: rankReason(item.score, item.model, presetKey),
    })),
  };
}
