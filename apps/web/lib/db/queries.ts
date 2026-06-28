/**
 * 通用查询：models 列表 + 价格 + 厂商聚合
 */
import { db } from "./client";
import { models, pricing, providers, priceChangeLog, promotions, latestModelCandidates, modelDiscoveryLogs, providerAliases, reviewQueue, sourceFetchLogs } from "./schema";
import { desc, eq, sql, and, gte, isNotNull, inArray } from "drizzle-orm";
import {
  findOfficialCurrentModel,
  type OfficialModelStatus,
  type OfficialCurrentModel,
} from "@pricing/core";
import {
  canonicalProviderSlug,
  inferDataQualityFlags,
  inferModelFamily,
  inferModelOwnerProvider,
  inferModelVariant,
  inferSellingPlatform,
  providerAliasInfo,
  PROVIDER_ALIAS_RULES,
} from "../data-quality/canonical";
import { config } from "../env";

export interface ModelWithPricing {
  model_id: string;
  model_slug: string;
  model_name: string;
  family: string | null;
  release_date: string | null;
  first_seen_at: Date | null;
  last_seen_at: Date | null;
  official_release_date: string | null;
  official_updated_at: Date | null;
  official_source_url: string | null;
  context_length: number | null;
  capabilities: string[];
  modality: string[];
  status: string;
  model_updated_at: Date;
  provider_id: string;
  provider_slug: string;
  provider_name_zh: string;
  provider_region: string;
  canonical_provider_slug: string;
  provider_type: string | null;
  provider_needs_alias_review: boolean;
  input_per_1m_usd: number | null;
  output_per_1m_usd: number | null;
  input_per_1m_cny: number | null;
  output_per_1m_cny: number | null;
  input_cached_read_per_1m_usd: number | null;
  batch_discount: number | null;
  currency_native: string;
  pricing_region: string;
  channel: string;
  platform: string | null;
  selling_platform_provider: string | null;
  source_provider: string | null;
  is_official: boolean;
  is_aggregator: boolean;
  is_domestic: boolean;
  price_source_count: number;
  domestic_min_input_usd: number | null;
  domestic_min_output_usd: number | null;
  overseas_min_input_usd: number | null;
  overseas_min_output_usd: number | null;
  official_min_input_usd: number | null;
  official_min_output_usd: number | null;
  aggregator_min_input_usd: number | null;
  aggregator_min_output_usd: number | null;
  confidence_score: number;
  primary_source_id: string;
  source_url: string;
  need_manual_review: boolean;
  updated_at: Date;
  model_lifecycle_tier: string;
  model_source_confidence: number;
  model_needs_pricing_review: boolean;
  model_is_recommended_by_official: boolean;
  model_is_default_in_official_docs: boolean;
  model_is_latest_alias: boolean;
  canonical_model_slug: string;
  model_family: string;
  model_variant: string;
  model_owner_provider: string;
  model_selling_platform_provider: string;
  model_source_provider: string;
  source_model_id: string;
  data_quality_flags: string[];
  model_needs_alias_review: boolean;
  latest_candidate_last_seen_at: Date | null;
  source_checked_at: Date | null;
  pricing_checked_at: Date | null;
  official_source_checked_at: Date | null;
  source_age_hours: number | null;
  pricing_age_hours: number | null;
  model_age_days: number | null;
  freshness_status: "fresh" | "warning" | "stale" | "unknown";
  source_freshness_status: "fresh" | "warning" | "stale" | "unknown";
  model_recency_status: "current" | "recent" | "previous" | "stale" | "unknown";
  is_official_current: boolean;
  is_official_recommended: boolean;
  official_current_status: OfficialModelStatus | null;
  official_current_source_url: string | null;
  official_current_checked_at: string | null;
  official_current_confidence: number | null;
  official_current_notes: string | null;
  official_current_catalog_match: boolean;
  official_current_model_slug: string | null;
  official_current_model_family: string | null;
  official_current_source_kind: string | null;
  official_current_alias_slug: string | null;
  official_current_alias_needs_review: boolean;
  has_newer_family_model: boolean;
  superseded_by_model_id: string | null;
  is_current_default_pick: boolean;
}

const baseSelect = {
  model_id: models.id,
  model_slug: models.slug,
  model_name: models.name,
  family: models.family,
  release_date: models.release_date,
  first_seen_at: models.first_seen_at,
  last_seen_at: models.last_seen_at,
  official_release_date: models.official_release_date,
  official_updated_at: models.official_updated_at,
  official_source_url: models.official_source_url,
  context_length: models.context_length,
  capabilities: models.capabilities,
  modality: models.modality,
  status: models.status,
  model_updated_at: models.updated_at,
  provider_id: providers.id,
  provider_slug: providers.slug,
  provider_name_zh: providers.name_zh,
  provider_region: providers.region,
  provider_canonical_slug: providers.canonical_slug,
  provider_type: providers.provider_type,
  provider_needs_alias_review: providers.needs_alias_review,
  model_lifecycle_tier: models.lifecycle_tier,
  model_source_confidence: models.source_confidence,
  model_needs_pricing_review: models.needs_pricing_review,
  model_is_recommended_by_official: models.is_recommended_by_official,
  model_is_default_in_official_docs: models.is_default_in_official_docs,
  model_is_latest_alias: models.is_latest_alias,
  canonical_model_slug: models.canonical_model_slug,
  model_family: models.model_family,
  model_variant: models.model_variant,
  model_owner_provider: models.model_owner_provider,
  model_selling_platform_provider: models.selling_platform_provider,
  model_source_provider: models.source_provider,
  source_model_id: models.source_model_id,
  model_data_quality_flags: models.data_quality_flags,
  model_needs_alias_review: models.needs_alias_review,
  input_per_1m_usd: pricing.input_per_1m_usd,
  output_per_1m_usd: pricing.output_per_1m_usd,
  input_cached_read_per_1m_usd: pricing.input_cached_read_per_1m_usd,
  batch_discount: pricing.batch_discount,
  currency_native: pricing.currency_native,
  pricing_region: pricing.region,
  channel: pricing.channel,
  platform: pricing.platform,
  pricing_selling_platform_provider: pricing.selling_platform_provider,
  pricing_source_provider: pricing.source_provider,
  is_official: pricing.is_official,
  is_aggregator: pricing.is_aggregator,
  is_domestic: pricing.is_domestic,
  confidence_score: pricing.confidence_score,
  primary_source_id: pricing.primary_source_id,
  source_url: pricing.source_url,
  need_manual_review: pricing.need_manual_review,
  pricing_data_quality_flags: pricing.data_quality_flags,
  updated_at: pricing.updated_at,
};

function toNumber(v: unknown): number | null {
  return v != null ? Number(v) : null;
}

function asDate(v: unknown): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isFinite(d.getTime()) ? d : null;
}

function asDateString(v: unknown): string | null {
  if (!v) return null;
  return String(v);
}

function latestDate(...values: Array<Date | string | null | undefined>): Date | null {
  const dates = values.map(asDate).filter((d): d is Date => Boolean(d));
  if (dates.length === 0) return null;
  return dates.sort((a, b) => b.getTime() - a.getTime())[0];
}

function ageHours(date: Date | string | null | undefined): number | null {
  const d = asDate(date);
  if (!d) return null;
  return Math.round(((Date.now() - d.getTime()) / (1000 * 60 * 60)) * 10) / 10;
}

function ageDays(date: Date | string | null | undefined): number | null {
  const d = asDate(date);
  if (!d) return null;
  return Math.round(((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)) * 10) / 10;
}

function freshnessStatus(sourceAge: number | null, pricingAge: number | null): ModelWithPricing["freshness_status"] {
  const observed = [sourceAge, pricingAge].filter((x): x is number => x != null);
  if (observed.length === 0) return "unknown";
  const age = Math.min(...observed);
  if (age <= 12) return "fresh";
  if (age <= 24) return "warning";
  return "stale";
}

function sourceFreshnessStatus(sourceAge: number | null): ModelWithPricing["source_freshness_status"] {
  if (sourceAge == null) return "unknown";
  if (sourceAge <= 12) return "fresh";
  if (sourceAge <= 24) return "warning";
  return "stale";
}

function officialStatusIsCurrent(status: OfficialModelStatus | null): boolean {
  return status === "current" || status === "recommended" || status === "latest";
}

type OfficialCatalogMatch = OfficialCurrentModel & {
  sourceKind: "db" | "code-fallback";
  aliasSlug?: string | null;
  aliasNeedsReview?: boolean;
  aliasHomepageEligible?: boolean;
};

type DbOfficialCatalog = {
  byProviderSlug: Map<string, OfficialCatalogMatch>;
  byProviderAlias: Map<string, OfficialCatalogMatch>;
  loadedFromDb: boolean;
};

