import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { models, pricing, providers, reviewAuditLogs, reviewQueue, sourceSnapshots } from "@/lib/db/schema";
import { config } from "@/lib/env";

export type ReviewFilters = {
  reason?: string;
  provider?: string;
  canonical_provider?: string;
  model_family?: string;
  currency?: string;
  region?: string;
  source_provider?: string;
  selling_platform_provider?: string;
  status?: string;
  has_source_url?: string;
  has_snapshot?: string;
  confidence_min?: number;
  created_from?: string;
  created_to?: string;
  q?: string;
  sort?: string;
  limit?: number;
};

const HIGH_IMPACT_REASONS = [
  "pricing-conflict",
  "multi-source-divergence",
  "low-confidence-new-pricing",
  "latest-model-missing-pricing",
  "domestic-price-missing",
];

function payloadText(key: string) {
  return sql<string>`coalesce(${reviewQueue.payload}->>${key}, ${reviewQueue.latest_payload}->>${key}, '')`;
}

function dedupeExpression() {
  return sql<string>`md5(
    ${reviewQueue.reason} || '|' ||
    coalesce(${reviewQueue.payload}->>'provider_slug', ${reviewQueue.payload}->>'provider', ${reviewQueue.payload}->>'canonical_provider', ${reviewQueue.payload}->>'model_owner_provider', ${reviewQueue.payload}->>'source_provider', '') || '|' ||
    coalesce(${reviewQueue.payload}->>'model_id', ${reviewQueue.payload}->>'model_slug', ${reviewQueue.payload}->>'canonical_model_slug', ${reviewQueue.entity_id}::text, '') || '|' ||
    coalesce(${reviewQueue.payload}->>'source_url', '') || '|' ||
    coalesce(${reviewQueue.payload}->>'currency_native', '') || '|' ||
    coalesce(${reviewQueue.payload}->>'region', '') || '|' ||
    coalesce(${reviewQueue.payload}->>'pricing_type', '') || '|' ||
    coalesce(${reviewQueue.payload}->>'source_provider', '')
  )`;
}

