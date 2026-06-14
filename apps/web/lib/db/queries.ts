/**
 * 通用查询：models 列表 + 价格 + 厂商聚合
 */
import { db } from "./client";
import { models, pricing, providers, priceChangeLog, promotions, latestModelCandidates, modelDiscoveryLogs, providerAliases, reviewQueue } from "./schema";
import { desc, eq, sql, and, gte, isNotNull, inArray } from "drizzle-orm";
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

export interface ModelWithPricing {
  model_id: string;
  model_slug: string;
  model_name: string;
  family: string | null;
  release_date: string | null;
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
}

const baseSelect = {
  model_id: models.id,
  model_slug: models.slug,
  model_name: models.name,
  family: models.family,
  release_date: models.release_date,
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
    release_date: r.release_date ? String(r.release_date) : null,
    input_per_1m_usd: toNumber(r.input_per_1m_usd),
    output_per_1m_usd: toNumber(r.output_per_1m_usd),
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
    }
  }

  return consolidated.sort((a, b) => hotModelScore(b) - hotModelScore(a)).slice(0, filter?.limit ?? 200);
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
  return consolidateModelRows(rows.map(normalizeModelRow))[0] ?? null;
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

export async function domesticPricingGapAudit() {
  const domesticProviders = [
    "deepseek",
    "alibaba-cloud",
    "aliyun-bailian",
    "bytedance-volcano",
    "volcengine",
    "tencent-hunyuan",
    "baidu-qianfan",
    "zhipu",
    "moonshot",
    "minimax",
    "siliconflow",
    "modelscope",
  ];
  const rows = await db
    .select({
      provider: sql<string>`coalesce(${providers.canonical_slug}, ${providers.slug})`,
      models_count: sql<number>`count(distinct ${models.id})::int`,
      cny_pricing_count: sql<number>`count(distinct case when ${pricing.currency_native} = 'CNY' and ${pricing.is_current} = true then ${pricing.id} end)::int`,
      source_url_count: sql<number>`count(distinct case when ${pricing.source_url} is not null and ${pricing.source_url} <> '' and ${pricing.source_url} <> 'unknown' then ${pricing.id} end)::int`,
      official_count: sql<number>`count(distinct case when ${pricing.is_official} = true then ${pricing.id} end)::int`,
      aggregator_count: sql<number>`count(distinct case when ${pricing.is_aggregator} = true then ${pricing.id} end)::int`,
      needs_pricing_review_count: sql<number>`count(distinct case when ${models.needs_pricing_review} = true then ${models.id} end)::int`,
    })
    .from(models)
    .innerJoin(providers, eq(providers.id, models.provider_id))
    .leftJoin(pricing, eq(pricing.model_id, models.id))
    .where(sql`coalesce(${providers.canonical_slug}, ${providers.slug}) = any(${domesticProviders}) or ${providers.region} = 'cn'`)
    .groupBy(sql`coalesce(${providers.canonical_slug}, ${providers.slug})`)
    .orderBy(desc(sql<number>`count(distinct ${models.id})::int`));
  return rows.map((r) => ({
    ...r,
    missing_price_model_count: Math.max(0, r.models_count - r.cny_pricing_count),
  }));
}
