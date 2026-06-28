import type { ModelWithPricing } from "../db/queries";
import { config } from "../env";
import {
  detectLifecycleTier,
  type ModelLifecycleTier,
  type FamilyModelEntry,
  getCanonicalFamilyKey,
} from "@pricing/core";

export interface ScoreWeights {
  price: number;
  context: number;
  capability: number;
  freshness: number;
  confidence: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  price: 0.18,
  context: 0.18,
  capability: 0.24,
  freshness: 0.25,
  confidence: 0.15,
};

export type ModelTier = ModelLifecycleTier;

function modelAgeMonths(m: ModelWithPricing): number | null {
  const date = m.release_date ?? m.official_updated_at ?? m.updated_at;
  const time = date ? new Date(date).getTime() : NaN;
  if (!Number.isFinite(time)) return null;
  return (Date.now() - time) / (1000 * 60 * 60 * 24 * 30);
}

function buildFamilyModelsMap(models: ModelWithPricing[]): Map<string, FamilyModelEntry[]> {
  const map = new Map<string, FamilyModelEntry[]>();
  for (const m of models) {
    const key = `${(m.canonical_provider_slug ?? m.provider_slug).toLowerCase()}/${(m.model_family ?? m.family ?? m.model_slug ?? '').toLowerCase()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push({
      modelId: m.model_id,
      providerSlug: m.provider_slug,
      modelSlug: m.model_slug,
      modelName: m.model_name,
      releaseDate: m.release_date ?? m.official_updated_at ?? m.updated_at,
      version: null,
    });
  }
  return map;
}

export function getModelTier(m: ModelWithPricing, familyModels: FamilyModelEntry[] = []): ModelTier {
  if (m.model_lifecycle_tier && m.model_lifecycle_tier !== "unknown") {
    return m.model_lifecycle_tier as ModelTier;
  }

  return detectLifecycleTier({
    providerSlug: m.provider_slug,
    modelSlug: m.model_slug,
    modelName: m.model_name,
    family: m.family,
    modelFamily: m.model_family,
    status: m.status,
    releaseDate: m.release_date,
    updatedAt: m.updated_at,
    officialUpdatedAt: m.official_updated_at,
    contextLength: m.context_length,
    capabilities: m.capabilities,
    confidenceScore: m.confidence_score,
    modelSourceConfidence: m.model_source_confidence,
    isOfficial: m.is_official,
    isRecommendedByOfficial: m.model_is_recommended_by_official,
    isDefaultInOfficialDocs: m.model_is_default_in_official_docs,
    isOfficialCurrent: m.is_official_current,
    isOfficialRecommended: m.is_official_recommended,
    modelRecencyStatus: m.model_recency_status,
    officialCurrentCatalogMatch: m.official_current_catalog_match,
  }, familyModels);
}

export function freshnessScore(m: ModelWithPricing, familyModels: FamilyModelEntry[] = []): number {
  let base: number = 20;
  const tier = getModelTier(m, familyModels);
  switch (tier) {
    case "current_frontier":
      base = 100;
      break;
    case "current_mainstream":
      base = 78;
      break;
    case "previous_generation":
      base = 38;
      break;
    case "legacy":
      base = 8;
      break;
    case "deprecated":
      base = 0;
      break;
    case "unknown":
      base = 20;
      break;
    default:
      base = 20;
  }
  if (m.has_newer_family_model) base -= 25;
  if (m.is_official_recommended) base += 12;
  if (m.is_official_current) base += 6;
  if (m.model_recency_status === "current") base += 10;
  if (m.model_recency_status === "recent") base += 4;
  if (m.model_recency_status === "previous") base -= 30;
  if (m.model_recency_status === "stale") base -= 55;
  if (m.model_recency_status === "unknown") base -= 12;
  if (m.source_freshness_status === "warning") base -= 8;
  if (m.source_freshness_status === "stale") base -= 35;
  if (m.source_freshness_status === "unknown") base -= 12;
  return clamp(base, 0, 100);
}

type Preset = { weights: ScoreWeights; label: string; filter?: (m: ModelWithPricing) => boolean };

function hasCurrentModelEvidence(m: ModelWithPricing): boolean {
  if (m.is_current_default_pick) return true;
  if (
    m.official_current_catalog_match &&
    (m.is_official_current || m.is_official_recommended) &&
    !m.official_current_alias_needs_review
  ) {
    return true;
  }
  if (m.model_is_recommended_by_official || m.model_is_default_in_official_docs) return true;
  if (m.model_recency_status === "current" || m.model_recency_status === "recent") {
    const ageMonths = modelAgeMonths(m);
    if (ageMonths != null && ageMonths > 12) return false;
    return true;
  }
  return false;
}

export const RANKING_PRESETS: Record<string, Preset> = {
  "frontier-value": {
    weights: { price: 0.18, context: 0.16, capability: 0.28, freshness: 0.26, confidence: 0.12 },
    label: "最新主力模型性价比榜",
    filter: (m) =>
      m.status === "active" &&
      (m.capabilities ?? []).length >= 2 &&
      !m.need_manual_review &&
      !m.model_needs_pricing_review &&
      Math.max(m.confidence_score, m.model_source_confidence) >= 0.60,
  },
  "china-available": {
    weights: { price: 0.20, context: 0.14, capability: 0.24, freshness: 0.24, confidence: 0.18 },
    label: "国内可用模型榜",
    filter: (m) =>
      m.status === "active" &&
      !m.need_manual_review &&
      (m.provider_region === "cn" || m.is_domestic || m.pricing_region === "china_mainland" || /deepseek|moonshot|zhipu|siliconflow|minimax|volcengine|baidu|qianfan|alibaba|tencent|stepfun/i.test(m.provider_slug)),
  },
  "global-official": {
    weights: { price: 0.18, context: 0.18, capability: 0.24, freshness: 0.25, confidence: 0.15 },
    label: "海外官方模型榜",
    filter: (m) => m.provider_region !== "cn" && m.status === "active" && m.is_official,
  },
  coding: {
    weights: { price: 0.14, context: 0.16, capability: 0.34, freshness: 0.26, confidence: 0.10 },
    label: "编程模型榜",
    filter: (m) => m.status === "active" && ((m.capabilities ?? []).includes("function-call") || /code|coder|codestral|devstral/i.test(m.model_name)),
  },
  "long-context": {
    weights: { price: 0.10, context: 0.44, capability: 0.16, freshness: 0.18, confidence: 0.12 },
    label: "长文本模型榜",
    filter: (m) => m.status === "active" && (m.context_length ?? 0) >= 100000,
  },
  reasoning: {
    weights: { price: 0.12, context: 0.14, capability: 0.36, freshness: 0.26, confidence: 0.12 },
    label: "推理模型榜",
    filter: (m) => m.status === "active" && ((m.capabilities ?? []).includes("reasoning") || /o1|o3|o4|deepseek-r|magistral|reason/i.test(m.model_name)),
  },
  multimodal: {
    weights: { price: 0.10, context: 0.14, capability: 0.38, freshness: 0.24, confidence: 0.14 },
    label: "多模态模型榜",
    filter: (m) => m.status === "active" && ((m.capabilities ?? []).includes("vision") || (m.modality ?? []).some((x) => x === "image" || x === "audio" || x === "video")),
  },
  "chinese-writing": {
    weights: { price: 0.18, context: 0.14, capability: 0.24, freshness: 0.24, confidence: 0.20 },
    label: "中文写作模型榜",
    filter: (m) => m.status === "active" && (m.provider_region === "cn" || m.is_domestic || (m.capabilities ?? []).length >= 3),
  },
  cheapest: {
    weights: { price: 0.70, context: 0.06, capability: 0.08, freshness: 0.08, confidence: 0.08 },
    label: "极致低价榜",
    filter: (m) => m.status === "active",
  },
  "old-models": {
    weights: { price: 0.62, context: 0.10, capability: 0.10, freshness: 0.06, confidence: 0.12 },
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

function filterModels(models: ModelWithPricing[], opts: RankOptions, familyModelsMap: Map<string, FamilyModelEntry[]>): ModelWithPricing[] {
  let result = models;
  if (opts.hideDeprecated ?? true) result = result.filter((m) => getModelTier(m, familyModelsMap.get(m.model_id) ?? []) !== "deprecated");
  if (opts.hideLegacy ?? true) {
    result = result.filter((m) => {
      const tier = getModelTier(m, familyModelsMap.get(m.model_id) ?? []);
      return !["legacy", "previous_generation"].includes(tier);
    });
  }
  if (opts.hideUnknown ?? true) {
    result = result.filter((m) => {
      const tier = getModelTier(m, familyModelsMap.get(m.model_id) ?? []);
      return tier !== "unknown" && hasCurrentModelEvidence(m);
    });
  }
  if (opts.hideSuperseded ?? true) result = result.filter((m) => !m.has_newer_family_model);
  if (opts.hideStale ?? true) {
    const maxAge = opts.maxSourceAgeHours ?? 36;
    result = result.filter((m) => {
      const observedAge = m.source_age_hours ?? m.pricing_age_hours;
      if (observedAge == null) return true;
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

function getEffectiveBlendedPrice(m: ModelWithPricing): number {
  return (m.input_per_1m_usd ?? 0) * 0.45 + (m.output_per_1m_usd ?? 0) * 0.55;
}

function priceScore(m: ModelWithPricing, others: ModelWithPricing[]): number {
  const blended = getEffectiveBlendedPrice(m);
  if (blended <= 0) return 100;

  const allPrices = others.map(getEffectiveBlendedPrice).filter((p) => p > 0).sort((a, b) => a - b);
  if (allPrices.length === 0) return 70;

  const p10 = percentile(allPrices, 0.10);
  const p50 = percentile(allPrices, 0.50);
  const p90 = percentile(allPrices, 0.90);

  if (blended <= p10) return 100;
  if (blended <= p50) {
    const ratio = (blended - p10) / Math.max(p50 - p10, 0.0001);
    return clamp(100 - ratio * 25, 75, 100);
  }
  if (blended <= p90) {
    const ratio = (blended - p50) / Math.max(p90 - p50, 0.0001);
    return clamp(75 - ratio * 40, 35, 75);
  }
  const ratio = (blended - p90) / Math.max(p90, 0.0001);
  return clamp(35 - ratio * 30, 0, 35);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor(sorted.length * p);
  return sorted[Math.min(idx, sorted.length - 1)];
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
  if (m.official_current_model_slug) {
    const prov = (m.model_owner_provider || m.canonical_provider_slug || m.provider_slug).toLowerCase();
    return getCanonicalFamilyKey(prov, m.official_current_model_slug);
  }
  const prov = (m.model_owner_provider || m.canonical_provider_slug || m.provider_slug).toLowerCase();
  return getCanonicalFamilyKey(prov, m.model_slug, m.model_family ?? m.family);
}

export function scoreModel(m: ModelWithPricing, others: ModelWithPricing[], w: ScoreWeights = DEFAULT_WEIGHTS, familyModels: FamilyModelEntry[] = []): ScoreBreakdown {
  const price = priceScore(m, others);
  const context = contextScore(m);
  const capability = capabilityScore(m);
  const freshness = freshnessScore(m, familyModels);
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
  if (m.official_current_source_url) reasons.push("官方 current/recommended 证据");
  if (m.model_recency_status === "previous" || m.model_recency_status === "stale" || m.has_newer_family_model) reasons.push("已有更新主力模型");
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

  const familyModelsMap = buildFamilyModelsMap(models);

  let candidates = filterModels(models, {
    ...opts,
    hideLegacy: isOldModelsPreset ? false : opts.hideLegacy,
    hideDeprecated: isOldModelsPreset ? false : opts.hideDeprecated,
    hideUnknown: isOldModelsPreset ? false : opts.hideUnknown,
    hideSuperseded: isOldModelsPreset ? false : opts.hideSuperseded,
  }, familyModelsMap);
  if (preset.filter) candidates = candidates.filter(preset.filter);

  const scored = candidates
    .map((m) => {
      const familyKey = `${(m.canonical_provider_slug ?? m.provider_slug).toLowerCase()}/${(m.model_family ?? m.family ?? m.model_slug ?? '').toLowerCase()}`;
      const fModels = familyModelsMap.get(familyKey) ?? [];
      const score = scoreModel(m, candidates, preset.weights, fModels);
      if (isDomesticPreset) {
        const nativeCnyBonus = m.currency_native === "CNY" ? 18 : 0;
        const mainlandBonus = m.pricing_region === "china_mainland" || m.is_domestic ? 8 : 0;
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
    const prov = (item.model.canonical_provider_slug ?? item.model.provider_slug).toLowerCase();
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
    items: paged.map((item, i) => {
      const familyKey = `${(item.model.canonical_provider_slug ?? item.model.provider_slug).toLowerCase()}/${(item.model.model_family ?? item.model.family ?? item.model.model_slug ?? '').toLowerCase()}`;
      return {
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
        tier: getModelTier(item.model, familyModelsMap.get(familyKey) ?? []),
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
        freshness_status_deprecated: true,
        freshness_status_deprecation_message: "Use source_freshness_status with model_recency_status; freshness_status only describes observed source/price age.",
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
        official_current_model_slug: item.model.official_current_model_slug,
        official_current_model_family: item.model.official_current_model_family,
        official_current_source_kind: item.model.official_current_source_kind,
        official_current_alias_slug: item.model.official_current_alias_slug,
        official_current_alias_needs_review: item.model.official_current_alias_needs_review,
        has_newer_family_model: item.model.has_newer_family_model,
        superseded_by_model_id: item.model.superseded_by_model_id,
        is_current_default_pick: item.model.is_current_default_pick,
        score: item.score,
        reason: rankReason(item.score, item.model, presetKey),
        why_ranked: rankReason(item.score, item.model, presetKey),
      };
    }),
    slice: (start?: number, end?: number) => deduped.slice(start, end).map((item) => ({ model: item.model, score: item.score })),
    map: (fn: any) => deduped.map((item) => ({ model: item.model, score: item.score })).map(fn),
    get length() {
      return deduped.length;
    },
    [Symbol.iterator]: () => deduped.map((item) => ({ model: item.model, score: item.score }))[Symbol.iterator](),
  };
}