export async function listReviewQueue(filters: ReviewFilters) {
  const where = [];
  if (filters.reason) where.push(eq(reviewQueue.reason, filters.reason));
  if (filters.status) where.push(eq(reviewQueue.status, filters.status));
  if (filters.provider) {
    where.push(sql`(
      ${reviewQueue.payload}->>'provider_slug' = ${filters.provider}
      or ${reviewQueue.payload}->>'provider' = ${filters.provider}
      or ${reviewQueue.payload}->>'model_owner_provider' = ${filters.provider}
      or ${reviewQueue.payload}->>'source_provider' = ${filters.provider}
      or ${reviewQueue.payload}->>'selling_platform_provider' = ${filters.provider}
    )`);
  }
  if (filters.canonical_provider) where.push(sql`${reviewQueue.payload}->>'canonical_provider' = ${filters.canonical_provider}`);
  if (filters.model_family) where.push(sql`${reviewQueue.payload}->>'model_family' = ${filters.model_family}`);
  if (filters.currency) where.push(sql`${reviewQueue.payload}->>'currency_native' = ${filters.currency}`);
  if (filters.region) where.push(sql`${reviewQueue.payload}->>'region' = ${filters.region}`);
  if (filters.source_provider) where.push(sql`${reviewQueue.payload}->>'source_provider' = ${filters.source_provider}`);
  if (filters.selling_platform_provider) where.push(sql`${reviewQueue.payload}->>'selling_platform_provider' = ${filters.selling_platform_provider}`);
  if (filters.has_source_url === "true") where.push(sql`length(coalesce(${reviewQueue.payload}->>'source_url', '')) > 0`);
  if (filters.has_source_url === "false") where.push(sql`length(coalesce(${reviewQueue.payload}->>'source_url', '')) = 0`);
  if (filters.has_snapshot === "true") where.push(sql`length(coalesce(${reviewQueue.payload}->>'source_snapshot_id', '')) > 0`);
  if (filters.has_snapshot === "false") where.push(sql`length(coalesce(${reviewQueue.payload}->>'source_snapshot_id', '')) = 0`);
  if (filters.confidence_min != null) where.push(sql`coalesce((${reviewQueue.payload}->>'confidence')::numeric, (${reviewQueue.payload}->>'confidence_score')::numeric, 0) >= ${filters.confidence_min}`);
  if (filters.created_from) where.push(sql`${reviewQueue.created_at} >= ${new Date(filters.created_from)}`);
  if (filters.created_to) where.push(sql`${reviewQueue.created_at} <= ${new Date(filters.created_to)}`);
  if (filters.q) where.push(sql`cast(${reviewQueue.payload} as text) ilike ${`%${filters.q}%`}`);

  const confidenceExpr = sql<number>`coalesce((${reviewQueue.payload}->>'confidence')::numeric, (${reviewQueue.payload}->>'confidence_score')::numeric, 0)`;
  const priorityExpr = sql<number>`case ${reviewQueue.reason}
    when 'pricing-conflict' then 10
    when 'multi-source-divergence' then 9
    when 'low-confidence-new-pricing' then 8
    when 'latest-model-missing-pricing' then 7
    when 'domestic-price-missing' then 6
    else 0
  end`;
  const orderBy =
    filters.sort === "occurrence_desc" ? [desc(reviewQueue.occurrence_count), desc(reviewQueue.last_seen_at)] :
    filters.sort === "confidence_desc" ? [desc(confidenceExpr), desc(reviewQueue.created_at)] :
    filters.sort === "confidence_asc" ? [asc(confidenceExpr), desc(reviewQueue.created_at)] :
    filters.sort === "created_desc" ? [desc(reviewQueue.created_at)] :
    filters.sort === "last_seen_desc" ? [desc(reviewQueue.last_seen_at)] :
    [desc(priorityExpr), desc(reviewQueue.occurrence_count), desc(reviewQueue.last_seen_at), desc(reviewQueue.created_at)];

  const rows = await db
    .select({
      id: reviewQueue.id,
      entity_type: reviewQueue.entity_type,
      entity_id: reviewQueue.entity_id,
      reason: reviewQueue.reason,
      status: reviewQueue.status,
      payload: reviewQueue.payload,
      conflicts: reviewQueue.conflicts,
      dedupe_key: reviewQueue.dedupe_key,
      occurrence_count: reviewQueue.occurrence_count,
      last_seen_at: reviewQueue.last_seen_at,
      created_at: reviewQueue.created_at,
      source_url: payloadText("source_url"),
      provider: sql<string>`coalesce(${reviewQueue.payload}->>'provider_slug', ${reviewQueue.payload}->>'provider', ${reviewQueue.payload}->>'model_owner_provider', ${reviewQueue.payload}->>'source_provider', '')`,
      canonical_provider: sql<string>`coalesce(${reviewQueue.payload}->>'canonical_provider', ${reviewQueue.payload}->>'model_owner_provider', ${reviewQueue.payload}->>'provider_slug', ${reviewQueue.payload}->>'provider', '')`,
      model: sql<string>`coalesce(${reviewQueue.payload}->>'model_slug', ${reviewQueue.payload}->>'canonical_model_slug', ${reviewQueue.payload}->>'model_id', '')`,
      currency: payloadText("currency_native"),
      region: payloadText("region"),
      confidence: confidenceExpr,
    })
    .from(reviewQueue)
    .where(where.length ? and(...where) : undefined)
    .orderBy(...orderBy)
    .limit(Math.min(filters.limit ?? 100, 500));
  return rows;
}

