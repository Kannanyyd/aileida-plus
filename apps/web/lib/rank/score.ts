import type { ModelWithPricing } from "../db/queries";
import { config } from "../env";

export interface ScoreWeights {
  price: number;
  context: number;
  capability: number;
  freshness: number;
  confidence: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  price: 0.12,
  context: 0.2,
  capability: 0.28,
  freshness: 0.25,
  confidence: 0.15,
};

export type ModelTier =
  | "current_frontier"
  | "current_mainstream"
  | "previous_generation"
  | "legacy"
  | "deprecated"
  | "unknown";

const PREVIOUS_RE = /\b(gpt-4\b|gpt-4-turbo|claude-3(?:-|$)|gemini-1\.5|gemini-2\.5|llama-3(?:-|$)|qwen2(?:\.5)?|deepseek-v2|doubao-1\.5)\b/i;
const LEGACY_RE = /\b(gpt-3\.5|text-davinci|davinci|babbage|curie|ada|claude-2|claude-instant|gemini-1\.0|llama-2|qwen1|chatglm2|chatglm3|v0|legacy|old)\b/i;

function modelAgeMonths(m: ModelWithPricing): number | null {
  const date = m.release_date ?? m.model_updated_at ?? m.updated_at;
  const time = date ? new Date(date).getTime() : NaN;
  if (!Number.isFinite(time)) return null;
  return (Date.now() - time) / (1000 * 60 * 60 * 24 * 30);
}

export function getModelTier(m: ModelWithPricing): ModelTier {
  if (m.status === "deprecated") return "deprecated";
  if (m.model_lifecycle_tier && m.model_lifecycle_tier !== "unknown") {
    return m.model_lifecycle_tier as ModelTier;
  }

  const name = `${m.provider_slug} ${m.model_name} ${m.family ?? ""}`;
  if (LEGACY_RE.test(name)) return "legacy";
  if (PREVIOUS_RE.test(name)) return "previous_generation";
  if (m.status === "preview" || m.status === "beta") return "current_mainstream";
  if (!m.release_date && !m.updated_at && Math.max(m.confidence_score, m.model_source_confidence) < 0.75) return "unknown";

  const caps = m.capabilities ?? [];
  const age = modelAgeMonths(m);
  if (age != null && age > 30) return "legacy";
  if (age != null && age > 16) return "previous_generation";

  const confidence = Math.max(m.confidence_score, m.model_source_confidence);
  if (confidence < 0.55) return "unknown";
  if (m.status === "active" && caps.length >= 3 && (m.context_length ?? 0) >= 128000 && confidence >= 0.9 && m.is_official) {
    return "current_frontier";
  }
  if (m.status === "active" && caps.length >= 2 && confidence >= 0.65) return "current_mainstream";
  if (m.status === "active" && confidence >= 0.8) return "current_mainstream";
  return "unknown";
}

export function freshnessScore(m: ModelWithPricing): number {
  let base: number;
  switch (getModelTier(m)) {
    case "current_frontier":
      base = 100;
      break;
    case "current_mainstream":
      base = 78;
      break;
    case "previous_generation":
      base = 42;
      break;
    case "legacy":
      base = 12;
      break;
    case "deprecated":
      base = 0;
      break;
    case "unknown":
      base = 20;
      break;
  }
  if (m.has_newer_family_model) base -= 28;
  if (m.model_recency_status === "current") base += 10;
  if (m.model_recency_status === "recent") base += 4;
  if (m.model_recency_status === "previous") base -= 30;
  if (m.model_recency_status === "stale") base -= 55;
  if (m.model_recency_status === "unknown") base -= 18;
  if (m.source_freshness_status === "warning") base -= 8;
  if (m.source_freshness_status === "stale") base -= 40;
  if (m.source_freshness_status === "unknown") base -= 15;
  return clamp(base, 0, 100);
}

type Preset = { weights: ScoreWeights; label: string; filter?: (m: ModelWithPricing) => boolean };

