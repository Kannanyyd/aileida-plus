/**
 * 价格写入 + Diff：自动 vs 人工复核分流
 */
import { and, eq } from "drizzle-orm";
import { db } from "./client.js";
import { pricing, priceChangeLog, reviewQueue } from "./schema.js";
import { diffPricing, type ExistingPricing } from "../diff/pricing-diff.js";
import type { NormalizedPricing } from "../types.js";

export interface UpsertPricingInput {
  model_id: string;
  pricing: NormalizedPricing;
}

export interface UpsertPricingResult {
  status: "inserted" | "updated" | "unchanged" | "review-queue";
  reason?: string;
  changeId?: string;
}

function toNumOrNull(v: number | null | undefined): string | null {
  if (v == null) return null;
  return String(v);
}

export async function upsertPricing(input: UpsertPricingInput): Promise<UpsertPricingResult> {
  const existing = await db
    .select()
    .from(pricing)
    .where(
      and(
        eq(pricing.model_id, input.model_id),
        eq(pricing.pricing_type, input.pricing.pricing_type ?? "api_token"),
        eq(pricing.channel, input.pricing.channel ?? "official"),
      ),
    )
    .limit(1);

  const priceValues = {
    model_id: input.model_id,
    pricing_type: input.pricing.pricing_type ?? "api_token",
    input_per_1m_usd: toNumOrNull(input.pricing.input_per_1m_usd),
    output_per_1m_usd: toNumOrNull(input.pricing.output_per_1m_usd),
    input_cached_read_per_1m_usd: toNumOrNull(input.pricing.input_cached_read_per_1m_usd),
    input_cached_write_per_1m_usd: toNumOrNull(input.pricing.input_cached_write_per_1m_usd),
    unit_amount: toNumOrNull(input.pricing.unit_amount),
    unit_amount_usd: toNumOrNull(input.pricing.unit_amount_usd),
    billing_unit: input.pricing.billing_unit ?? null,
    batch_discount: toNumOrNull(input.pricing.batch_discount),
    tiered_rules: input.pricing.tiered_rules ?? null,
    currency_native: input.pricing.currency_native ?? "USD",
    price_native: toNumOrNull(input.pricing.price_native),
    region: input.pricing.region ?? "global",
    channel: input.pricing.channel ?? "official",
    effective_start_at: input.pricing.effective_start_at ? new Date(input.pricing.effective_start_at) : null,
    effective_end_at: input.pricing.effective_end_at ? new Date(input.pricing.effective_end_at) : null,
    is_current: true,
    confidence_score: String(input.pricing.confidence_score ?? 0.8),
    primary_source_id: input.pricing.source_id ?? input.pricing.source_url,
    source_snapshot_id: null,
    source_url: input.pricing.source_url,
    source_type: input.pricing.source_type ?? "api_response",
    need_manual_review: input.pricing.need_manual_review ?? false,
  };

  if (existing.length === 0) {
    if (input.pricing.confidence_score != null && input.pricing.confidence_score < 0.7 || input.pricing.need_manual_review) {
      const [rq] = await db
        .insert(reviewQueue)
        .values({
          entity_type: "pricing",
          reason: "low-confidence-new-pricing",
          payload: { model_id: input.model_id, ...input.pricing },
          status: "pending",
        })
        .returning();
      return { status: "review-queue", reason: "low-confidence-new-pricing", changeId: rq.id };
    }
    await db.insert(pricing).values(priceValues);
    return { status: "inserted" };
  }

  const cur = existing[0];
  const existingSnapshot: ExistingPricing = {
    input_per_1m_usd: Number(cur.input_per_1m_usd ?? 0),
    output_per_1m_usd: Number(cur.output_per_1m_usd ?? 0),
    confidence_score: Number(cur.confidence_score),
    primary_source_id: cur.primary_source_id,
    source_url: cur.source_url,
  };

  const diff = diffPricing(input.pricing, existingSnapshot);

  if (diff.kind === "same") return { status: "unchanged" };

  if (diff.kind === "conflict") {
    const [rq] = await db
      .insert(reviewQueue)
      .values({
        entity_type: "pricing",
        entity_id: cur.id,
        reason: diff.reason ?? "multi-source-conflict",
        payload: { model_id: input.model_id, ...input.pricing },
        conflicts: {
          existing: existingSnapshot,
          incoming: input.pricing,
          changes: diff.changes,
        },
        status: "pending",
      })
      .returning();
    return { status: "review-queue", reason: diff.reason, changeId: rq.id };
  }

  await db
    .update(pricing)
    .set({ ...priceValues, updated_at: new Date() })
    .where(eq(pricing.id, cur.id));

  for (const c of diff.changes) {
    await db.insert(priceChangeLog).values({
      model_id: input.model_id,
      field: c.field,
      old_value: String(c.from),
      new_value: String(c.to),
      change_pct: String(c.pct.toFixed(2)),
      source_id: input.pricing.source_id ?? input.pricing.source_url,
      source_url: input.pricing.source_url,
      applied: true,
    });
  }
  return { status: "updated" };
}