export async function getReviewDetail(id: string) {
  const [item] = await db.select().from(reviewQueue).where(eq(reviewQueue.id, id)).limit(1);
  if (!item) return null;
  const payload = item.latest_payload ?? item.payload;
  const modelId = (payload as any)?.model_id ?? item.entity_id ?? null;
  const sourceUrl = (payload as any)?.source_url;
  const sourceId = (payload as any)?.source_id ?? (payload as any)?.primary_source_id;
  const existingPricing = modelId
    ? await db.select().from(pricing).where(eq(pricing.model_id, modelId)).orderBy(desc(pricing.updated_at)).limit(50)
    : [];
  const snapshots = await db
    .select({
      id: sourceSnapshots.id,
      source_id: sourceSnapshots.source_id,
      url: sourceSnapshots.url,
      fetched_at: sourceSnapshots.fetched_at,
      raw_content: sql<string>`left(${sourceSnapshots.raw_content}, 4000)`,
    })
    .from(sourceSnapshots)
    .where(sourceId ? eq(sourceSnapshots.source_id, sourceId) : sourceUrl ? eq(sourceSnapshots.url, sourceUrl) : sql`false`)
    .orderBy(desc(sourceSnapshots.fetched_at))
    .limit(3);
  return { item, existingPricing, snapshots };
}

function numOrNull(v: unknown) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : null;
}

function cnyToUsd(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return String(Math.round((n / config.fx.usdCny) * 1e8) / 1e8);
}

async function logReviewAction(reviewId: string, action: string, before: unknown, after: unknown, message?: string) {
  await db.insert(reviewAuditLogs).values({
    review_id: reviewId,
    action,
    actor: "admin",
    before,
    after,
    message,
  });
}

export async function setReviewStatus(id: string, status: string, message?: string) {
  const [before] = await db.select().from(reviewQueue).where(eq(reviewQueue.id, id)).limit(1);
  if (!before) throw new Error("Review item not found");
  const [after] = await db
    .update(reviewQueue)
    .set({
      status,
      resolution: { action: status, message, at: new Date().toISOString() },
      resolved_at: ["rejected", "ignored", "ignored_duplicate", "resolved", "approved"].includes(status) ? new Date() : null,
    })
    .where(eq(reviewQueue.id, id))
    .returning();
  await logReviewAction(id, status, before, after, message);
  return after;
}

