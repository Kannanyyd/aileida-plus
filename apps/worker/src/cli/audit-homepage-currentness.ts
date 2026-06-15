import { pool } from "../storage/client.js";

function printSection(title: string, value: unknown) {
  console.log(`\n## ${title}`);
  console.log(JSON.stringify(value, null, 2));
}

async function fetchJson(url: string) {
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text) as Record<string, unknown>;
}

function summarizeItem(item: Record<string, unknown>) {
  return {
    rank: item.rank,
    model_slug: item.model_slug,
    display_name: item.model_name,
    provider: item.raw_provider,
    canonical_provider: item.provider,
    model_family: item.family,
    lifecycle_tier: item.tier,
    freshness_status: item.freshness_status,
    freshness_status_deprecated: item.freshness_status_deprecated,
    source_freshness_status: item.source_freshness_status,
    model_recency_status: item.model_recency_status,
    source_checked_at: item.source_checked_at,
    source_age_hours: item.source_age_hours,
    pricing_checked_at: item.pricing_checked_at,
    pricing_age_hours: item.pricing_age_hours,
    official_source_url: item.official_current_source_url,
    official_release_date: item.official_release_date,
    is_official_current: item.is_official_current,
    is_official_recommended: item.is_official_recommended,
    official_current_catalog_match: item.official_current_catalog_match,
    official_current_model_slug: item.official_current_model_slug,
    official_current_model_family: item.official_current_model_family,
    official_current_source_kind: item.official_current_source_kind,
    official_current_alias_slug: item.official_current_alias_slug,
    official_current_alias_needs_review: item.official_current_alias_needs_review,
    official_current_status: item.official_current_status,
    official_current_confidence: item.official_current_confidence,
    has_newer_family_model: item.has_newer_family_model,
    superseded_by_model_id: item.superseded_by_model_id,
    discovered_from: item.source_provider,
    source_confidence: item.source_confidence_score,
    input_price: item.input_per_1m_usd,
    output_price: item.output_per_1m_usd,
    currency: item.currency_native,
    region: item.pricing_region,
    why_ranked: item.why_ranked,
  };
}

async function main() {
  const baseUrl = process.env.WEB_BASE_URL ?? "http://web:3000";
  const beforeLikeUrl = `${baseUrl}/api/v1/rankings/frontier-value?limit=8&diversity_mode=true&max_source_age_hours=12&hide_stale=true&hide_superseded=true&hide_legacy=true`;
  const strictUrl = `${beforeLikeUrl}&homepage_strict=true&require_official_current=true`;
  const beforeLike = await fetchJson(beforeLikeUrl);
  const strict = await fetchJson(strictUrl);
  const strictItems = ((strict.items ?? []) as Record<string, unknown>[]).map(summarizeItem);

  const failing = strictItems.filter((item) =>
    item.source_freshness_status !== "fresh" ||
    !["current", "recent"].includes(String(item.model_recency_status)) ||
    !item.official_current_catalog_match ||
    !item.official_source_url ||
    item.has_newer_family_model ||
    item.superseded_by_model_id,
  );
  const familyKeys = strictItems.map((item) => `${item.canonical_provider}/${item.official_current_model_slug ?? item.model_family ?? item.model_slug}`);
  const duplicateFamilies = familyKeys.filter((key, index) => familyKeys.indexOf(key) !== index);
  const geminiDuplicates = strictItems.filter((item) => item.canonical_provider === "google").map((item) => item.official_current_model_slug ?? item.model_slug);
  const grokDuplicates = strictItems.filter((item) => item.canonical_provider === "xai").map((item) => item.official_current_model_slug ?? item.model_slug);
  const aliasReviewItems = strictItems.filter((item) => item.official_current_alias_needs_review);
  const missingDeprecatedMarker = strictItems.filter((item) => item.freshness_status != null && !(item as Record<string, unknown>).freshness_status_deprecated);

  printSection("homepage top8 before-like ranking", ((beforeLike.items ?? []) as Record<string, unknown>[]).map(summarizeItem));
  printSection("homepage top8 official-current strict", strictItems);
  printSection("homepage currentness checks", {
    all_official_current_or_recommended: strictItems.every((item) => Boolean(item.official_current_catalog_match) && Boolean(item.official_source_url) && (Boolean(item.is_official_current) || Boolean(item.is_official_recommended))),
    previous_stale_unknown_count: strictItems.filter((item) => ["previous", "stale", "unknown"].includes(String(item.model_recency_status))).length,
    missing_official_source_count: strictItems.filter((item) => !item.official_source_url).length,
    source_fresh_but_model_not_current_count: strictItems.filter((item) => item.source_freshness_status === "fresh" && !["current", "recent"].includes(String(item.model_recency_status))).length,
    superseded_count: strictItems.filter((item) => item.has_newer_family_model || item.superseded_by_model_id).length,
    official_alias_duplicate_count: duplicateFamilies.length,
    duplicate_official_representatives: Array.from(new Set(duplicateFamilies)),
    gemini_alias_dedupe_ok: new Set(geminiDuplicates).size === geminiDuplicates.length,
    grok_alias_dedupe_ok: new Set(grokDuplicates).size === grokDuplicates.length,
    alias_review_items_count: aliasReviewItems.length,
    freshness_status_has_deprecated_marker: missingDeprecatedMarker.length === 0,
    failing,
  });
  if (failing.length > 0 || duplicateFamilies.length > 0 || aliasReviewItems.length > 0 || missingDeprecatedMarker.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error("audit:homepage-currentness failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