export const RANKING_PRESETS: Record<string, Preset> = {
  "frontier-value": {
    weights: { price: 0.12, context: 0.18, capability: 0.3, freshness: 0.25, confidence: 0.15 },
    label: "最新主力模型性价比榜",
    filter: (m) =>
      m.status === "active" &&
      (m.capabilities ?? []).length >= 2 &&
      !m.need_manual_review &&
      !m.model_needs_pricing_review &&
      Math.max(m.confidence_score, m.model_source_confidence) >= 0.65,
  },
  "china-available": {
    weights: { price: 0.15, context: 0.15, capability: 0.25, freshness: 0.25, confidence: 0.2 },
    label: "国内可用模型榜",
    filter: (m) =>
      m.status === "active" &&
      !m.need_manual_review &&
      (m.provider_region === "cn" || m.is_domestic || m.pricing_region === "china_mainland" || /deepseek|moonshot|zhipu|siliconflow|minimax|volcengine|baidu|qianfan|alibaba|tencent|stepfun/i.test(m.provider_slug)),
  },
  "global-official": {
    weights: { price: 0.12, context: 0.2, capability: 0.28, freshness: 0.25, confidence: 0.15 },
    label: "海外官方模型榜",
    filter: (m) => m.provider_region !== "cn" && m.status === "active" && m.is_official,
  },
  coding: {
    weights: { price: 0.12, context: 0.18, capability: 0.35, freshness: 0.25, confidence: 0.1 },
    label: "编程模型榜",
    filter: (m) => m.status === "active" && ((m.capabilities ?? []).includes("function-call") || /code|coder|codestral|devstral/i.test(m.model_name)),
  },
  "long-context": {
    weights: { price: 0.08, context: 0.48, capability: 0.18, freshness: 0.16, confidence: 0.1 },
    label: "长文本模型榜",
    filter: (m) => m.status === "active" && (m.context_length ?? 0) >= 100000,
  },
  reasoning: {
    weights: { price: 0.12, context: 0.15, capability: 0.34, freshness: 0.27, confidence: 0.12 },
    label: "推理模型榜",
    filter: (m) => m.status === "active" && ((m.capabilities ?? []).includes("reasoning") || /o1|o3|o4|deepseek-r|magistral|reason/i.test(m.model_name)),
  },
  multimodal: {
    weights: { price: 0.1, context: 0.15, capability: 0.38, freshness: 0.25, confidence: 0.12 },
    label: "多模态模型榜",
    filter: (m) => m.status === "active" && ((m.capabilities ?? []).includes("vision") || (m.modality ?? []).some((x) => x === "image" || x === "audio" || x === "video")),
  },
  "chinese-writing": {
    weights: { price: 0.15, context: 0.15, capability: 0.25, freshness: 0.25, confidence: 0.2 },
    label: "中文写作模型榜",
    filter: (m) => m.status === "active" && (m.provider_region === "cn" || m.is_domestic || (m.capabilities ?? []).length >= 3),
  },
  cheapest: {
    weights: { price: 0.72, context: 0.06, capability: 0.06, freshness: 0.08, confidence: 0.08 },
    label: "极致低价榜",
    filter: (m) => m.status === "active",
  },
  "free-tier": {
    weights: { price: 0, context: 0.25, capability: 0.3, freshness: 0.3, confidence: 0.15 },
    label: "免费/优惠榜",
    filter: (m) => m.status === "active" && (m.input_per_1m_usd ?? 0) === 0,
  },
  "old-models": {
    weights: { price: 0.65, context: 0.1, capability: 0.1, freshness: 0.05, confidence: 0.1 },
    label: "旧模型低价榜",
    filter: (m) => ["previous_generation", "legacy", "deprecated"].includes(getModelTier(m)),
  },
};

RANKING_PRESETS.domestic = RANKING_PRESETS["china-available"];
RANKING_PRESETS["low-cost"] = RANKING_PRESETS.cheapest;
RANKING_PRESETS["legacy-low-cost"] = RANKING_PRESETS["old-models"];

