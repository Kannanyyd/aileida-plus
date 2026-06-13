/**
 * 性价比评分
 * 综合分 = 0.40 * 价格分 + 0.20 * 上下文分 + 0.20 * 能力分 + 0.10 * 稳定性分 + 0.10 * 可信度分
 */
import type { ModelWithPricing } from "../db/queries";

export interface ScoreWeights {
  price: number;
  context: number;
  capability: number;
  stability: number;
  confidence: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  price: 0.4,
  context: 0.2,
  capability: 0.2,
  stability: 0.1,
  confidence: 0.1,
};

export const RANKING_PRESETS: Record<string, ScoreWeights> = {
  overall: DEFAULT_WEIGHTS,
  writing: { price: 0.25, context: 0.15, capability: 0.4, stability: 0.1, confidence: 0.1 },
  coding: { price: 0.2, context: 0.2, capability: 0.4, stability: 0.1, confidence: 0.1 },
  "long-context": { price: 0.15, context: 0.6, capability: 0.15, stability: 0.05, confidence: 0.05 },
  cheapest: { price: 0.9, context: 0.05, capability: 0.0, stability: 0.0, confidence: 0.05 },
  multimodal: { price: 0.2, context: 0.15, capability: 0.5, stability: 0.05, confidence: 0.1 },
  "free-tier": { price: 0.0, context: 0.2, capability: 0.3, stability: 0.0, confidence: 0.0 },
};

export interface ScoreBreakdown {
  total: number;
  price: number;
  context: number;
  capability: number;
  stability: number;
  confidence: number;
}

/**
 * 评分入口
 */
export function scoreModel(m: ModelWithPricing, others: ModelWithPricing[], w: ScoreWeights = DEFAULT_WEIGHTS): ScoreBreakdown {
  const price = priceScore(m, others);
  const context = contextScore(m);
  const capability = capabilityScore(m);
  const stability = 70; // TODO: 接 history 后由波动率计算
  const confidence = m.confidence_score * 100;

  const total =
    w.price * price + w.context * context + w.capability * capability + w.stability * stability + w.confidence * confidence;

  return {
    total: Math.round(total * 10) / 10,
    price: Math.round(price * 10) / 10,
    context: Math.round(context * 10) / 10,
    capability: Math.round(capability * 10) / 10,
    stability: Math.round(stability * 10) / 10,
    confidence: Math.round(confidence * 10) / 10,
  };
}

function priceScore(m: ModelWithPricing, others: ModelWithPricing[]): number {
  if (others.length === 0) return 70;
  const blended = m.input_per_1m_usd * 0.5 + m.output_per_1m_usd * 0.5;
  const othersBlended = others
    .filter((o) => o.model_id !== m.model_id)
    .map((o) => o.input_per_1m_usd * 0.5 + o.output_per_1m_usd * 0.5)
    .filter((p) => p > 0)
    .sort((a, b) => a - b);
  if (othersBlended.length === 0) return 70;
  const min = othersBlended[0];
  const max = othersBlended[othersBlended.length - 1];
  if (min === max) return 100;
  // 越低越好
  const pct = (blended - min) / (max - min);
  return clamp(100 - pct * 100, 0, 100);
}

function contextScore(m: ModelWithPricing): number {
  const ctx = m.context_length ?? 0;
  // 4K = 0, 128K = 60, 1M = 90, 2M+ = 100
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

const CAPABILITY_WEIGHTS: Record<string, number> = {
  vision: 18,
  "function-call": 16,
  "json-mode": 8,
  "long-context": 16,
  cache: 10,
  audio: 8,
  video: 8,
  reasoning: 18,
};

function capabilityScore(m: ModelWithPricing): number {
  const caps = m.capabilities ?? [];
  const sum = caps.reduce((acc, c) => acc + (CAPABILITY_WEIGHTS[c] ?? 4), 0);
  return clamp(sum, 0, 100);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * 给定一组模型 + 榜单类型，返回排序结果
 */
export function rank(models: ModelWithPricing[], presetKey: keyof typeof RANKING_PRESETS = "overall") {
  const w = RANKING_PRESETS[presetKey] ?? DEFAULT_WEIGHTS;
  // 多模态榜要求含 image/audio
  let candidates = models;
  if (presetKey === "multimodal") {
    candidates = candidates.filter((m) => m.modality?.includes("image") || m.capabilities?.includes("vision") || m.capabilities?.includes("audio"));
  }
  return candidates
    .map((m) => ({ model: m, score: scoreModel(m, candidates, w) }))
    .sort((a, b) => b.score.total - a.score.total);
}
