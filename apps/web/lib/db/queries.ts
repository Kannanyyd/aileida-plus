/**
 * 通用查询：models 列表 + 价格 + 厂商聚合
 */
import { db } from "./client";
import { models, pricing, providers, priceChangeLog, promotions } from "./schema";
import { desc, eq, sql, and, gte, isNotNull, inArray } from "drizzle-orm";

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
  input_per_1m_usd: number | null;
  output_per_1m_usd: number | null;
  input_cached_read_per_1m_usd: number | null;
  batch_discount: number | null;
  currency_native: string;
  pricing_region: string;
  channel: string;
  platform: string | null;
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
  input_per_1m_usd: pricing.input_per_1m_usd,
  output_per_1m_usd: pricing.output_per_1m_usd,
  input_cached_read_per_1m_usd: pricing.input_cached_read_per_1m_usd,
  batch_discount: pricing.batch_discount,
  currency_native: pricing.currency_native,
  pricing_region: pricing.region,
  channel: pricing.channel,
  platform: pricing.platform,
  is_official: pricing.is_official,
  is_aggregator: pricing.is_aggregator,
  is_domestic: pricing.is_domestic,
  confidence_score: pricing.confidence_score,
  primary_source_id: pricing.primary_source_id,
  source_url: pricing.source_url,
  need_manual_review: pricing.need_manual_review,
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
  return {
    ...r,
    release_date: r.release_date ? String(r.release_date) : null,
    input_per_1m_usd: toNumber(r.input_per_1m_usd),
    output_per_1m_usd: toNumber(r.output_per_1m_usd),
    input_cached_read_per_1m_usd: toNumber(r.input_cached_read_per_1m_usd),
    batch_discount: toNumber(r.batch_discount),
    confidence_score: Number(r.confidence_score),
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

function consolidateModelRows(rows: ReturnType<typeof normalizeModelRow>[]): ModelWithPricing[] {
  const groups = new Map<string, ModelWithPricing[]>();
  for (const row of rows) {
    const list = groups.get(row.model_id) ?? [];
    list.push(row);
    groups.set(row.model_id, list);
  }

  return Array.from(groups.values()).map((group) => {
    const representative = [...group].sort((a, b) => {
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
      confidence_score: Math.max(...group.map((r) => r.confidence_score)),
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
  if (filter?.providerSlug) conditions.push(eq(providers.slug, filter.providerSlug));
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

  return consolidateModelRows(rows.map(normalizeModelRow)).slice(0, filter?.limit ?? 200);
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
  const r = rows[0];
  return normalizeModelRow(r);
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
  is_official: boolean;
  is_aggregator: boolean;
  is_domestic: boolean;
  confidence_score: number;
  source_url: string;
  primary_source_id: string;
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
      is_official: pricing.is_official,
      is_aggregator: pricing.is_aggregator,
      is_domestic: pricing.is_domestic,
      confidence_score: pricing.confidence_score,
      source_url: pricing.source_url,
      primary_source_id: pricing.primary_source_id,
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
    .orderBy(providers.name_zh);
  return rows.map((r) => ({
    ...r,
    profile_confidence_score: r.profile_confidence_score != null ? Number(r.profile_confidence_score) : null,
  }));
}

export async function getProviderBySlug(slug: string) {
  const rows = await db
    .select()
    .from(providers)
    .where(eq(providers.slug, slug))
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