export interface ScoreBreakdown {
  total: number;
  price: number;
  context: number;
  capability: number;
  freshness: number;
  confidence: number;
}

export interface RankOptions {
  limit?: number;
  offset?: number;
  maxPerProvider?: number;
  maxPerFamily?: number;
  diversityMode?: boolean;
  hideLegacy?: boolean;
  hideDeprecated?: boolean;
  hideUnknown?: boolean;
  hideStale?: boolean;
  hideSuperseded?: boolean;
  maxSourceAgeHours?: number;
  homepageStrict?: boolean;
  requireOfficialCurrent?: boolean;
}

function filterModels(models: ModelWithPricing[], opts: RankOptions): ModelWithPricing[] {
  let result = models;
  if (opts.hideDeprecated ?? true) result = result.filter((m) => getModelTier(m) !== "deprecated");
  if (opts.hideLegacy ?? true) result = result.filter((m) => !["legacy", "previous_generation"].includes(getModelTier(m)));
  if (opts.hideUnknown ?? true) result = result.filter((m) => getModelTier(m) !== "unknown");
  if (opts.hideSuperseded ?? true) result = result.filter((m) => !m.has_newer_family_model);
  if (opts.hideStale ?? true) {
    const maxAge = opts.maxSourceAgeHours ?? 24;
    result = result.filter((m) => {
      const observedAge = m.source_age_hours ?? m.pricing_age_hours;
      if (observedAge == null) return false;
      return m.source_freshness_status !== "stale" && observedAge <= maxAge;
    });
  }
  if (opts.homepageStrict) {
    result = result.filter((m) => {
      const flags = new Set(m.data_quality_flags ?? []);
      if (flags.has("suspicious_name") || flags.has("needs_manual_review") || flags.has("missing_price_source_url")) return false;
      if (flags.has("aggregator_only") && !m.model_is_recommended_by_official && !m.model_is_default_in_official_docs) return false;
      if ((m.status === "preview" || m.status === "beta" || /preview|beta|experimental/i.test(m.model_name)) && !m.model_is_recommended_by_official && !m.model_is_default_in_official_docs) return false;
      if (m.source_freshness_status !== "fresh") return false;
      if (!["current", "recent"].includes(m.model_recency_status)) return false;
      if (m.has_newer_family_model || m.superseded_by_model_id) return false;
      if (opts.requireOfficialCurrent && !(m.official_current_catalog_match && (m.is_official_current || m.is_official_recommended))) return false;
      return Math.max(m.confidence_score, m.model_source_confidence) >= 0.7;
    });
  }
  return result;
}