function normalizeOfficialKey(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/^openrouter\//, "")
    .replace(/^models\//, "")
    .replace(/_/g, "-")
    .trim();
}

function officialProviderCandidates(model: ModelWithPricing): string[] {
  return Array.from(new Set([
    model.model_owner_provider,
    model.canonical_provider_slug,
    model.provider_slug,
    model.canonical_model_slug?.split("/")[0],
  ].map(normalizeOfficialKey).filter(Boolean)));
}

function officialSlugCandidates(model: ModelWithPricing): string[] {
  return Array.from(new Set([
    model.model_slug,
    model.canonical_model_slug,
    model.canonical_model_slug?.split("/").slice(1).join("/"),
    model.source_model_id,
  ].map(normalizeOfficialKey).filter(Boolean)));
}

async function loadOfficialCurrentCatalog(): Promise<DbOfficialCatalog> {
  const byProviderSlug = new Map<string, OfficialCatalogMatch>();
  const byProviderAlias = new Map<string, OfficialCatalogMatch>();
  try {
    const result = await db.execute(sql<{
      provider_slug: string;
      model_slug: string;
      model_family: string;
      official_name: string;
      official_source_url: string;
      official_status: OfficialModelStatus;
      official_checked_at: Date | string;
      confidence: string | number;
      homepage_eligible: boolean;
      needs_pricing_review: boolean;
      source_kind: string;
      notes: string | null;
      alias_slug: string | null;
      alias_type: string | null;
      alias_needs_review: boolean | null;
      alias_homepage_eligible: boolean | null;
    }>`
      select
        o.provider_slug,
        o.model_slug,
        o.model_family,
        o.official_name,
        o.official_source_url,
        o.official_status,
        o.official_checked_at,
        o.confidence,
        o.homepage_eligible,
        o.needs_pricing_review,
        o.source_kind,
        o.notes,
        a.alias_slug,
        a.alias_type,
        a.needs_alias_review as alias_needs_review,
        a.homepage_eligible as alias_homepage_eligible
      from official_current_models o
      left join official_model_aliases a
        on a.provider_slug = o.provider_slug
       and a.canonical_model_slug = o.model_slug
      order by o.provider_slug, o.model_slug
    `);
    const rows = result.rows as Array<{
      provider_slug: string;
      model_slug: string;
      model_family: string;
      official_name: string;
      official_source_url: string;
      official_status: OfficialModelStatus;
      official_checked_at: Date | string;
      confidence: string | number;
      homepage_eligible: boolean;
      needs_pricing_review: boolean;
      source_kind: string;
      notes: string | null;
      alias_slug: string | null;
      alias_type: string | null;
      alias_needs_review: boolean | null;
      alias_homepage_eligible: boolean | null;
    }>;
    for (const row of rows) {
      const match: OfficialCatalogMatch = {
        provider: normalizeOfficialKey(row.provider_slug) as OfficialCurrentModel["provider"],
        modelSlug: normalizeOfficialKey(row.model_slug),
        modelFamily: normalizeOfficialKey(row.model_family),
        officialName: row.official_name,
        officialSourceUrl: row.official_source_url,
        officialStatus: row.official_status,
        officialCheckedAt: String(row.official_checked_at).slice(0, 10),
        confidence: Number(row.confidence),
        notes: row.notes ?? undefined,
        homepageEligible: Boolean(row.homepage_eligible),
        needsPricingReview: Boolean(row.needs_pricing_review),
        sourceKind: "db",
        aliasSlug: row.alias_slug ? normalizeOfficialKey(row.alias_slug) : null,
        aliasNeedsReview: Boolean(row.alias_needs_review),
        aliasHomepageEligible: row.alias_homepage_eligible == null ? true : Boolean(row.alias_homepage_eligible),
      };
      byProviderSlug.set(`${match.provider}/${match.modelSlug}`, match);
      if (match.aliasSlug) byProviderAlias.set(`${match.provider}/${match.aliasSlug}`, match);
    }
    return { byProviderSlug, byProviderAlias, loadedFromDb: byProviderSlug.size > 0 };
  } catch {
    return { byProviderSlug, byProviderAlias, loadedFromDb: false };
  }
}

function findOfficialCurrentInDb(model: ModelWithPricing, catalog: DbOfficialCatalog): OfficialCatalogMatch | null {
  for (const provider of officialProviderCandidates(model)) {
    for (const slug of officialSlugCandidates(model)) {
      const direct = catalog.byProviderSlug.get(`${provider}/${slug}`);
      if (direct) return direct;
      const alias = catalog.byProviderAlias.get(`${provider}/${slug}`);
      if (alias) {
        if (alias.aliasNeedsReview || alias.aliasHomepageEligible === false) return null;
        return alias;
      }
    }
  }
  return null;
}

function findOfficialCurrentWithFallback(model: ModelWithPricing, catalog?: DbOfficialCatalog): OfficialCatalogMatch | null {
  const dbMatch = catalog?.loadedFromDb ? findOfficialCurrentInDb(model, catalog) : null;
  if (dbMatch) return dbMatch;
  const official = findOfficialCurrentModel(model) as OfficialCurrentModel | null;
  return official ? { ...official, sourceKind: "code-fallback", aliasSlug: null, aliasNeedsReview: false, aliasHomepageEligible: true } : null;
}

function applyOfficialCurrentCatalog(model: ModelWithPricing, catalog?: DbOfficialCatalog): ModelWithPricing {
  const official = findOfficialCurrentWithFallback(model, catalog);
  if (!official) {
    return {
      ...model,
      is_official_current: Boolean(model.model_is_latest_alias || model.model_is_default_in_official_docs),
      is_official_recommended: Boolean(model.model_is_recommended_by_official || model.model_is_default_in_official_docs),
      official_current_status: null,
      official_current_source_url: null,
      official_current_checked_at: null,
      official_current_confidence: null,
      official_current_notes: null,
      official_current_catalog_match: false,
      official_current_model_slug: null,
      official_current_model_family: null,
      official_current_source_kind: null,
      official_current_alias_slug: null,
      official_current_alias_needs_review: false,
    };
  }
  const qualityFlags = Array.from(new Set([
    ...(model.data_quality_flags ?? []),
    ...(official.aliasNeedsReview ? ["needs_manual_review"] : []),
  ])).sort();
  return {
    ...model,
    official_source_url: model.official_source_url ?? official.officialSourceUrl,
    data_quality_flags: qualityFlags,
    model_source_confidence: Math.max(model.model_source_confidence, official.confidence),
    model_is_recommended_by_official: model.model_is_recommended_by_official || official.officialStatus === "recommended",
    model_is_default_in_official_docs: model.model_is_default_in_official_docs || official.officialStatus === "recommended" || official.officialStatus === "latest",
    model_is_latest_alias: model.model_is_latest_alias || official.officialStatus === "latest",
    model_needs_pricing_review: model.model_needs_pricing_review || Boolean(official.needsPricingReview),
    is_official_current: officialStatusIsCurrent(official.officialStatus),
    is_official_recommended: official.officialStatus === "recommended" || official.officialStatus === "latest",
    official_current_status: official.officialStatus,
    official_current_source_url: official.officialSourceUrl,
    official_current_checked_at: official.officialCheckedAt,
    official_current_confidence: official.confidence,
    official_current_notes: official.notes ?? null,
    official_current_catalog_match: true,
    official_current_model_slug: official.modelSlug,
    official_current_model_family: official.modelFamily,
    official_current_source_kind: official.sourceKind,
    official_current_alias_slug: official.aliasSlug ?? null,
    official_current_alias_needs_review: Boolean(official.aliasNeedsReview),
  };
}

function blendedPrice(m: Pick<ModelWithPricing, "input_per_1m_usd" | "output_per_1m_usd">): number {
  const input = m.input_per_1m_usd ?? Number.POSITIVE_INFINITY;
  const output = m.output_per_1m_usd ?? Number.POSITIVE_INFINITY;
  return input * 0.45 + output * 0.55;
}

function minPair(
  rows: ModelWithPricing[],
  filter: (row: ModelWithPricing) => boolean,
): { input: number | null; output: number | null } {
  const match = rows
    .filter(filter)
    .filter((r) => r.input_per_1m_usd != null || r.output_per_1m_usd != null)
    .sort((a, b) => blendedPrice(a) - blendedPrice(b))[0];
  return { input: match?.input_per_1m_usd ?? null, output: match?.output_per_1m_usd ?? null };
}

function normalizeModelRow(r: typeof baseSelect extends infer _T ? any : never): ModelWithPricing {
  const alias = providerAliasInfo(r.provider_slug);
  const canonical_provider_slug = canonicalProviderSlug(r.provider_canonical_slug ?? r.provider_slug);
  const canonical_model_slug = r.canonical_model_slug ?? `${inferModelOwnerProvider({ providerSlug: r.provider_slug, modelSlug: r.model_slug, modelName: r.model_name })}/${r.model_slug}`;
  const model_family = r.model_family ?? inferModelFamily(r.model_slug, r.family);
  const model_variant = r.model_variant ?? inferModelVariant(r.model_slug);
  const model_owner_provider = r.model_owner_provider ?? inferModelOwnerProvider({ providerSlug: r.provider_slug, modelSlug: r.model_slug, modelName: r.model_name });
  const selling_platform_provider = r.pricing_selling_platform_provider ?? r.model_selling_platform_provider ?? inferSellingPlatform({
    providerSlug: r.provider_slug,
    platform: r.platform,
    channel: r.channel,
    isAggregator: r.is_aggregator,
  });
  const source_provider = r.pricing_source_provider ?? r.model_source_provider ?? r.primary_source_id ?? r.provider_slug;
  const storedFlags = [...(r.model_data_quality_flags ?? []), ...(r.pricing_data_quality_flags ?? [])];
  const inferredFlags = inferDataQualityFlags({
    modelName: r.model_name,
    modelSlug: r.model_slug,
    status: r.status,
    isAggregator: r.is_aggregator,
    isOfficial: r.is_official,
    sourceUrl: r.source_url,
    currencyNative: r.currency_native,
    isDomestic: r.is_domestic,
    pricingRegion: r.pricing_region,
    confidence: Number(r.confidence_score),
    needsManualReview: r.need_manual_review,
    needsAliasReview: r.model_needs_alias_review || r.provider_needs_alias_review || alias?.needsReview,
  });
  return {
    ...r,
    release_date: asDateString(r.release_date),
    official_release_date: asDateString(r.official_release_date),
    first_seen_at: asDate(r.first_seen_at),
    last_seen_at: asDate(r.last_seen_at),
    official_updated_at: asDate(r.official_updated_at),
    official_source_url: r.official_source_url ?? null,
    input_per_1m_usd: toNumber(r.input_per_1m_usd),
    output_per_1m_usd: toNumber(r.output_per_1m_usd),
    input_per_1m_cny: toNumber(r.input_per_1m_usd) != null ? Math.round(Number(r.input_per_1m_usd) * config.fx.usdCny * 10000) / 10000 : null,
    output_per_1m_cny: toNumber(r.output_per_1m_usd) != null ? Math.round(Number(r.output_per_1m_usd) * config.fx.usdCny * 10000) / 10000 : null,
    input_cached_read_per_1m_usd: toNumber(r.input_cached_read_per_1m_usd),
    batch_discount: toNumber(r.batch_discount),
    confidence_score: Number(r.confidence_score),
    model_source_confidence: Number(r.model_source_confidence),
    canonical_provider_slug,
    provider_type: r.provider_type ?? alias?.providerType ?? null,
    provider_needs_alias_review: Boolean(r.provider_needs_alias_review || alias?.needsReview),
    canonical_model_slug,
    model_family,
    model_variant,
    model_owner_provider,
    model_selling_platform_provider: r.model_selling_platform_provider ?? selling_platform_provider,
    model_source_provider: r.model_source_provider ?? source_provider,
    selling_platform_provider,
    source_provider,
    source_model_id: r.source_model_id ?? r.model_slug,
    data_quality_flags: Array.from(new Set([...storedFlags, ...inferredFlags])).sort(),
    model_needs_alias_review: Boolean(r.model_needs_alias_review || alias?.needsReview),
    latest_candidate_last_seen_at: null,
    source_checked_at: null,
    pricing_checked_at: asDate(r.updated_at),
    official_source_checked_at: asDate(r.official_updated_at),
    source_age_hours: null,
    pricing_age_hours: ageHours(r.updated_at),
    model_age_days: ageDays(r.official_release_date ?? r.release_date ?? r.first_seen_at),
    freshness_status: freshnessStatus(null, ageHours(r.updated_at)),
    source_freshness_status: sourceFreshnessStatus(null),
    model_recency_status: "unknown",
    is_official_current: false,
    is_official_recommended: false,
    official_current_status: null,
    official_current_source_url: null,
    official_current_checked_at: null,
    official_current_confidence: null,
    official_current_notes: null,
    official_current_catalog_match: false,
    official_current_model_slug: null,
    official_current_model_family: null,
    official_current_source_kind: null,
    official_current_alias_slug: null,
    official_current_alias_needs_review: false,
    has_newer_family_model: false,
    superseded_by_model_id: null,
    is_current_default_pick: false,
    price_source_count: 1,
    domestic_min_input_usd: null,
    domestic_min_output_usd: null,
    overseas_min_input_usd: null,
    overseas_min_output_usd: null,
    official_min_input_usd: null,
    official_min_output_usd: null,
    aggregator_min_input_usd: null,
    aggregator_min_output_usd: null,
  };
}

function hotModelScore(m: ModelWithPricing): number {
  const tierScore: Record<string, number> = {
    current_frontier: 100,
    current_mainstream: 80,
    previous_generation: 35,
    legacy: 8,
    deprecated: -50,
    unknown: 20,
  };
  const capability = (m.capabilities ?? []).length * 6;
  const context = m.context_length != null ? Math.min(18, Math.log10(Math.max(m.context_length, 1)) * 3) : 0;
  const channel = (m.is_official ? 10 : 0) + (m.is_domestic || m.provider_region === "cn" ? 8 : 0);
  const confidence = Math.max(m.confidence_score, m.model_source_confidence) * 20;
  const sources = Math.min(12, m.price_source_count * 2);
  const reviewPenalty = m.need_manual_review || m.model_needs_pricing_review ? -20 : 0;
  return (tierScore[m.model_lifecycle_tier] ?? 20) + capability + context + channel + confidence + sources + reviewPenalty;
}

function consolidateModelRows(rows: ReturnType<typeof normalizeModelRow>[]): ModelWithPricing[] {
  const groups = new Map<string, ModelWithPricing[]>();
  for (const row of rows) {
    const key = row.canonical_model_slug || row.model_id;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  return Array.from(groups.values()).map((group) => {
    const representative = [...group].sort((a, b) => {
      const domesticDelta = Number(b.is_domestic || b.provider_region === "cn") - Number(a.is_domestic || a.provider_region === "cn");
      if (domesticDelta !== 0) return domesticDelta;
      const nativeCnyDelta = Number(b.currency_native === "CNY") - Number(a.currency_native === "CNY");
      if (nativeCnyDelta !== 0) return nativeCnyDelta;
      const mainlandDelta = Number(b.pricing_region === "china_mainland") - Number(a.pricing_region === "china_mainland");
      if (mainlandDelta !== 0) return mainlandDelta;
      const officialDelta = Number(b.is_official) - Number(a.is_official);
      if (officialDelta !== 0) return officialDelta;
      const confidenceDelta = b.confidence_score - a.confidence_score;
      if (confidenceDelta !== 0) return confidenceDelta;
      return blendedPrice(a) - blendedPrice(b);
    })[0];
    const domestic = minPair(group, (r) => r.is_domestic || r.pricing_region === "china_mainland");
    const overseas = minPair(group, (r) => !r.is_domestic && r.pricing_region !== "china_mainland");
    const official = minPair(group, (r) => r.is_official);
    const aggregator = minPair(group, (r) => r.is_aggregator || r.channel === "aggregator");

    return {
      ...representative,
      price_source_count: group.length,
      need_manual_review: group.some((r) => r.need_manual_review),
      data_quality_flags: Array.from(new Set(group.flatMap((r) => r.data_quality_flags))).sort(),
      provider_needs_alias_review: group.some((r) => r.provider_needs_alias_review),
      model_needs_alias_review: group.some((r) => r.model_needs_alias_review),
      confidence_score: Math.max(...group.map((r) => r.confidence_score)),
      model_source_confidence: Math.max(...group.map((r) => r.model_source_confidence)),
      pricing_checked_at: latestDate(...group.map((r) => r.pricing_checked_at ?? r.updated_at)),
      pricing_age_hours: ageHours(latestDate(...group.map((r) => r.pricing_checked_at ?? r.updated_at))),
      domestic_min_input_usd: domestic.input,
      domestic_min_output_usd: domestic.output,
      overseas_min_input_usd: overseas.input,
      overseas_min_output_usd: overseas.output,
      official_min_input_usd: official.input,
      official_min_output_usd: official.output,
      aggregator_min_input_usd: aggregator.input,
      aggregator_min_output_usd: aggregator.output,
    };
  });
}

function modelFamilyKey(m: ModelWithPricing): string {
  return `${m.model_owner_provider || m.canonical_provider_slug || m.provider_slug}/${m.model_family || m.family || m.model_slug}`.toLowerCase();
}

function modelRecencyDate(m: ModelWithPricing): Date | null {
  return latestDate(
    m.latest_candidate_last_seen_at,
    m.official_updated_at,
    m.last_seen_at,
    m.official_release_date,
    m.release_date,
    m.model_updated_at,
  );
}

function modelRecencyStatus(m: ModelWithPricing): ModelWithPricing["model_recency_status"] {
  if (m.status === "deprecated" || m.model_lifecycle_tier === "deprecated") return "stale";
  if (m.has_newer_family_model || m.superseded_by_model_id) return "previous";
  if (m.is_official_current || m.is_official_recommended) return "current";
  if (m.model_is_latest_alias || m.model_is_default_in_official_docs || m.model_is_recommended_by_official) return "recent";
  if (m.model_lifecycle_tier === "legacy") return "stale";
  if (m.model_lifecycle_tier === "previous_generation") return "previous";
  const age = m.model_age_days ?? ageDays(modelRecencyDate(m));
  if (age != null && age <= 120 && Math.max(m.confidence_score, m.model_source_confidence) >= 0.85 && m.official_source_url) return "recent";
  if (age != null && age > 540) return "stale";
  return "unknown";
}

function currentPickScore(m: ModelWithPricing): number {
  const tierScore: Record<string, number> = {
    current_frontier: 1000,
    current_mainstream: 700,
    previous_generation: 200,
    legacy: 50,
    deprecated: -500,
    unknown: 100,
  };
  const recency = modelRecencyDate(m)?.getTime() ?? 0;
  const confidence = Math.max(m.confidence_score, m.model_source_confidence) * 100;
  const official = (m.is_official_current ? 200 : 0) + (m.model_is_recommended_by_official ? 80 : 0) + (m.model_is_default_in_official_docs ? 80 : 0);
  const latest = m.model_is_latest_alias ? 30 : 0;
  return (tierScore[m.model_lifecycle_tier] ?? 100) + confidence + official + latest + recency / 1_000_000_000_000;
}

async function enrichFreshnessAndSupersession(input: ModelWithPricing[]): Promise<ModelWithPricing[]> {
  if (input.length === 0) return input;
  const officialCatalog = await loadOfficialCurrentCatalog();

  const sourceKeys = Array.from(new Set(input.flatMap((m) => [
    m.primary_source_id,
    m.source_provider,
    m.selling_platform_provider,
    m.model_source_provider,
    m.model_selling_platform_provider,
    m.canonical_provider_slug,
    m.provider_slug,
  ]).filter(Boolean) as string[]));

  const sourceLogs = sourceKeys.length > 0
    ? await db
      .select({
        source_id: sourceFetchLogs.source_id,
        status: sourceFetchLogs.status,
        fetched_at: sourceFetchLogs.fetched_at,
      })
      .from(sourceFetchLogs)
      .where(inArray(sourceFetchLogs.source_id, sourceKeys))
      .orderBy(desc(sourceFetchLogs.fetched_at))
      .limit(Math.max(200, sourceKeys.length * 4))
    : [];

  const discoveryLogs = await db
    .select({
      provider_slug: modelDiscoveryLogs.provider_slug,
      source_id: modelDiscoveryLogs.source_id,
      status: modelDiscoveryLogs.status,
      fetched_at: modelDiscoveryLogs.fetched_at,
    })
    .from(modelDiscoveryLogs)
    .where(sql`${modelDiscoveryLogs.status} in ('success', 'partial')`)
    .orderBy(desc(modelDiscoveryLogs.fetched_at))
    .limit(500);

  const latestSource = new Map<string, Date>();
  for (const log of sourceLogs) {
    if (!["success", "partial"].includes(log.status)) continue;
    const current = latestSource.get(log.source_id);
    if (!current || log.fetched_at > current) latestSource.set(log.source_id, log.fetched_at);
  }

  const latestDiscovery = new Map<string, Date>();
  for (const log of discoveryLogs) {
    for (const key of [log.source_id, log.provider_slug, canonicalProviderSlug(log.provider_slug)]) {
      const current = latestDiscovery.get(key);
      if (!current || log.fetched_at > current) latestDiscovery.set(key, log.fetched_at);
    }
  }

  const enriched = input.map((rawModel) => {
    const model = applyOfficialCurrentCatalog(rawModel, officialCatalog);
    const checkedCandidates = [
      model.primary_source_id,
      model.source_provider,
      model.selling_platform_provider,
      model.model_source_provider,
      model.model_selling_platform_provider,
      model.canonical_provider_slug,
      model.provider_slug,
    ].filter(Boolean) as string[];
    const latestSourceCheck = latestDate(...checkedCandidates.map((key) => latestSource.get(key)));
    const latestOfficialCheck = latestDate(
      model.official_updated_at,
      model.latest_candidate_last_seen_at,
      ...checkedCandidates.map((key) => latestDiscovery.get(key)),
    );
    const sourceChecked = latestDate(latestSourceCheck, latestOfficialCheck, model.pricing_checked_at);
    const sourceAge = ageHours(sourceChecked);
    const pricingAge = ageHours(model.pricing_checked_at);
    return {
      ...model,
      source_checked_at: sourceChecked,
      official_source_checked_at: latestOfficialCheck,
      source_age_hours: sourceAge,
      pricing_age_hours: pricingAge,
      model_age_days: ageDays(model.official_release_date ?? model.release_date ?? model.first_seen_at),
      freshness_status: freshnessStatus(sourceAge, pricingAge),
      source_freshness_status: sourceFreshnessStatus(sourceAge),
      model_recency_status: modelRecencyStatus({
        ...model,
        source_age_hours: sourceAge,
        pricing_age_hours: pricingAge,
      }),
    };
  });

  const groups = new Map<string, ModelWithPricing[]>();
  for (const model of enriched) {
    const key = modelFamilyKey(model);
    const list = groups.get(key) ?? [];
    list.push(model);
    groups.set(key, list);
  }

  for (const group of groups.values()) {
    if (group.length < 2) {
      group[0].model_recency_status = modelRecencyStatus(group[0]);
      group[0].is_current_default_pick = ["current_frontier", "current_mainstream"].includes(group[0].model_lifecycle_tier) && group[0].source_freshness_status !== "stale" && ["current", "recent"].includes(group[0].model_recency_status);
      continue;
    }
    const best = [...group].sort((a, b) => currentPickScore(b) - currentPickScore(a))[0];
    for (const model of group) {
      model.is_current_default_pick = model.model_id === best.model_id && ["current_frontier", "current_mainstream"].includes(model.model_lifecycle_tier) && model.source_freshness_status !== "stale";
      if (model.model_id === best.model_id) continue;
      const bestDate = modelRecencyDate(best)?.getTime() ?? 0;
      const modelDate = modelRecencyDate(model)?.getTime() ?? 0;
      if (bestDate > modelDate || currentPickScore(best) - currentPickScore(model) >= 80) {
        model.has_newer_family_model = true;
        model.superseded_by_model_id = best.model_id;
        if (model.model_lifecycle_tier === "current_frontier") model.model_lifecycle_tier = "current_mainstream";
        else if (model.model_lifecycle_tier === "current_mainstream") model.model_lifecycle_tier = "previous_generation";
      }
    }
    for (const model of group) {
      model.model_recency_status = modelRecencyStatus(model);
      model.is_current_default_pick = model.is_current_default_pick && ["current", "recent"].includes(model.model_recency_status);
    }
  }

  return enriched;
}

export async function listModels(filter?: {
  providerSlug?: string;
  capability?: string;
  limit?: number;
  needManualReview?: boolean;
  region?: string;
  channel?: string;
}): Promise<ModelWithPricing[]> {
  const conditions = [
    eq(models.status, "active"),
    eq(pricing.is_current, true),
    eq(pricing.pricing_type, "api_token"),
  ];
  if (filter?.providerSlug) {
    conditions.push(sql`(coalesce(${providers.canonical_slug}, ${providers.slug}) = ${filter.providerSlug} or ${providers.slug} = ${filter.providerSlug})`);
  }
  if (filter?.needManualReview != null) conditions.push(eq(pricing.need_manual_review, filter.needManualReview));
  if (filter?.region) conditions.push(eq(pricing.region, filter.region));
  if (filter?.channel) conditions.push(eq(pricing.channel, filter.channel));

  const rows = await db
    .select(baseSelect)
    .from(models)
    .innerJoin(providers, eq(providers.id, models.provider_id))
    .innerJoin(pricing, eq(pricing.model_id, models.id))
    .where(and(...conditions))
    .orderBy(desc(pricing.updated_at))
    .limit(filter?.limit ?? 2000);

  const consolidated = consolidateModelRows(rows.map(normalizeModelRow));
  const keys = consolidated.map((m) => m.model_slug);
  if (keys.length > 0) {
    const candidates = await db
      .select({
        provider_slug: latestModelCandidates.provider_slug,
        model_slug: latestModelCandidates.model_slug,
        lifecycle_tier: latestModelCandidates.lifecycle_tier,
        confidence_score: latestModelCandidates.confidence_score,
        needs_pricing_review: latestModelCandidates.needs_pricing_review,
        is_recommended_by_official: latestModelCandidates.is_recommended_by_official,
        is_default_in_official_docs: latestModelCandidates.is_default_in_official_docs,
        is_latest_alias: latestModelCandidates.is_latest_alias,
        last_seen_at: latestModelCandidates.last_seen_at,
        first_seen_at: latestModelCandidates.first_seen_at,
        source_url: latestModelCandidates.source_url,
      })
      .from(latestModelCandidates)
      .where(inArray(latestModelCandidates.model_slug, keys));
    const byKey = new Map(candidates.map((c) => [`${canonicalProviderSlug(c.provider_slug)}/${c.model_slug}`, c]));
    for (const model of consolidated) {
      const candidate = byKey.get(`${model.canonical_provider_slug}/${model.model_slug}`) ?? byKey.get(`${canonicalProviderSlug(model.provider_slug)}/${model.model_slug}`);
      if (!candidate) continue;
      model.model_lifecycle_tier = candidate.lifecycle_tier;
      model.model_source_confidence = Math.max(model.model_source_confidence, Number(candidate.confidence_score));
      model.model_needs_pricing_review = candidate.needs_pricing_review;
      model.model_is_recommended_by_official = candidate.is_recommended_by_official;
      model.model_is_default_in_official_docs = candidate.is_default_in_official_docs;
      model.model_is_latest_alias = candidate.is_latest_alias;
      model.latest_candidate_last_seen_at = candidate.last_seen_at;
      model.official_source_checked_at = latestDate(model.official_source_checked_at, candidate.last_seen_at);
      model.official_source_url = model.official_source_url ?? candidate.source_url;
      model.first_seen_at = latestDate(model.first_seen_at, candidate.first_seen_at) ?? model.first_seen_at;
    }
  }

  const enriched = await enrichFreshnessAndSupersession(consolidated);
  return enriched.sort((a, b) => hotModelScore(b) - hotModelScore(a)).slice(0, filter?.limit ?? 200);
}

export async function getModelBySlug(slug: string): Promise<ModelWithPricing | null> {
  const rows = await db
    .select(baseSelect)
    .from(models)
    .innerJoin(providers, eq(providers.id, models.provider_id))
    .innerJoin(pricing, eq(pricing.model_id, models.id))
    .where(and(
      eq(models.slug, slug),
      eq(pricing.is_current, true),
      eq(pricing.pricing_type, "api_token"),
    ))
    .limit(1);
  if (rows.length === 0) return null;
  const [model] = await enrichFreshnessAndSupersession(consolidateModelRows(rows.map(normalizeModelRow)));
  return model ?? null;
}

/** 获取模型所有渠道的价格 */
export interface PricingRow {
  id: string;
  pricing_type: string;
  input_per_1m_usd: number | null;
  output_per_1m_usd: number | null;
  input_cached_read_per_1m_usd: number | null;
  currency_native: string;
  region: string;
  channel: string;
  platform: string | null;
  selling_platform_provider: string | null;
  source_provider: string | null;
  is_official: boolean;
  is_aggregator: boolean;
  is_domestic: boolean;
  confidence_score: number;
  source_url: string;
  primary_source_id: string;
  tiered_rules: unknown;
  data_quality_flags: string[];
  updated_at: Date;
}

export async function getModelPricingList(modelId: string): Promise<PricingRow[]> {
  const rows = await db
    .select({
      id: pricing.id,
      pricing_type: pricing.pricing_type,
      input_per_1m_usd: pricing.input_per_1m_usd,
      output_per_1m_usd: pricing.output_per_1m_usd,
      input_cached_read_per_1m_usd: pricing.input_cached_read_per_1m_usd,
      currency_native: pricing.currency_native,
      region: pricing.region,
      channel: pricing.channel,
      platform: pricing.platform,
      selling_platform_provider: pricing.selling_platform_provider,
      source_provider: pricing.source_provider,
      is_official: pricing.is_official,
      is_aggregator: pricing.is_aggregator,
      is_domestic: pricing.is_domestic,
      confidence_score: pricing.confidence_score,
      source_url: pricing.source_url,
      primary_source_id: pricing.primary_source_id,
      tiered_rules: pricing.tiered_rules,
      data_quality_flags: pricing.data_quality_flags,
      updated_at: pricing.updated_at,
    })
    .from(pricing)
    .where(
      and(
        eq(pricing.model_id, modelId),
        eq(pricing.is_current, true),
      ),
    )
    .orderBy(pricing.is_official, pricing.input_per_1m_usd);
  return rows.map((r) => ({
    ...r,
    input_per_1m_usd: r.input_per_1m_usd != null ? Number(r.input_per_1m_usd) : null,
    output_per_1m_usd: r.output_per_1m_usd != null ? Number(r.output_per_1m_usd) : null,
    input_cached_read_per_1m_usd: r.input_cached_read_per_1m_usd != null ? Number(r.input_cached_read_per_1m_usd) : null,
    confidence_score: Number(r.confidence_score),
  }));
}

export interface PlatformPriceRow {
  model_id: string;
  model_slug: string;
  model_name: string;
  provider_slug: string;
  provider_name_zh: string;
  provider_region: string | null;
  model_lifecycle_tier: string | null;
  context_length: number | null;
  pricing_id: string;
  input_per_1m_usd: number | null;
  output_per_1m_usd: number | null;
  currency_native: string;
  region: string;
  channel: string;
  platform: string | null;
  selling_platform_provider: string | null;
  is_official: boolean;
  is_aggregator: boolean;
  is_domestic: boolean;
  confidence_score: number;
  source_url: string;
  primary_source_id: string;
  updated_at: Date;
}

/**
 * 平台比价：返回热门模型在各平台的价格明细，用于横向对比哪个平台最便宜
 */
export async function listPlatformComparison(limit = 30): Promise<PlatformPriceRow[]> {
  const rows = await db.execute(sql<PlatformPriceRow>`
    WITH comparable_prices AS (
      SELECT
        m.id AS model_id,
        m.slug AS model_slug,
        m.name AS model_name,
        p.slug AS provider_slug,
        p.name_zh AS provider_name_zh,
        p.region AS provider_region,
        m.lifecycle_tier AS model_lifecycle_tier,
        m.context_length,
        pr.id AS pricing_id,
        pr.input_per_1m_usd,
        pr.output_per_1m_usd,
        pr.currency_native,
        pr.region,
        pr.channel,
        pr.platform,
        pr.selling_platform_provider,
        pr.is_official,
        pr.is_aggregator,
        pr.is_domestic,
        pr.confidence_score,
        pr.source_url,
        pr.primary_source_id,
        pr.updated_at,
        count(*) OVER (PARTITION BY m.id) AS price_count
      FROM models m
      INNER JOIN providers p ON p.id = m.provider_id
      INNER JOIN pricing pr ON pr.model_id = m.id
      WHERE m.status = 'active'
        AND pr.is_current = true
        AND pr.pricing_type = 'api_token'
        AND pr.input_per_1m_usd IS NOT NULL
    )
    SELECT
      model_id,
      model_slug,
      model_name,
      provider_slug,
      provider_name_zh,
      provider_region,
      model_lifecycle_tier,
      context_length,
      pricing_id,
      input_per_1m_usd,
      output_per_1m_usd,
      currency_native,
      region,
      channel,
      platform,
      selling_platform_provider,
      is_official,
      is_aggregator,
      is_domestic,
      confidence_score,
      source_url,
      primary_source_id,
      updated_at
    FROM comparable_prices
    WHERE price_count > 1
    ORDER BY model_slug, input_per_1m_usd ASC
    LIMIT ${limit * 8}
  `);
  return (rows.rows as unknown as PlatformPriceRow[]).map((r) => ({
    ...r,
    input_per_1m_usd: r.input_per_1m_usd != null ? Number(r.input_per_1m_usd) : null,
    output_per_1m_usd: r.output_per_1m_usd != null ? Number(r.output_per_1m_usd) : null,
    confidence_score: Number(r.confidence_score),
    is_official: Boolean(r.is_official),
    is_aggregator: Boolean(r.is_aggregator),
    is_domestic: Boolean(r.is_domestic),
  }));
}

export async function listProviders() {
  const rows = await db
    .select({
      id: providers.id,
      slug: providers.slug,
      name_zh: providers.name_zh,
      name_en: providers.name_en,
      region: providers.region,
      official_website: providers.official_website,
      homepage: providers.homepage,
      logo_url: providers.logo_url,
      short_description: providers.short_description,
      provider_category: providers.provider_category,
      canonical_slug: providers.canonical_slug,
      provider_type: providers.provider_type,
      is_canonical: providers.is_canonical,
      needs_alias_review: providers.needs_alias_review,
      company_type: providers.company_type,
      headquarters: providers.headquarters,
      supports_domestic_payment: providers.supports_domestic_payment,
      profile_confidence_score: providers.profile_confidence_score,
      is_active: providers.is_active,
      model_count: sql<number>`count(${models.id})::int`,
    })
    .from(providers)
    .leftJoin(models, eq(models.provider_id, providers.id))
    .where(eq(providers.is_active, true))
    .groupBy(providers.id)
    .orderBy(desc(sql<number>`count(${models.id})::int`), providers.name_zh);
  return rows.map((r) => ({
    ...r,
    canonical_slug: canonicalProviderSlug(r.canonical_slug ?? r.slug),
    provider_type: r.provider_type ?? providerAliasInfo(r.slug)?.providerType ?? r.provider_category,
    is_canonical: r.is_canonical ?? canonicalProviderSlug(r.slug) === r.slug,
    needs_alias_review: r.needs_alias_review ?? providerAliasInfo(r.slug)?.needsReview ?? false,
    profile_confidence_score: r.profile_confidence_score != null ? Number(r.profile_confidence_score) : null,
  }));
}

export async function getProviderBySlug(slug: string) {
  const rows = await db
    .select()
    .from(providers)
    .where(sql`${providers.slug} = ${slug} or coalesce(${providers.canonical_slug}, ${providers.slug}) = ${slug}`)
    .orderBy(sql`case when ${providers.slug} = ${slug} then 0 else 1 end`)
    .limit(1);
  if (rows.length === 0) return null;
  const p = rows[0];
  return {
    ...p,
    profile_confidence_score: p.profile_confidence_score != null ? Number(p.profile_confidence_score) : null,
  };
}

export async function getRecentPriceChanges(limit = 10) {
  const rows = await db
    .select({
      id: priceChangeLog.id,
      model_id: priceChangeLog.model_id,
      model_name: models.name,
      provider_slug: providers.slug,
      field: priceChangeLog.field,
      old_value: priceChangeLog.old_value,
      new_value: priceChangeLog.new_value,
      change_pct: priceChangeLog.change_pct,
      detected_at: priceChangeLog.detected_at,
      source_id: priceChangeLog.source_id,
    })
    .from(priceChangeLog)
    .innerJoin(models, eq(models.id, priceChangeLog.model_id))
    .innerJoin(providers, eq(providers.id, models.provider_id))
    .orderBy(desc(priceChangeLog.detected_at))
    .limit(limit);
  return rows.map((r) => ({
    ...r,
    old_value: r.old_value != null ? Number(r.old_value) : null,
    new_value: r.new_value != null ? Number(r.new_value) : null,
    change_pct: r.change_pct != null ? Number(r.change_pct) : null,
  }));
}

export async function listActivePromotions(limit = 20) {
  const rows = await db
    .select({
      id: promotions.id,
      provider_id: promotions.provider_id,
      provider_slug: providers.slug,
      provider_name_zh: providers.name_zh,
      title: promotions.title,
      description: promotions.description,
      promotion_type: promotions.promotion_type,
      gift_amount: promotions.gift_amount,
      gift_unit: promotions.gift_unit,
      discount_rate: promotions.discount_rate,
      starts_at: promotions.starts_at,
      ends_at: promotions.ends_at,
      source_url: promotions.source_url,
      is_active: promotions.is_active,
    })
    .from(promotions)
    .innerJoin(providers, eq(providers.id, promotions.provider_id))
    .where(eq(promotions.is_active, true))
    .orderBy(desc(promotions.created_at))
    .limit(limit);
  return rows.map((r) => ({
    ...r,
    gift_amount: r.gift_amount != null ? Number(r.gift_amount) : null,
    discount_rate: r.discount_rate != null ? Number(r.discount_rate) : null,
  }));
}

// ============================================================
// 新闻/动态查询 (for /ai-news, /providers/[slug]/news)
// ============================================================

export async function listNewsItems(filter?: {
  category?: string;
  providerId?: string;
  modelId?: string;
  limit?: number;
}) {
  const { newsItems, newsSources } = await import("./schema");
  const conditions = [eq(newsItems.is_published, true)];
  if (filter?.category) conditions.push(eq(newsItems.category, filter.category));
  if (filter?.providerId) {
    conditions.push(sql`${newsItems.related_provider_ids} @> ${JSON.stringify([filter.providerId])}::jsonb`);
  }
  if (filter?.modelId) {
    conditions.push(sql`${newsItems.related_model_ids} @> ${JSON.stringify([filter.modelId])}::jsonb`);
  }

  return db
    .select({
      id: newsItems.id,
      title: newsItems.title,
      summary: newsItems.summary,
      category: newsItems.category,
      importance: newsItems.importance,
      url: newsItems.url,
      published_at: newsItems.published_at,
      affects_pricing: newsItems.affects_pricing,
      affects_recommendation: newsItems.affects_recommendation,
      source_name: newsSources.name_zh,
    })
    .from(newsItems)
    .innerJoin(newsSources, eq(newsSources.id, newsItems.source_id))
    .where(and(...conditions))
    .orderBy(desc(newsItems.published_at))
    .limit(filter?.limit ?? 30);
}

export async function listVendorAnnouncements(limit = 50) {
  const { newsItems, newsSources, providers } = await import("./schema");

  return db
    .select({
      id: newsItems.id,
      title: newsItems.title,
      summary: newsItems.summary,
      category: newsItems.category,
      importance: newsItems.importance,
      url: newsItems.url,
      published_at: newsItems.published_at,
      fetched_at: newsItems.fetched_at,
      affects_pricing: newsItems.affects_pricing,
      source_name: newsSources.name_zh,
      provider_id: providers.id,
      provider_slug: providers.slug,
      provider_name_zh: providers.name_zh,
    })
    .from(newsItems)
    .innerJoin(newsSources, eq(newsSources.id, newsItems.source_id))
    .innerJoin(providers, eq(providers.id, newsSources.provider_id))
    .where(and(eq(newsItems.is_published, true), eq(newsSources.priority, 10), eq(newsSources.is_active, true)))
    .orderBy(desc(newsItems.published_at))
    .limit(limit);
}

export async function listSubscriptionPlans(providerId?: string) {
  const { subscriptionPlans, providers } = await import("./schema");
  const conditions = [eq(subscriptionPlans.is_active, true)];
  if (providerId) conditions.push(eq(subscriptionPlans.provider_id, providerId));

  return db
    .select({
      id: subscriptionPlans.id,
      provider_id: subscriptionPlans.provider_id,
      provider_name: providers.name_zh,
      provider_slug: providers.slug,
      name: subscriptionPlans.name,
      tier: subscriptionPlans.tier,
      monthly_price: subscriptionPlans.monthly_price,
      annual_price: subscriptionPlans.annual_price,
      currency: subscriptionPlans.currency,
      features: subscriptionPlans.features,
      source_url: subscriptionPlans.source_url,
    })
    .from(subscriptionPlans)
    .innerJoin(providers, eq(providers.id, subscriptionPlans.provider_id))
    .where(and(...conditions))
    .orderBy(subscriptionPlans.monthly_price);
}

export async function listProductOfferings(providerId?: string) {
  const { productOfferings, providers } = await import("./schema");
  const conditions = [eq(productOfferings.is_active, true)];
  if (providerId) conditions.push(eq(productOfferings.provider_id, providerId));

  return db
    .select({
      id: productOfferings.id,
      provider_id: productOfferings.provider_id,
      provider_name: providers.name_zh,
      offering_type: productOfferings.offering_type,
      name: productOfferings.name,
      price_amount: productOfferings.price_amount,
      price_currency: productOfferings.price_currency,
      features: productOfferings.features,
      source_url: productOfferings.source_url,
    })
    .from(productOfferings)
    .innerJoin(providers, eq(providers.id, productOfferings.provider_id))
    .where(and(...conditions))
    .orderBy(productOfferings.price_amount);
}

export async function getModelChangelog(modelId: string, limit = 20) {
  const { priceChangeLog, models } = await import("./schema");
  return db
    .select({
      id: priceChangeLog.id,
      field: priceChangeLog.field,
      old_value: priceChangeLog.old_value,
      new_value: priceChangeLog.new_value,
      change_pct: priceChangeLog.change_pct,
      source_id: priceChangeLog.source_id,
      source_url: priceChangeLog.source_url,
      detected_at: priceChangeLog.detected_at,
    })
    .from(priceChangeLog)
    .where(eq(priceChangeLog.model_id, modelId))
    .orderBy(desc(priceChangeLog.detected_at))
    .limit(limit);
}
export async function dashboardOverview() {
  const [providerCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(providers)
    .where(eq(providers.is_active, true));
  const [modelCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(models)
    .where(eq(models.status, "active"));
  const [reviewCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(pricing)
    .where(eq(pricing.need_manual_review, true));
  const [todayChanges] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(priceChangeLog)
    .where(gte(priceChangeLog.detected_at, sql`now() - interval '24 hours'`));
  const [activePromos] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(promotions)
    .where(eq(promotions.is_active, true));

  return {
    providers: providerCount?.c ?? 0,
    models: modelCount?.c ?? 0,
    review: reviewCount?.c ?? 0,
    todayChanges: todayChanges?.c ?? 0,
    promotions: activePromos?.c ?? 0,
  };
}

export async function dataFreshnessOverview() {
  const [latestModelDiscovery] = await db
    .select({ fetched_at: sql<Date | null>`max(${modelDiscoveryLogs.fetched_at})` })
    .from(modelDiscoveryLogs)
    .where(sql`${modelDiscoveryLogs.status} in ('success', 'partial')`);
  const [latestSourceFetch] = await db
    .select({ fetched_at: sql<Date | null>`max(${sourceFetchLogs.fetched_at})` })
    .from(sourceFetchLogs)
    .where(sql`${sourceFetchLogs.status} in ('success', 'partial')`);
  const [latestPricing] = await db
    .select({ updated_at: sql<Date | null>`max(${pricing.updated_at})` })
    .from(pricing)
    .where(eq(pricing.is_current, true));
  const [latestCnyPricing] = await db
    .select({ updated_at: sql<Date | null>`max(${pricing.updated_at})` })
    .from(pricing)
    .where(and(eq(pricing.is_current, true), eq(pricing.currency_native, "CNY"), eq(pricing.region, "china_mainland")));
  const [stale12] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(sourceFetchLogs)
    .where(sql`${sourceFetchLogs.status} in ('success', 'partial') and ${sourceFetchLogs.fetched_at} < now() - interval '12 hours'`);
  const [stale24] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(sourceFetchLogs)
    .where(sql`${sourceFetchLogs.status} in ('success', 'partial') and ${sourceFetchLogs.fetched_at} < now() - interval '24 hours'`);

  const sourceCheckedAt = latestDate(latestSourceFetch?.fetched_at ?? null, latestModelDiscovery?.fetched_at ?? null);
  const pricingCheckedAt = latestPricing?.updated_at ?? null;
  const cnyPricingCheckedAt = latestCnyPricing?.updated_at ?? null;
  return {
    latest_model_discovery_checked_at: latestModelDiscovery?.fetched_at ?? null,
    latest_source_checked_at: sourceCheckedAt,
    latest_pricing_checked_at: pricingCheckedAt,
    latest_cny_pricing_checked_at: cnyPricingCheckedAt,
    source_age_hours: ageHours(sourceCheckedAt),
    pricing_age_hours: ageHours(pricingCheckedAt),
    cny_pricing_age_hours: ageHours(cnyPricingCheckedAt),
    stale_source_logs_over_12h: stale12?.c ?? 0,
    stale_source_logs_over_24h: stale24?.c ?? 0,
    freshness_status: freshnessStatus(ageHours(sourceCheckedAt), ageHours(pricingCheckedAt)),
  };
}

export async function listLatestModelCandidates(limit = 50, days = 30) {
  const since = sql`now() - make_interval(days => ${days})`;
  const rows = await db
    .select()
    .from(latestModelCandidates)
    .where(and(
      gte(latestModelCandidates.last_seen_at, since),
      sql`${latestModelCandidates.discovery_status} <> 'stale'`,
    ))
    .orderBy(desc(latestModelCandidates.last_seen_at))
    .limit(limit);
  return rows.map((r) => ({
    ...r,
    confidence_score: Number(r.confidence_score),
  }));
}

export async function modelDiscoveryOverview() {
  const since7 = sql`now() - interval '7 days'`;
  const since30 = sql`now() - interval '30 days'`;
  const since90 = sql`now() - interval '90 days'`;
  const [recent7] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(latestModelCandidates)
    .where(and(gte(latestModelCandidates.last_seen_at, since7), sql`${latestModelCandidates.discovery_status} <> 'stale'`));
  const [recent30] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(latestModelCandidates)
    .where(and(gte(latestModelCandidates.last_seen_at, since30), sql`${latestModelCandidates.discovery_status} <> 'stale'`));
  const [recent90] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(latestModelCandidates)
    .where(and(gte(latestModelCandidates.last_seen_at, since90), sql`${latestModelCandidates.discovery_status} <> 'stale'`));
  const [needsPricing] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(latestModelCandidates)
    .where(eq(latestModelCandidates.needs_pricing_review, true));
  const [possibleDeprecated] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(latestModelCandidates)
    .where(sql`${latestModelCandidates.model_status} in ('deprecated', 'retired')`);
  const [inserted] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(latestModelCandidates)
    .where(eq(latestModelCandidates.discovery_status, "inserted"));
  return {
    recent7: recent7?.c ?? 0,
    recent30: recent30?.c ?? 0,
    recent90: recent90?.c ?? 0,
    needsPricing: needsPricing?.c ?? 0,
    possibleDeprecated: possibleDeprecated?.c ?? 0,
    inserted: inserted?.c ?? 0,
  };
}

export async function listModelDiscoveryLogs(limit = 30) {
  return db
    .select()
    .from(modelDiscoveryLogs)
    .orderBy(desc(modelDiscoveryLogs.fetched_at))
    .limit(limit);
}

export async function dataQualityOverview() {
  const [providerAliasCount] = await db.select({ c: sql<number>`count(*)::int` }).from(providerAliases);
  const [providerReviewCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(providerAliases)
    .where(eq(providerAliases.needs_alias_review, true));
  const [aggregatorOnly] = await db
    .select({ c: sql<number>`count(distinct ${models.id})::int` })
    .from(models)
    .innerJoin(pricing, eq(pricing.model_id, models.id))
    .where(and(eq(pricing.is_aggregator, true), eq(pricing.is_official, false), eq(pricing.is_current, true)));
  const [missingSourceUrl] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(pricing)
    .where(sql`${pricing.source_url} is null or ${pricing.source_url} = '' or ${pricing.source_url} = 'unknown'`);
  const [domesticMissing] = await db
    .select({ c: sql<number>`count(distinct ${models.id})::int` })
    .from(models)
    .innerJoin(providers, eq(providers.id, models.provider_id))
    .leftJoin(pricing, eq(pricing.model_id, models.id))
    .where(sql`(${providers.region} = 'cn' or ${pricing.region} = 'china_mainland' or ${pricing.is_domestic} = true) and not exists (
      select 1 from pricing p2 where p2.model_id = ${models.id} and p2.is_current = true and p2.currency_native = 'CNY'
    )`);
  const [suspiciousName] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(models)
    .where(sql`${models.data_quality_flags} ? 'suspicious_name' or ${models.name} ~* '[{}\\[\\]|<>]|\\m(api|models|pricing|docs|guide|required)\\M'`);
  return {
    providerAliasRules: providerAliasCount?.c ?? PROVIDER_ALIAS_RULES.length,
    providerAliasesNeedReview: providerReviewCount?.c ?? 0,
    aggregatorOnly: aggregatorOnly?.c ?? 0,
    missingPriceSourceUrl: missingSourceUrl?.c ?? 0,
    domesticPriceMissing: domesticMissing?.c ?? 0,
    suspiciousName: suspiciousName?.c ?? 0,
  };
}

export async function listProviderAliasAudit(limit = 200) {
  const rows = await db
    .select({
      source_slug: providerAliases.source_slug,
      canonical_slug: providerAliases.canonical_slug,
      display_name: providerAliases.display_name,
      provider_type: providerAliases.provider_type,
      alias_confidence: providerAliases.alias_confidence,
      needs_alias_review: providerAliases.needs_alias_review,
      notes: providerAliases.notes,
      provider_exists: sql<boolean>`exists(select 1 from providers p where p.slug = ${providerAliases.source_slug})`,
      model_count: sql<number>`(select count(*)::int from models m join providers p on p.id = m.provider_id where p.slug = ${providerAliases.source_slug})`,
    })
    .from(providerAliases)
    .orderBy(desc(providerAliases.needs_alias_review), providerAliases.canonical_slug, providerAliases.source_slug)
    .limit(limit);
  return rows.map((r) => ({
    ...r,
    alias_confidence: Number(r.alias_confidence),
  }));
}

export async function listModelAliasAudit(limit = 200) {
  const rows = await db
    .select({
      model_family: sql<string>`coalesce(${models.model_family}, ${models.family}, split_part(${models.slug}, '/', 1))`,
      canonical_provider: sql<string>`coalesce(${models.model_owner_provider}, ${providers.canonical_slug}, ${providers.slug})`,
      model_count: sql<number>`count(*)::int`,
      variants: sql<string[]>`array_agg(${models.slug} order by ${models.slug})`,
      needs_review: sql<boolean>`bool_or(${models.needs_alias_review})`,
    })
    .from(models)
    .innerJoin(providers, eq(providers.id, models.provider_id))
    .groupBy(sql`coalesce(${models.model_family}, ${models.family}, split_part(${models.slug}, '/', 1))`, sql`coalesce(${models.model_owner_provider}, ${providers.canonical_slug}, ${providers.slug})`)
    .having(sql`count(*) > 1`)
    .orderBy(desc(sql<number>`count(*)::int`))
    .limit(limit);
  return rows;
}

export type OfficialCurrentCatalogRow = {
  provider_slug: string;
  model_slug: string;
  model_family: string;
  official_name: string;
  official_source_url: string;
  official_status: string;
  official_checked_at: Date;
  confidence: number;
  homepage_eligible: boolean;
  has_pricing: boolean;
  needs_pricing_review: boolean;
  source_kind: string;
  notes: string | null;
  alias_count: number;
  aliases_need_review: number;
};

export async function listOfficialCurrentCatalog(limit = 500): Promise<OfficialCurrentCatalogRow[]> {
  try {
    const rows = await db.execute(sql<OfficialCurrentCatalogRow>`
      select
        o.provider_slug,
        o.model_slug,
        o.model_family,
        o.official_name,
        o.official_source_url,
        o.official_status,
        o.official_checked_at,
        o.confidence,
        o.homepage_eligible,
        o.has_pricing,
        o.needs_pricing_review,
        o.source_kind,
        o.notes,
        count(a.id)::int as alias_count,
        count(a.id) filter (where a.needs_alias_review = true)::int as aliases_need_review
      from official_current_models o
      left join official_model_aliases a
        on a.provider_slug = o.provider_slug
       and a.canonical_model_slug = o.model_slug
      group by o.id
      order by o.homepage_eligible desc, o.provider_slug, o.model_family, o.model_slug
      limit ${limit}
    `);
    return (rows.rows as OfficialCurrentCatalogRow[]).map((r) => ({
      ...r,
      confidence: Number(r.confidence),
      alias_count: Number(r.alias_count),
      aliases_need_review: Number(r.aliases_need_review),
    }));
  } catch {
    return [];
  }
}

export type OfficialModelAliasRow = {
  provider_slug: string;
  alias_slug: string;
  canonical_model_slug: string;
  alias_type: string;
  model_family: string | null;
  official_source_url: string | null;
  confidence: number;
  needs_alias_review: boolean;
  homepage_eligible: boolean;
  notes: string | null;
  updated_at: Date;
};

export async function listOfficialModelAliases(limit = 500): Promise<OfficialModelAliasRow[]> {
  try {
    const rows = await db.execute(sql<OfficialModelAliasRow>`
      select
        provider_slug,
        alias_slug,
        canonical_model_slug,
        alias_type,
        model_family,
        official_source_url,
        confidence,
        needs_alias_review,
        homepage_eligible,
        notes,
        updated_at
      from official_model_aliases
      order by needs_alias_review desc, provider_slug, canonical_model_slug, alias_slug
      limit ${limit}
    `);
    return (rows.rows as OfficialModelAliasRow[]).map((r) => ({ ...r, confidence: Number(r.confidence) }));
  } catch {
    return [];
  }
}

export type DomesticPricingGapRow = {
  provider: string;
  models_count: number;
  cny_pricing_count: number;
  source_url_count: number;
  official_count: number;
  aggregator_count: number;
  needs_pricing_review_count: number;
  missing_price_model_count: number;
};

export async function domesticPricingGapAudit(): Promise<DomesticPricingGapRow[]> {
  const rows = await db.execute(sql<{
    provider: string;
    models_count: number;
    cny_pricing_count: number;
    source_url_count: number;
    official_count: number;
    aggregator_count: number;
    needs_pricing_review_count: number;
  }>`
    with provider_keys(provider) as (
      values
        ('deepseek'),
        ('alibaba-cloud'),
        ('aliyun-bailian'),
        ('bytedance-volcano'),
        ('volcengine'),
        ('tencent-hunyuan'),
        ('baidu-qianfan'),
        ('zhipu'),
        ('moonshot'),
        ('minimax'),
        ('siliconflow'),
        ('modelscope')
    ),
    model_scope as (
      select
        ${models.id} as model_id,
        ${models.needs_pricing_review} as needs_pricing_review,
        case
          when coalesce(${models.model_owner_provider}, ${providers.canonical_slug}, ${providers.slug}) in ('moonshotai', 'kimi') then 'moonshot'
          when coalesce(${models.model_owner_provider}, ${providers.canonical_slug}, ${providers.slug}) in ('qwen', 'alibaba', 'aliyun') then 'alibaba-cloud'
          when coalesce(${models.model_owner_provider}, ${providers.canonical_slug}, ${providers.slug}) in ('doubao', 'volcano') then 'bytedance-volcano'
          when coalesce(${models.model_owner_provider}, ${providers.canonical_slug}, ${providers.slug}) in ('baidu', 'wenxin') then 'baidu-qianfan'
          when coalesce(${models.model_owner_provider}, ${providers.canonical_slug}, ${providers.slug}) in ('hunyuan', 'tencent') then 'tencent-hunyuan'
          when coalesce(${providers.canonical_slug}, ${providers.slug}) in ('moonshotai', 'kimi') then 'moonshot'
          else coalesce(${models.model_owner_provider}, ${providers.canonical_slug}, ${providers.slug})
        end as owner_key,
        case
          when coalesce(${providers.canonical_slug}, ${providers.slug}) in ('moonshotai', 'kimi') then 'moonshot'
          when coalesce(${providers.canonical_slug}, ${providers.slug}) in ('qwen', 'alibaba', 'aliyun') then 'alibaba-cloud'
          when coalesce(${providers.canonical_slug}, ${providers.slug}) in ('doubao', 'volcano') then 'bytedance-volcano'
          when coalesce(${providers.canonical_slug}, ${providers.slug}) in ('baidu', 'wenxin') then 'baidu-qianfan'
          when coalesce(${providers.canonical_slug}, ${providers.slug}) in ('hunyuan', 'tencent') then 'tencent-hunyuan'
          else coalesce(${providers.canonical_slug}, ${providers.slug})
        end as model_provider_key,
        ${providers.region} as provider_region
      from ${models}
      join ${providers} on ${providers.id} = ${models.provider_id}
    ),
    pricing_scope as (
      select
        ${pricing.id} as pricing_id,
        ${pricing.model_id} as model_id,
        ${pricing.currency_native} as currency_native,
        ${pricing.is_current} as is_current,
        ${pricing.source_url} as source_url,
        ${pricing.is_official} as is_official,
        ${pricing.is_aggregator} as is_aggregator,
        case
          when coalesce(${models.model_owner_provider}, ${providers.canonical_slug}, ${providers.slug}) in ('moonshotai', 'kimi') then 'moonshot'
          when coalesce(${models.model_owner_provider}, ${providers.canonical_slug}, ${providers.slug}) in ('qwen', 'alibaba', 'aliyun') then 'alibaba-cloud'
          when coalesce(${models.model_owner_provider}, ${providers.canonical_slug}, ${providers.slug}) in ('doubao', 'volcano') then 'bytedance-volcano'
          when coalesce(${models.model_owner_provider}, ${providers.canonical_slug}, ${providers.slug}) in ('baidu', 'wenxin') then 'baidu-qianfan'
          when coalesce(${models.model_owner_provider}, ${providers.canonical_slug}, ${providers.slug}) in ('hunyuan', 'tencent') then 'tencent-hunyuan'
          else coalesce(${models.model_owner_provider}, ${providers.canonical_slug}, ${providers.slug})
        end as owner_key,
        case
          when ${pricing.selling_platform_provider} in ('moonshotai', 'kimi') then 'moonshot'
          when ${pricing.selling_platform_provider} in ('qwen', 'alibaba', 'aliyun') then 'alibaba-cloud'
          when ${pricing.selling_platform_provider} in ('doubao', 'volcano') then 'bytedance-volcano'
          when ${pricing.selling_platform_provider} in ('baidu', 'wenxin') then 'baidu-qianfan'
          when ${pricing.selling_platform_provider} in ('hunyuan', 'tencent') then 'tencent-hunyuan'
          else ${pricing.selling_platform_provider}
        end as selling_key,
        case
          when ${pricing.source_provider} in ('moonshotai', 'kimi') then 'moonshot'
          when ${pricing.source_provider} in ('qwen', 'alibaba', 'aliyun') then 'alibaba-cloud'
          when ${pricing.source_provider} in ('doubao', 'volcano') then 'bytedance-volcano'
          when ${pricing.source_provider} in ('baidu', 'wenxin') then 'baidu-qianfan'
          when ${pricing.source_provider} in ('hunyuan', 'tencent') then 'tencent-hunyuan'
          else ${pricing.source_provider}
        end as source_key
      from ${pricing}
      join ${models} on ${models.id} = ${pricing.model_id}
      join ${providers} on ${providers.id} = ${models.provider_id}
    )
    select
      pk.provider,
      count(distinct ms.model_id) filter (where ms.owner_key = pk.provider or ms.model_provider_key = pk.provider or ms.provider_region = 'cn')::int as models_count,
      count(distinct ps.pricing_id) filter (
        where ps.currency_native = 'CNY'
          and ps.is_current = true
          and (ps.owner_key = pk.provider or ps.selling_key = pk.provider or ps.source_key = pk.provider)
      )::int as cny_pricing_count,
      count(distinct ps.pricing_id) filter (
        where ps.currency_native = 'CNY'
          and ps.is_current = true
          and (ps.owner_key = pk.provider or ps.selling_key = pk.provider or ps.source_key = pk.provider)
          and ps.source_url is not null and ps.source_url <> '' and ps.source_url <> 'unknown'
      )::int as source_url_count,
      count(distinct ps.pricing_id) filter (
        where ps.currency_native = 'CNY' and ps.is_current = true and ps.is_official = true
          and (ps.owner_key = pk.provider or ps.selling_key = pk.provider or ps.source_key = pk.provider)
      )::int as official_count,
      count(distinct ps.pricing_id) filter (
        where ps.currency_native = 'CNY' and ps.is_current = true and ps.is_aggregator = true
          and (ps.owner_key = pk.provider or ps.selling_key = pk.provider or ps.source_key = pk.provider)
      )::int as aggregator_count,
      count(distinct ms.model_id) filter (where ms.needs_pricing_review = true and (ms.owner_key = pk.provider or ms.model_provider_key = pk.provider))::int as needs_pricing_review_count
    from provider_keys pk
    left join model_scope ms on ms.owner_key = pk.provider or ms.model_provider_key = pk.provider or (ms.provider_region = 'cn' and pk.provider = ms.model_provider_key)
    left join pricing_scope ps on ps.owner_key = pk.provider or ps.selling_key = pk.provider or ps.source_key = pk.provider
    group by pk.provider
    order by models_count desc, pk.provider
  `);
  const rawRows = rows.rows as DomesticPricingGapRow[];
  return rawRows.map((r) => ({
    ...r,
    models_count: Number(r.models_count),
    cny_pricing_count: Number(r.cny_pricing_count),
    source_url_count: Number(r.source_url_count),
    official_count: Number(r.official_count),
    aggregator_count: Number(r.aggregator_count),
    needs_pricing_review_count: Number(r.needs_pricing_review_count),
    missing_price_model_count: Math.max(0, Number(r.models_count) - Number(r.cny_pricing_count)),
  }));
}
