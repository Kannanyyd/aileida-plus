/**
 * 模型写入：upsert with ON CONFLICT (prevents race conditions across sources)
 */
import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { models } from "./schema.js";

export async function upsertModel(m: {
  provider_id: string;
  slug: string;
  name: string;
  family?: string;
  modality?: string[];
  context_length?: number;
  max_output_tokens?: number;
  capabilities?: string[];
  release_date?: string;
  status?: "active" | "beta" | "deprecated" | "preview" | "retired" | "unknown";
  official_source_url?: string;
  lifecycle_tier?: string;
  discovered_from?: "official" | "aggregator" | "pricing_source" | "manual";
  source_confidence?: number;
  needs_pricing_review?: boolean;
  needs_capability_review?: boolean;
  is_recommended_by_official?: boolean;
  is_default_in_official_docs?: boolean;
  is_latest_alias?: boolean;
}) {
  const now = new Date();
  const [u] = await db
    .insert(models)
    .values({
      provider_id: m.provider_id,
      slug: m.slug,
      name: m.name,
      family: m.family,
      modality: m.modality ?? ["text"],
      context_length: m.context_length,
      max_output_tokens: m.max_output_tokens,
      capabilities: m.capabilities ?? [],
      release_date: m.release_date,
      status: m.status ?? "active",
      official_release_date: m.release_date,
      official_updated_at: m.official_source_url ? now : undefined,
      official_source_url: m.official_source_url,
      lifecycle_tier: m.lifecycle_tier ?? "unknown",
      discovered_from: m.discovered_from ?? "pricing_source",
      source_confidence: (m.source_confidence ?? 0.7).toString(),
      needs_pricing_review: m.needs_pricing_review ?? false,
      needs_capability_review: m.needs_capability_review ?? false,
      is_recommended_by_official: m.is_recommended_by_official ?? false,
      is_default_in_official_docs: m.is_default_in_official_docs ?? false,
      is_latest_alias: m.is_latest_alias ?? false,
      first_seen_at: now,
      last_seen_at: now,
    })
    .onConflictDoUpdate({
      target: models.slug,
      set: {
        name: m.name,
        family: m.family,
        modality: m.modality ?? ["text"],
        context_length: m.context_length,
        max_output_tokens: m.max_output_tokens,
        capabilities: m.capabilities ?? [],
        release_date: m.release_date,
        status: m.status ?? "active",
        official_release_date: m.release_date,
        official_updated_at: m.official_source_url ? now : undefined,
        official_source_url: m.official_source_url,
        lifecycle_tier: m.lifecycle_tier ?? "unknown",
        discovered_from: m.discovered_from ?? "pricing_source",
        source_confidence: (m.source_confidence ?? 0.7).toString(),
        needs_pricing_review: m.needs_pricing_review ?? false,
        needs_capability_review: m.needs_capability_review ?? false,
        is_recommended_by_official: m.is_recommended_by_official ?? false,
        is_default_in_official_docs: m.is_default_in_official_docs ?? false,
        is_latest_alias: m.is_latest_alias ?? false,
        last_seen_at: now,
        updated_at: new Date(),
      },
    })
    .returning();
  return u;
}

export async function findModelByExternalId(externalId: string) {
  const slug = externalId.includes("/") ? externalId.split("/").slice(1).join("/") : externalId;
  const rows = await db.select().from(models).where(eq(models.slug, slug)).limit(1);
  return rows[0] ?? null;
}