export async function approvePricingReview(id: string, override: Record<string, unknown> = {}) {
  const detail = await getReviewDetail(id);
  if (!detail) throw new Error("Review item not found");
  const item = detail.item;
  const payload = { ...(item.latest_payload as any ?? item.payload as any), ...override };
  const modelId = payload.model_id ?? item.entity_id;
  if (!modelId) throw new Error("Pricing review has no model_id");
  const currencyRaw = payload.currency_native;
  if (!currencyRaw) throw new Error("currency_native is required before approve");
  const currency = String(currencyRaw).toUpperCase();
  const inputNative = payload.input_price ?? payload.inputCny ?? payload.input_per_1m ?? payload.price_native ?? payload.input_per_1m_usd;
  const outputNative = payload.output_price ?? payload.outputCny ?? payload.output_per_1m ?? payload.output_per_1m_usd;
  if (inputNative == null && outputNative == null) throw new Error("input_price or output_price is required before approve");
  const inputUsd = currency === "CNY" ? cnyToUsd(inputNative) : numOrNull(payload.input_per_1m_usd ?? inputNative);
  const outputUsd = currency === "CNY" ? cnyToUsd(outputNative) : numOrNull(payload.output_per_1m_usd ?? outputNative);
  const sourceUrl = String(payload.source_url ?? "");
  if (!sourceUrl) throw new Error("Pricing review requires source_url before approve");
  if (!payload.region) throw new Error("region is required before approve");
  if (!payload.billing_unit) throw new Error("billing_unit is required before approve");
  if (currency === "CNY" && numOrNull(inputNative) == null && numOrNull(outputNative) == null) {
    throw new Error("CNY pricing must keep native CNY input_price or output_price");
  }
  const sellingPlatform = payload.selling_platform_provider ? String(payload.selling_platform_provider) : null;
  const channel = String(payload.channel ?? "official_api");
  const region = String(payload.region);

  const existingConflict = await db
    .select({
      id: pricing.id,
      primary_source_id: pricing.primary_source_id,
      source_url: pricing.source_url,
    })
    .from(pricing)
    .where(and(
      eq(pricing.model_id, String(modelId)),
      eq(pricing.currency_native, currency),
      eq(pricing.region, region),
      eq(pricing.channel, channel),
      sellingPlatform ? eq(pricing.selling_platform_provider, sellingPlatform) : sql`${pricing.selling_platform_provider} is null`,
      sql`${pricing.primary_source_id} <> ${String(payload.source_id ?? payload.primary_source_id ?? "manual-review")}`,
    ))
    .limit(1);
  if (existingConflict[0] && !payload.confirm_conflict) {
    throw new Error(`Existing pricing conflict requires confirmation: ${existingConflict[0].id}`);
  }

  const priceValues = {
    model_id: String(modelId),
    pricing_type: String(payload.pricing_type ?? "api_token"),
    input_per_1m_usd: inputUsd,
    output_per_1m_usd: outputUsd,
    input_cached_read_per_1m_usd: currency === "CNY" ? cnyToUsd(payload.cached_input_price ?? payload.cacheReadCny) : numOrNull(payload.input_cached_read_per_1m_usd ?? payload.cached_input_price),
    billing_unit: String(payload.billing_unit),
    tiered_rules: currency === "CNY" ? [{ up_to: 1000000, input_per_1m: Number(inputNative), output_per_1m: Number(outputNative), unit: "CNY_per_1M_tokens" }] : null,
    currency_native: currency,
    price_native: numOrNull(inputNative),
    region,
    channel,
    platform: payload.platform ? String(payload.platform) : null,
    selling_platform_provider: sellingPlatform,
    source_provider: payload.source_provider ? String(payload.source_provider) : null,
    is_official: payload.is_official ?? payload.channel === "official_api",
    is_aggregator: payload.is_aggregator ?? payload.channel === "aggregator",
    is_domestic: payload.is_domestic ?? currency === "CNY",
    is_current: true,
    confidence_score: String(payload.confidence ?? payload.confidence_score ?? 0.8),
    primary_source_id: String(payload.source_id ?? payload.primary_source_id ?? "manual-review"),
    source_url: sourceUrl,
    source_type: String(payload.source_type ?? "official_page"),
    need_manual_review: false,
    data_quality_flags: Array.isArray(payload.data_quality_flags) ? payload.data_quality_flags : [],
    updated_at: new Date(),
  };
  const [inserted] = await db.insert(pricing).values(priceValues).onConflictDoUpdate({
    target: [pricing.model_id, pricing.pricing_type, pricing.channel, pricing.region, pricing.primary_source_id],
    set: priceValues,
  }).returning();
  const after = await setReviewStatus(id, "approved", "Approved pricing into pricing table");
  await logReviewAction(id, "approve-pricing", item, { review: after, pricing: inserted });
  return { review: after, pricing: inserted };
}

export function reviewFiltersFromUrl(url: URL): ReviewFilters {
  return {
    reason: url.searchParams.get("reason") ?? undefined,
    provider: url.searchParams.get("provider") ?? undefined,
    canonical_provider: url.searchParams.get("canonical_provider") ?? undefined,
    model_family: url.searchParams.get("model_family") ?? undefined,
    currency: url.searchParams.get("currency") ?? undefined,
    region: url.searchParams.get("region") ?? undefined,
    source_provider: url.searchParams.get("source_provider") ?? undefined,
    selling_platform_provider: url.searchParams.get("selling_platform_provider") ?? undefined,
    status: url.searchParams.get("status") ?? "pending",
    has_source_url: url.searchParams.get("has_source_url") ?? undefined,
    has_snapshot: url.searchParams.get("has_snapshot") ?? undefined,
    confidence_min: url.searchParams.get("confidence_min") ? Number(url.searchParams.get("confidence_min")) : undefined,
    created_from: url.searchParams.get("created_from") ?? undefined,
    created_to: url.searchParams.get("created_to") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 100),
  };
}
