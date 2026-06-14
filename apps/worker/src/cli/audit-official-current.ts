import { pool } from "../storage/client.js";
import type { QueryResultRow } from "pg";

interface OfficialCurrentModel {
  provider: string;
  modelSlug: string;
  aliases?: string[];
  modelFamily: string;
  officialName: string;
  officialSourceUrl: string;
  officialStatus: string;
  officialCheckedAt: string;
  confidence: number;
  notes?: string;
  homepageEligible?: boolean;
  needsPricingReview?: boolean;
}

async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

function printSection(title: string, value: unknown) {
  console.log(`\n## ${title}`);
  console.log(JSON.stringify(value, null, 2));
}

async function loadOfficialCatalog() {
  const mod = await import(new URL("../../../../packages/pricing-core/src/official-current/index.ts", import.meta.url).href) as {
    OFFICIAL_CURRENT_MODELS: OfficialCurrentModel[];
    OFFICIAL_CURRENT_PROVIDERS: string[];
    providerOfficialCurrentModels: (provider: string) => OfficialCurrentModel[];
  };
  return mod;
}

async function modelCoverage(entry: OfficialCurrentModel) {
  const slugs = [entry.modelSlug, ...(entry.aliases ?? [])];
  const rows = await query<{
    model_id: string;
    model_slug: string;
    model_name: string;
    provider_slug: string;
    canonical_provider_slug: string | null;
    model_owner_provider: string | null;
    lifecycle_tier: string | null;
    needs_pricing_review: boolean | null;
    pricing_count: number;
    cny_pricing_count: number;
    usd_pricing_count: number;
  }>(`
    select
      m.id as model_id,
      m.slug as model_slug,
      m.name as model_name,
      p.slug as provider_slug,
      p.canonical_slug as canonical_provider_slug,
      m.model_owner_provider,
      m.lifecycle_tier,
      m.needs_pricing_review,
      count(pr.id)::int as pricing_count,
      count(pr.id) filter (where pr.currency_native = 'CNY' and pr.region = 'china_mainland')::int as cny_pricing_count,
      count(pr.id) filter (where pr.currency_native = 'USD')::int as usd_pricing_count
    from models m
    join providers p on p.id = m.provider_id
    left join pricing pr on pr.model_id = m.id and pr.is_current = true and pr.pricing_type = 'api_token'
    where m.slug = any($1::text[])
      and (
        coalesce(m.model_owner_provider, p.canonical_slug, p.slug) = $2
        or coalesce(p.canonical_slug, p.slug) = $2
        or p.slug = $2
      )
    group by m.id, p.id
    order by pricing_count desc, m.slug
  `, [slugs, entry.provider]);

  return {
    provider: entry.provider,
    official_model_slug: entry.modelSlug,
    aliases: entry.aliases ?? [],
    official_name: entry.officialName,
    model_family: entry.modelFamily,
    official_status: entry.officialStatus,
    official_source_url: entry.officialSourceUrl,
    confidence: entry.confidence,
    database_has_model: rows.length > 0,
    database_matches: rows,
    database_missing_model: rows.length === 0,
    has_pricing: rows.some((row) => row.pricing_count > 0),
    has_cny_pricing: rows.some((row) => row.cny_pricing_count > 0),
    has_usd_pricing: rows.some((row) => row.usd_pricing_count > 0),
    should_appear_on_homepage: Boolean(entry.homepageEligible),
    if_not_why: entry.homepageEligible
      ? rows.length === 0
        ? "missing in database"
        : rows.every((row) => row.pricing_count === 0)
          ? "price pending"
          : null
      : entry.notes ?? "not homepage eligible",
    needs_pricing_review: Boolean(entry.needsPricingReview || rows.every((row) => row.pricing_count === 0)),
  };
}

async function main() {
  const { OFFICIAL_CURRENT_MODELS, OFFICIAL_CURRENT_PROVIDERS, providerOfficialCurrentModels } = await loadOfficialCatalog();
  const coverage: Awaited<ReturnType<typeof modelCoverage>>[] = [];
  for (const entry of OFFICIAL_CURRENT_MODELS) {
    coverage.push(await modelCoverage(entry));
  }

  const byProvider = OFFICIAL_CURRENT_PROVIDERS.map((provider) => {
    const items = coverage.filter((item) => item.provider === provider);
    return {
      provider,
      official_current_models: providerOfficialCurrentModels(provider).filter((m) => m.officialStatus === "current").map((m) => m.modelSlug),
      official_recommended_models: providerOfficialCurrentModels(provider).filter((m) => m.officialStatus === "recommended").map((m) => m.modelSlug),
      official_latest_aliases: providerOfficialCurrentModels(provider).filter((m) => m.officialStatus === "latest").flatMap((m) => [m.modelSlug, ...(m.aliases ?? [])]),
      database_has_model: items.filter((item) => item.database_has_model).length,
      database_missing_model: items.filter((item) => item.database_missing_model).map((item) => item.official_model_slug),
      has_pricing: items.filter((item) => item.has_pricing).length,
      has_cny_pricing: items.filter((item) => item.has_cny_pricing).length,
      has_usd_pricing: items.filter((item) => item.has_usd_pricing).length,
      should_appear_on_homepage: items.filter((item) => item.should_appear_on_homepage).map((item) => item.official_model_slug),
      if_not_why: items.filter((item) => item.if_not_why).map((item) => ({ model: item.official_model_slug, reason: item.if_not_why })),
    };
  });

  printSection("official current provider coverage", byProvider);
  printSection("official current model coverage", coverage);
  printSection("missing official current models", coverage.filter((item) => item.database_missing_model));
  printSection("official current models without pricing", coverage.filter((item) => item.database_has_model && !item.has_pricing));
}

main()
  .catch((err) => {
    console.error("audit:official-current failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
