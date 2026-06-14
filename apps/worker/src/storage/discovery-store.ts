import { and, eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { latestModelCandidates, modelDiscoveryLogs, models, pricing, providers, reviewQueue } from "./schema.js";
import { upsertModel } from "./model-store.js";
import { upsertProvider } from "./provider-store.js";
import type { OfficialModelCandidate, OfficialDiscoveryResult } from "../sources/official-model-discovery.js";

async function ensureProvider(slug: string, name: string, region: "cn" | "global") {
  const found = await db.select().from(providers).where(eq(providers.slug, slug)).limit(1);
  if (found[0]) return found[0].id;
  const row = await upsertProvider({
    slug,
    name_zh: name,
    name_en: name,
    region,
    homepage: undefined,
  });
  return row.id;
}

async function findModel(slug: string) {
  const rows = await db.select().from(models).where(eq(models.slug, slug)).limit(1);
  return rows[0] ?? null;
}

async function hasCurrentPricing(modelId: string) {
  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(pricing)
    .where(and(eq(pricing.model_id, modelId), eq(pricing.is_current, true)))
    .limit(1);
  return (rows[0]?.c ?? 0) > 0;
}

async function enqueueReview(candidate: OfficialModelCandidate, modelId: string | null, reason: string) {
  const dup = await db
    .select({ id: reviewQueue.id })
    .from(reviewQueue)
    .where(and(eq(reviewQueue.entity_type, "model"), eq(reviewQueue.reason, reason), modelId ? eq(reviewQueue.entity_id, modelId) : sql`payload->>'model_slug' = ${candidate.model_slug}`))
    .limit(1);
  if (dup[0]) return false;

  await db.insert(reviewQueue).values({
    entity_type: "model",
    entity_id: modelId,
    reason,
    payload: {
      provider_slug: candidate.provider_slug,
      model_slug: candidate.model_slug,
      model_name: candidate.model_name,
      source_id: candidate.source_id,
      source_url: candidate.source_url,
      lifecycle_tier: candidate.lifecycle_tier,
      model_status: candidate.model_status,
      evidence: candidate.evidence,
    },
    conflicts: null,
    status: "pending",
  });
  return true;
}

async function upsertCandidate(candidate: OfficialModelCandidate, hasPricing: boolean, status: "known" | "inserted" | "candidate") {
  await db
    .insert(latestModelCandidates)
    .values({
      provider_slug: candidate.provider_slug,
      model_slug: candidate.model_slug,
      model_name: candidate.model_name,
      family: candidate.family,
      source_id: candidate.source_id,
      source_url: candidate.source_url,
      source_type: candidate.source_type,
      discovery_status: status,
      model_status: candidate.model_status,
      lifecycle_tier: candidate.lifecycle_tier,
      confidence_score: candidate.confidence_score.toString(),
      has_pricing: hasPricing,
      needs_pricing_review: !hasPricing,
      needs_capability_review: true,
      is_recommended_by_official: candidate.is_recommended_by_official,
      is_default_in_official_docs: candidate.is_default_in_official_docs,
      is_latest_alias: candidate.is_latest_alias,
      raw_evidence: { text: candidate.evidence },
      last_seen_at: new Date(),
      updated_at: new Date(),
    })
    .onConflictDoUpdate({
      target: [latestModelCandidates.provider_slug, latestModelCandidates.model_slug, latestModelCandidates.source_id],
      set: {
        model_name: candidate.model_name,
        family: candidate.family,
        source_url: candidate.source_url,
        discovery_status: status,
        model_status: candidate.model_status,
        lifecycle_tier: candidate.lifecycle_tier,
        confidence_score: candidate.confidence_score.toString(),
        has_pricing: hasPricing,
        needs_pricing_review: !hasPricing,
        is_recommended_by_official: candidate.is_recommended_by_official,
        is_default_in_official_docs: candidate.is_default_in_official_docs,
        is_latest_alias: candidate.is_latest_alias,
        raw_evidence: { text: candidate.evidence },
        last_seen_at: new Date(),
        updated_at: new Date(),
      },
    });
}

export async function ingestOfficialDiscovery(result: OfficialDiscoveryResult) {
  const providerId = await ensureProvider(result.source.providerSlug, result.source.providerName, result.source.region);
  let inserted = 0;
  let missingPricing = 0;

  for (const candidate of result.candidates) {
    let row = await findModel(candidate.model_slug);
    let status: "known" | "inserted" | "candidate" = row ? "known" : "candidate";

    if (!row) {
      row = await upsertModel({
        provider_id: providerId,
        slug: candidate.model_slug,
        name: candidate.model_name,
        family: candidate.family,
        modality: /image|vision|audio|video|imagine/i.test(candidate.model_name) ? ["text", "image"] : ["text"],
        capabilities: [
          /reason|thinking|deepseek-r|o[0-9]/i.test(candidate.model_name) ? "reasoning" : "",
          /code|coder|build/i.test(candidate.model_name) ? "code" : "",
          /vision|image|multimodal|imagine/i.test(candidate.model_name) ? "vision" : "",
        ].filter(Boolean),
        status: candidate.model_status === "retired" || candidate.model_status === "unknown" ? "active" : candidate.model_status,
        official_source_url: candidate.source_url,
        lifecycle_tier: candidate.lifecycle_tier,
        discovered_from: "official",
        source_confidence: candidate.confidence_score,
        needs_pricing_review: true,
        needs_capability_review: true,
        is_recommended_by_official: candidate.is_recommended_by_official,
        is_default_in_official_docs: candidate.is_default_in_official_docs,
        is_latest_alias: candidate.is_latest_alias,
      });
      inserted++;
      status = "inserted";
      await enqueueReview(candidate, row.id, "official-new-model");
    }

    const priced = row ? await hasCurrentPricing(row.id) : false;
    if (!priced) {
      missingPricing++;
      if (row) await enqueueReview(candidate, row.id, "latest-model-missing-pricing");
    }
    if (candidate.model_status === "deprecated" || candidate.model_status === "retired") {
      if (row) await enqueueReview(candidate, row.id, "possible-deprecated");
    }
    await upsertCandidate(candidate, priced, status);
  }

  return { candidates: result.candidates.length, inserted, missingPricing };
}

export async function logDiscoveryRun(input: {
  source_id: string;
  provider_slug: string;
  source_url: string;
  status: "success" | "failed" | "partial";
  candidates_found: number;
  models_inserted: number;
  missing_pricing: number;
  error_message?: string;
  duration_ms: number;
}) {
  await db.insert(modelDiscoveryLogs).values(input);
}
