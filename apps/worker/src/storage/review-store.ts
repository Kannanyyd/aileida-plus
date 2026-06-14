import { and, eq, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "./client.js";
import { reviewQueue } from "./schema.js";

export type ReviewQueueInput = {
  entity_type: string;
  entity_id?: string | null;
  reason: string;
  payload: Record<string, unknown>;
  conflicts?: unknown;
  latest_error_message?: string | null;
};

function clean(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function reviewDedupeKey(input: ReviewQueueInput) {
  const payload = input.payload ?? {};
  const parts = [
    input.reason,
    payload.provider ?? payload.provider_slug ?? payload.canonical_provider ?? payload.model_owner_provider,
    payload.model_id ?? payload.model_slug ?? payload.canonical_model_slug ?? input.entity_id,
    payload.source_url,
    payload.currency ?? payload.currency_native,
    payload.region,
    payload.pricing_type,
    payload.source_provider ?? payload.source_id,
  ];
  return createHash("sha256").update(parts.map(clean).join("|")).digest("hex");
}

export async function upsertReviewQueue(input: ReviewQueueInput) {
  const dedupeKey = reviewDedupeKey(input);
  const [existing] = await db
    .select({ id: reviewQueue.id, occurrence_count: reviewQueue.occurrence_count })
    .from(reviewQueue)
    .where(and(eq(reviewQueue.status, "pending"), eq(reviewQueue.dedupe_key, dedupeKey)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(reviewQueue)
      .set({
        last_seen_at: new Date(),
        occurrence_count: sql`${reviewQueue.occurrence_count} + 1`,
        latest_payload: input.payload,
        latest_error_message: input.latest_error_message ?? null,
        conflicts: input.conflicts ?? null,
      })
      .where(eq(reviewQueue.id, existing.id))
      .returning();
    return { row: updated, inserted: false };
  }

  const [inserted] = await db
    .insert(reviewQueue)
    .values({
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      reason: input.reason,
      payload: input.payload,
      conflicts: input.conflicts ?? null,
      status: "pending",
      dedupe_key: dedupeKey,
      last_seen_at: new Date(),
      occurrence_count: 1,
      latest_payload: input.payload,
      latest_error_message: input.latest_error_message ?? null,
    })
    .returning();
  return { row: inserted, inserted: true };
}
