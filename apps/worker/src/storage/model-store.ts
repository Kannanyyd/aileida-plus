/**
 * 模型写入：upsert with ON CONFLICT (prevents race conditions across sources)
 */
import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { models } from "./schema.js";

function normalizeModelSlug(value: string): string {
  return value.toLowerCase().replace(/^[~@]/, "").replace(/[:_\s]+/g, "-").replace(/[^a-z0-9./-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function inferFamily(slug: string, family?: string) {
  const raw = normalizeModelSlug(family || slug).split("/").pop() ?? normalizeModelSlug(slug);
  const cleaned = raw
    .replace(/-\d{4}[-_]\d{2}[-_]\d{2}$/g, "")
    .replace(/-\d{6,8}$/g, "")
    .replace(/-(latest|preview|beta|experimental|instruct|chat|online|reasoning|non-reasoning|thinking)$/g, "");
  if (/^grok-4-1-fast/.test(cleaned)) return "grok-4-1-fast";
  if (/^grok-4/.test(cleaned)) return "grok-4";
  if (/^gpt-5/.test(cleaned)) return "gpt-5";
  if (/^claude-/.test(cleaned)) return cleaned.split("-").slice(0, 3).join("-");
  if (/^gemini-/.test(cleaned)) return cleaned.split("-").slice(0, 3).join("-");
  if (/^qwen3/.test(cleaned)) return cleaned.split("-").slice(0, 2).join("-");
  if (/^deepseek-/.test(cleaned)) return cleaned.split("-").slice(0, 2).join("-");
  return cleaned.split(/[/-]/).slice(0, 3).join("-");
}

function inferVariant(slug: string) {
  const s = normalizeModelSlug(slug);
  const tags: string[] = [];
  if (/preview|beta|experimental/.test(s)) tags.push("preview");
  if (/latest/.test(s)) tags.push("latest");
  if (/non[-_]?reasoning/.test(s)) tags.push("non-reasoning");
  else if (/reasoning|thinking|deep-research/.test(s)) tags.push("reasoning");
  if (/mini|small|lite|nano|flash/.test(s)) tags.push("light");
  if (/pro|large|opus|max|ultra/.test(s)) tags.push("pro");
  if (/fast|turbo/.test(s)) tags.push("fast");
  return tags.length > 0 ? tags.join("+") : "base";
}

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
  canonical_model_slug?: string;
  model_family?: string;
  model_variant?: string;
  model_owner_provider?: string;
  selling_platform_provider?: string;
  source_provider?: string;
  source_model_id?: string;
  data_quality_flags?: string[];
  needs_alias_review?: boolean;
}) {
  const now = new Date();
  const sourceModelId = m.source_model_id ?? m.slug;
  const owner = m.model_owner_provider ?? (m.slug.includes("/") ? m.slug.split("/")[0] : undefined);
  const canonicalSlug = m.canonical_model_slug ?? `${owner ?? "unknown"}/${normalizeModelSlug(m.slug)}`;
  const modelFamily = m.model_family ?? inferFamily(m.slug, m.family);
  const modelVariant = m.model_variant ?? inferVariant(m.slug);
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
      canonical_model_slug: canonicalSlug,
      model_family: modelFamily,
      model_variant: modelVariant,
      model_owner_provider: owner,
      selling_platform_provider: m.selling_platform_provider,
      source_provider: m.source_provider,
      source_model_id: sourceModelId,
      data_quality_flags: m.data_quality_flags ?? [],
      needs_alias_review: m.needs_alias_review ?? false,
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
        canonical_model_slug: canonicalSlug,
        model_family: modelFamily,
        model_variant: modelVariant,
        model_owner_provider: owner,
        selling_platform_provider: m.selling_platform_provider,
        source_provider: m.source_provider,
        source_model_id: sourceModelId,
        data_quality_flags: m.data_quality_flags ?? [],
        needs_alias_review: m.needs_alias_review ?? false,
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