function priceScore(m: ModelWithPricing, others: ModelWithPricing[]): number {
  if (others.length === 0) return 70;
  const blended = (m.input_per_1m_usd ?? 0) * 0.45 + (m.output_per_1m_usd ?? 0) * 0.55;
  if (blended <= 0) return 100;
  const othersBlended = others
    .filter((o) => o.model_id !== m.model_id)
    .map((o) => (o.input_per_1m_usd ?? 0) * 0.45 + (o.output_per_1m_usd ?? 0) * 0.55)
    .filter((p) => p > 0)
    .sort((a, b) => a - b);
  if (othersBlended.length === 0) return 70;
  const min = othersBlended[0];
  const max = othersBlended[othersBlended.length - 1];
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

const CAP_WEIGHTS: Record<string, number> = {
  vision: 18,
  "function-call": 16,
  "json-mode": 8,
  "long-context": 16,
  cache: 10,
  audio: 8,
  video: 8,
  reasoning: 18,
  code: 18,
};

function capabilityScore(m: ModelWithPricing): number {
  const capScore = (m.capabilities ?? []).reduce((acc, c) => acc + (CAP_WEIGHTS[c] ?? 4), 0);
  const nameBonus = /code|coder|reason|thinking|vision|vl|omni/i.test(m.model_name) ? 8 : 0;
  return clamp(capScore + nameBonus, 0, 100);
}

function dataQualityPenalty(m: ModelWithPricing): number {
  const flags = new Set(m.data_quality_flags ?? []);
  let penalty = 0;
  if (flags.has("suspicious_name")) penalty += 40;
  if (flags.has("missing_price_source_url")) penalty += 25;
  if (flags.has("source_conflict")) penalty += 20;
  if (flags.has("aggregator_only")) penalty += 15;
  if (flags.has("preview_or_beta")) penalty += 12;
  if (flags.has("domestic_price_missing") && (m.provider_region === "cn" || m.pricing_region === "china_mainland")) penalty += 12;
  if (flags.has("currency_estimated_only")) penalty += 8;
  if (flags.has("needs_manual_review")) penalty += 30;
  return penalty;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function canonicalFamily(m: ModelWithPricing): string {
  const raw = (m.model_family ?? m.family ?? m.model_slug ?? m.model_name).toLowerCase();
  const cleaned = raw
    .replace(/-(latest|preview|beta|instruct|thinking|reasoning|non-reasoning|fast|turbo|mini|nano|chat|online)$/g, "")
    .replace(/-\d{4}[-_]\d{2}[-_]\d{2}$/g, "")
    .replace(/-\d{4,8}$/g, "");
  if (/^grok-4/.test(cleaned)) return "grok-4";
  if (/^gpt-5/.test(cleaned)) return "gpt-5";
  if (/^claude-/.test(cleaned)) return cleaned.split("-").slice(0, 3).join("-");
  if (/^gemini-/.test(cleaned)) return cleaned.split("-").slice(0, 3).join("-");
  if (/^qwen3/.test(cleaned)) return cleaned.split("-").slice(0, 2).join("-");
  if (/^deepseek-/.test(cleaned)) return cleaned.split("-").slice(0, 2).join("-");
  if (/^llama-/.test(cleaned)) return cleaned.split("-").slice(0, 3).join("-");
  return cleaned.split(/[/-]/).slice(0, 2).join("-");
}

export function scoreModel(m: ModelWithPricing, others: ModelWithPricing[], w: ScoreWeights = DEFAULT_WEIGHTS): ScoreBreakdown {
  const price = priceScore(m, others);
  const context = contextScore(m);
  const capability = capabilityScore(m);
  const freshness = freshnessScore(m);
  const confidence = Math.max(m.confidence_score, m.model_source_confidence) * 100;
  const total = w.price * price + w.context * context + w.capability * capability + w.freshness * freshness + w.confidence * confidence - dataQualityPenalty(m);
  return {
    total: Math.round(total * 10) / 10,
    price: Math.round(price * 10) / 10,
    context: Math.round(context * 10) / 10,
    capability: Math.round(capability * 10) / 10,
    freshness: Math.round(freshness * 10) / 10,
    confidence: Math.round(confidence * 10) / 10,
  };
}

function rankReason(s: ScoreBreakdown, m: ModelWithPricing, preset: string): string {
  const reasons: string[] = [];
  const tier = getModelTier(m);
  if (m.official_current_source_url) reasons.push("瀹樻柟 current/recommended 璇佹嵁");
  if (m.model_recency_status === "previous" || m.model_recency_status === "stale") reasons.push("宸叉湁鏇存柊涓诲姏妯″瀷");
  if (preset === "cheapest" || preset === "low-cost" || preset === "legacy-low-cost") {
    if (s.price >= 90) reasons.push("价格极低");
  }
  if (tier === "current_frontier") reasons.push("当前前沿模型");
  if (tier === "current_mainstream") reasons.push("当前主流模型");
  if (tier === "previous_generation") reasons.push("上一代模型，仅适合低价场景");
  if (s.context >= 70) reasons.push("上下文窗口较大");
  if (s.capability >= 60) reasons.push("能力维度较完整");
  if (m.provider_region === "cn" || m.is_domestic || m.pricing_region === "china_mainland") reasons.push("国内使用友好");
  if ((m.capabilities ?? []).includes("reasoning")) reasons.push("支持推理");
  if ((m.capabilities ?? []).includes("function-call")) reasons.push("支持工具/函数调用");
  if (m.is_official) reasons.push("官方价格源");
  if (m.is_aggregator) reasons.push("聚合平台价格");
  if (m.model_needs_pricing_review) reasons.push("新模型价格待确认");
  if (reasons.length === 0) reasons.push("综合评分较高");
  return Array.from(new Set(reasons)).slice(0, 5).join(" + ");
}

function diversityDefaults(limit: number) {
  return {
    provider: limit <= 10 ? 2 : limit <= 20 ? 3 : limit <= 50 ? 8 : 14,
    family: limit <= 10 ? 1 : limit <= 20 ? 2 : limit <= 50 ? 3 : 5,
  };
}

function progressiveCaps(rank: number, fallback: { provider: number; family: number }) {
  if (rank <= 10) return { provider: Math.min(2, fallback.provider), family: Math.min(1, fallback.family) };
  if (rank <= 20) return { provider: Math.min(3, fallback.provider), family: Math.min(2, fallback.family) };
  if (rank <= 50) return { provider: Math.min(8, fallback.provider), family: Math.min(3, fallback.family) };
  return fallback;
}

export function rank(models: ModelWithPricing[], presetKey: string, opts: RankOptions = {}) {
  const preset = RANKING_PRESETS[presetKey] ?? RANKING_PRESETS["frontier-value"];
  const isDomesticPreset = presetKey === "domestic" || presetKey === "china-available";
  const isOldModelsPreset = presetKey === "old-models" || presetKey === "legacy-low-cost";
  const limit = opts.limit ?? 50;
  let candidates = filterModels(models, {
    ...opts,
    hideLegacy: isOldModelsPreset ? false : opts.hideLegacy,
    hideDeprecated: isOldModelsPreset ? false : opts.hideDeprecated,
    hideUnknown: isOldModelsPreset ? false : opts.hideUnknown,
    hideSuperseded: isOldModelsPreset ? false : opts.hideSuperseded,
  });
  if (preset.filter) candidates = candidates.filter(preset.filter);

  const scored = candidates
    .map((m) => {
      const score = scoreModel(m, candidates, preset.weights);
      if (isDomesticPreset) {
        const nativeCnyBonus = m.currency_native === "CNY" ? 22 : 0;
        const mainlandBonus = m.pricing_region === "china_mainland" || m.is_domestic ? 6 : 0;
        return { model: m, score: { ...score, total: Math.round((score.total + nativeCnyBonus + mainlandBonus) * 10) / 10 } };
      }
      return { model: m, score };
    })
    .sort((a, b) => b.score.total - a.score.total);

  const defaults = diversityDefaults(limit);
  const maxPerProv = opts.maxPerProvider ?? (opts.diversityMode === false ? 999 : defaults.provider);
  const maxPerFam = opts.maxPerFamily ?? (opts.diversityMode === false ? 999 : defaults.family);
  const provCount = new Map<string, number>();
  const famCount = new Map<string, number>();
  const deduped: typeof scored = [];

  for (const item of scored) {
    const prov = item.model.canonical_provider_slug ?? item.model.provider_slug;
    const fam = canonicalFamily(item.model);
    const pc = provCount.get(prov) ?? 0;
    const fc = famCount.get(fam) ?? 0;
    const caps = progressiveCaps(deduped.length + 1, { provider: maxPerProv, family: maxPerFam });
    if (pc >= caps.provider || fc >= caps.family) continue;
    provCount.set(prov, pc + 1);
    famCount.set(fam, fc + 1);
    deduped.push(item);
  }

  const total = deduped.length;
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
      family: canonicalFamily(item.model),
      provider: item.model.canonical_provider_slug ?? item.model.provider_slug,
      raw_provider: item.model.provider_slug,
      provider_name: item.model.provider_name_zh,
      provider_region: item.model.provider_region,
      model_owner_provider: item.model.model_owner_provider,
      selling_platform_provider: item.model.selling_platform_provider,
      source_provider: item.model.source_provider,
      model_variant: item.model.model_variant,
      data_quality_flags: item.model.data_quality_flags,
      input_per_1m_usd: item.model.input_per_1m_usd,
      output_per_1m_usd: item.model.output_per_1m_usd,
      currency_native: item.model.currency_native,
      estimated_currency: item.model.currency_native !== "CNY" && (item.model.pricing_region === "china_mainland" || item.model.is_domestic || presetKey === "domestic" || presetKey === "china-available"),
      native_input_per_1m_cny: item.model.input_per_1m_usd != null ? Math.round(item.model.input_per_1m_usd * config.fx.usdCny * 10000) / 10000 : null,
      native_output_per_1m_cny: item.model.output_per_1m_usd != null ? Math.round(item.model.output_per_1m_usd * config.fx.usdCny * 10000) / 10000 : null,
      exchange_rate: config.fx.usdCny,
      exchange_rate_updated_at: process.env.EXCHANGE_RATE_UPDATED_AT ?? null,
      pricing_region: item.model.pricing_region,
      channel: item.model.channel,
      is_domestic: item.model.is_domestic,
      is_official: item.model.is_official,
      is_aggregator: item.model.is_aggregator,
      context_length: item.model.context_length,
      capabilities: item.model.capabilities,
      status: item.model.status,
      tier: getModelTier(item.model),
      price_source_count: item.model.price_source_count,
      domestic_min_input_usd: item.model.domestic_min_input_usd,
      domestic_min_output_usd: item.model.domestic_min_output_usd,
      overseas_min_input_usd: item.model.overseas_min_input_usd,
      overseas_min_output_usd: item.model.overseas_min_output_usd,
      official_min_input_usd: item.model.official_min_input_usd,
      official_min_output_usd: item.model.official_min_output_usd,
      aggregator_min_input_usd: item.model.aggregator_min_input_usd,
      aggregator_min_output_usd: item.model.aggregator_min_output_usd,
      source_confidence_score: Math.round(Math.max(item.model.confidence_score, item.model.model_source_confidence) * 1000) / 10,
      official_release_date: item.model.official_release_date,
      first_seen_at: item.model.first_seen_at,
      last_seen_at: item.model.last_seen_at,
      latest_candidate_last_seen_at: item.model.latest_candidate_last_seen_at,
      source_checked_at: item.model.source_checked_at,
      pricing_checked_at: item.model.pricing_checked_at,
      official_source_checked_at: item.model.official_source_checked_at,
      source_age_hours: item.model.source_age_hours,
      pricing_age_hours: item.model.pricing_age_hours,
      model_age_days: item.model.model_age_days,
      freshness_status: item.model.freshness_status,
      source_freshness_status: item.model.source_freshness_status,
      model_recency_status: item.model.model_recency_status,
      is_official_current: item.model.is_official_current,
      is_official_recommended: item.model.is_official_recommended,
      official_current_status: item.model.official_current_status,
      official_current_source_url: item.model.official_current_source_url,
      official_current_checked_at: item.model.official_current_checked_at,
      official_current_confidence: item.model.official_current_confidence,
      official_current_notes: item.model.official_current_notes,
      official_current_catalog_match: item.model.official_current_catalog_match,
      has_newer_family_model: item.model.has_newer_family_model,
      superseded_by_model_id: item.model.superseded_by_model_id,
      is_current_default_pick: item.model.is_current_default_pick,
      score: item.score,
      reason: rankReason(item.score, item.model, presetKey),
      why_ranked: rankReason(item.score, item.model, presetKey),
    })),
    slice: (start?: number, end?: number) => deduped.slice(start, end).map((item) => ({ model: item.model, score: item.score })),
    map: (fn: any) => deduped.map((item) => ({ model: item.model, score: item.score })).map(fn),
    get length() {
      return deduped.length;
    },
    [Symbol.iterator]: () => deduped.map((item) => ({ model: item.model, score: item.score }))[Symbol.iterator](),
  };
}
