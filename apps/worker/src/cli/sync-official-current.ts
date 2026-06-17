import { pool } from "../storage/client.js";
import { upsertProvider } from "../storage/provider-store.js";
import { upsertModel } from "../storage/model-store.js";
import { upsertReviewQueue } from "../storage/review-store.js";

const SOURCE_ID = "official-current-catalog";

interface OfficialCurrentModel {
  provider: string;
  modelSlug: string;
  aliases?: string[];
  modelFamily: string;
  officialName: string;
  officialSourceUrl: string;
  officialStatus: "current" | "recommended" | "latest" | "previous" | "deprecated";
  officialCheckedAt: string;
  confidence: number;
  notes?: string;
  homepageEligible?: boolean;
  needsPricingReview?: boolean;
}

const PROVIDER_META: Record<string, { name: string; region: "cn" | "global" }> = {
  openai: { name: "OpenAI", region: "global" },
  anthropic: { name: "Anthropic", region: "global" },
  google: { name: "Google Gemini", region: "global" },
  xai: { name: "xAI", region: "global" },
  mistral: { name: "Mistral", region: "global" },
  meta: { name: "Meta Llama", region: "global" },
  cohere: { name: "Cohere", region: "global" },
  perplexity: { name: "Perplexity", region: "global" },
  deepseek: { name: "DeepSeek", region: "cn" },
  "alibaba-cloud": { name: "Alibaba Cloud Bailian", region: "cn" },
  moonshotai: { name: "Moonshot Kimi", region: "cn" },
  "volcengine-doubao": { name: "Volcengine Doubao", region: "cn" },
  "tencent-hunyuan": { name: "Tencent Hunyuan", region: "cn" },
  "baidu-qianfan": { name: "Baidu Qianfan", region: "cn" },
  zhipu: { name: "Zhipu GLM", region: "cn" },
  minimax: { name: "MiniMax", region: "cn" },
  siliconflow: { name: "SiliconFlow", region: "cn" },
};

const MUST_EXIST_OR_REVIEW = new Set([
  "llama-4-maverick",
  "llama-4-scout",
  "command-r-plus-08-2024",
  "north-mini-code-1-0",
  "doubao-seed-1.6",
  "glm-4.6",
]);

const AMBIGUOUS_ALIASES = [
  {
    provider: "xai",
    canonical: "grok-4-0709",
    family: "grok-4",
    aliases: [
      "grok-4-fast",
      "grok-4-reasoning",
      "grok-4-non-reasoning",
      "grok-4-1-fast-reasoning-latest",
      "grok-4-1-fast-non-reasoning-latest",
      "grok-4-1-fast-non-reasoning",
    ],
    sourceUrl: "https://docs.x.ai/docs/models/grok-4-0709",
    notes: "Ambiguous Grok fast/reasoning variant; do not promote to homepage without exact official source mapping.",
  },
  {
    provider: "google",
    canonical: "gemini-3.5-flash",
    family: "gemini-3.5-flash",
    aliases: ["gemini-latest", "gemini-flash-preview-latest"],
    sourceUrl: "https://ai.google.dev/gemini-api/docs/models",
    notes: "Broad Gemini latest alias is ambiguous; keep out of homepage until official target is explicit.",
  },
];

async function loadOfficialCatalog() {
  const candidates = [
    "../../../../packages/pricing-core/src/official-current/index.ts",
    "../../../../packages/pricing-core/dist/official-current/index.js",
  ];
  let lastError: unknown = null;
  for (const candidate of candidates) {
    try {
      return await import(new URL(candidate, import.meta.url).href) as {
        OFFICIAL_CURRENT_MODELS: OfficialCurrentModel[];
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function canonicalSlug(entry: OfficialCurrentModel) {
  return `${entry.provider}/${entry.modelSlug}`;
}

async function ensureTables() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE TABLE IF NOT EXISTS official_current_models (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      provider_slug text NOT NULL,
      model_slug text NOT NULL,
      model_family text NOT NULL,
      official_name text NOT NULL,
      official_source_url text NOT NULL,
      official_status text NOT NULL DEFAULT 'current',
      official_checked_at timestamptz NOT NULL DEFAULT now(),
      confidence numeric(4, 2) NOT NULL DEFAULT 0.80,
      homepage_eligible boolean NOT NULL DEFAULT false,
      has_pricing boolean NOT NULL DEFAULT false,
      needs_pricing_review boolean NOT NULL DEFAULT true,
      source_kind text NOT NULL DEFAULT 'code-catalog-sync',
      notes text,
      raw_entry jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS official_current_models_provider_model_uq ON official_current_models (provider_slug, model_slug);
    CREATE INDEX IF NOT EXISTS official_current_models_provider_idx ON official_current_models (provider_slug);
    CREATE INDEX IF NOT EXISTS official_current_models_family_idx ON official_current_models (provider_slug, model_family);
    CREATE INDEX IF NOT EXISTS official_current_models_eligible_idx ON official_current_models (homepage_eligible);
    CREATE TABLE IF NOT EXISTS official_model_aliases (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      provider_slug text NOT NULL,
      alias_slug text NOT NULL,
      canonical_model_slug text NOT NULL,
      alias_type text NOT NULL DEFAULT 'alias',
      model_family text,
      official_source_url text,
      confidence numeric(4, 2) NOT NULL DEFAULT 0.80,
      needs_alias_review boolean NOT NULL DEFAULT false,
      homepage_eligible boolean NOT NULL DEFAULT true,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS official_model_aliases_provider_alias_uq ON official_model_aliases (provider_slug, alias_slug);
    CREATE INDEX IF NOT EXISTS official_model_aliases_canonical_idx ON official_model_aliases (provider_slug, canonical_model_slug);
    CREATE INDEX IF NOT EXISTS official_model_aliases_review_idx ON official_model_aliases (needs_alias_review);
    CREATE TABLE IF NOT EXISTS official_catalog_runs (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      run_type text NOT NULL DEFAULT 'sync',
      source text NOT NULL DEFAULT 'code-catalog',
      status text NOT NULL,
      models_upserted integer NOT NULL DEFAULT 0,
      aliases_upserted integer NOT NULL DEFAULT 0,
      candidates_upserted integer NOT NULL DEFAULT 0,
      reviews_upserted integer NOT NULL DEFAULT 0,
      error_message text,
      started_at timestamptz NOT NULL DEFAULT now(),
      finished_at timestamptz
    );
    CREATE INDEX IF NOT EXISTS official_catalog_runs_source_idx ON official_catalog_runs (source);
    CREATE INDEX IF NOT EXISTS official_catalog_runs_status_idx ON official_catalog_runs (status);
    CREATE INDEX IF NOT EXISTS official_catalog_runs_started_idx ON official_catalog_runs (started_at);
  `);
}

async function hasPricing(entry: OfficialCurrentModel) {
  const slugs = [entry.modelSlug, ...(entry.aliases ?? [])];
  const result = await pool.query<{ count: string }>(
    `
      select count(pr.id)::int as count
      from models m
      join providers p on p.id = m.provider_id
      join pricing pr on pr.model_id = m.id and pr.is_current = true and pr.pricing_type = 'api_token'
      where m.slug = any($1::text[])
        and (
          coalesce(m.model_owner_provider, p.canonical_slug, p.slug) = $2
          or coalesce(p.canonical_slug, p.slug) = $2
          or p.slug = $2
        )
    `,
    [slugs, entry.provider],
  );
  return Number(result.rows[0]?.count ?? 0) > 0;
}

async function findModel(entry: OfficialCurrentModel) {
  const slugs = [entry.modelSlug, ...(entry.aliases ?? [])];
  const result = await pool.query<{ id: string; slug: string }>(
    `
      select m.id, m.slug
      from models m
      join providers p on p.id = m.provider_id
      where m.slug = any($1::text[])
        and (
          coalesce(m.model_owner_provider, p.canonical_slug, p.slug) = $2
          or coalesce(p.canonical_slug, p.slug) = $2
          or p.slug = $2
        )
      order by case when m.slug = $3 then 0 else 1 end
      limit 1
    `,
    [slugs, entry.provider, entry.modelSlug],
  );
  return result.rows[0] ?? null;
}

async function upsertCatalogModel(entry: OfficialCurrentModel, pricingExists: boolean) {
  await pool.query(
    `
      insert into official_current_models (
        provider_slug, model_slug, model_family, official_name, official_source_url,
        official_status, official_checked_at, confidence, homepage_eligible, has_pricing,
        needs_pricing_review, source_kind, notes, raw_entry, updated_at
      )
      values ($1,$2,$3,$4,$5,$6,$7::date,$8,$9,$10,$11,'code-catalog-sync',$12,$13::jsonb,now())
      on conflict (provider_slug, model_slug) do update set
        model_family = excluded.model_family,
        official_name = excluded.official_name,
        official_source_url = excluded.official_source_url,
        official_status = excluded.official_status,
        official_checked_at = excluded.official_checked_at,
        confidence = excluded.confidence,
        homepage_eligible = excluded.homepage_eligible,
        has_pricing = excluded.has_pricing,
        needs_pricing_review = excluded.needs_pricing_review,
        source_kind = excluded.source_kind,
        notes = excluded.notes,
        raw_entry = excluded.raw_entry,
        updated_at = now()
    `,
    [
      entry.provider,
      entry.modelSlug,
      entry.modelFamily,
      entry.officialName,
      entry.officialSourceUrl,
      entry.officialStatus,
      entry.officialCheckedAt,
      entry.confidence,
      Boolean(entry.homepageEligible),
      pricingExists,
      Boolean(entry.needsPricingReview || !pricingExists),
      entry.notes ?? null,
      JSON.stringify(entry),
    ],
  );
}

async function upsertAlias(args: {
  provider: string;
  alias: string;
  canonical: string;
  aliasType: string;
  family: string;
  sourceUrl: string;
  confidence: number;
  needsReview: boolean;
  homepageEligible: boolean;
  notes?: string | null;
}) {
  await pool.query(
    `
      insert into official_model_aliases (
        provider_slug, alias_slug, canonical_model_slug, alias_type, model_family,
        official_source_url, confidence, needs_alias_review, homepage_eligible, notes, updated_at
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
      on conflict (provider_slug, alias_slug) do update set
        canonical_model_slug = excluded.canonical_model_slug,
        alias_type = excluded.alias_type,
        model_family = excluded.model_family,
        official_source_url = excluded.official_source_url,
        confidence = excluded.confidence,
        needs_alias_review = excluded.needs_alias_review,
        homepage_eligible = excluded.homepage_eligible,
        notes = excluded.notes,
        updated_at = now()
    `,
    [
      args.provider,
      args.alias,
      args.canonical,
      args.aliasType,
      args.family,
      args.sourceUrl,
      args.confidence,
      args.needsReview,
      args.homepageEligible,
      args.notes ?? null,
    ],
  );
}

async function upsertLatestCandidate(entry: OfficialCurrentModel, modelExists: boolean, pricingExists: boolean) {
  const lifecycleTier =
    entry.officialStatus === "deprecated"
      ? "deprecated"
      : entry.officialStatus === "previous"
        ? "previous_generation"
        : entry.homepageEligible
          ? "current_mainstream"
          : "unknown";
  await pool.query(
    `
      insert into latest_model_candidates (
        provider_slug, model_slug, model_name, family, source_id, source_url,
        source_type, discovery_status, model_status, lifecycle_tier, confidence_score,
        has_pricing, needs_pricing_review, needs_capability_review,
        is_recommended_by_official, is_default_in_official_docs, is_latest_alias,
        canonical_model_slug, model_family, model_owner_provider, selling_platform_provider,
        source_provider, source_model_id, data_quality_flags, raw_evidence, last_seen_at, updated_at
      )
      values (
        $1,$2,$3,$4,$5,$6,'official',$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$4,$1,$1,$1,$2,$18::jsonb,$19::jsonb,now(),now()
      )
      on conflict (provider_slug, model_slug, source_id) do update set
        model_name = excluded.model_name,
        family = excluded.family,
        source_url = excluded.source_url,
        discovery_status = excluded.discovery_status,
        model_status = excluded.model_status,
        lifecycle_tier = excluded.lifecycle_tier,
        confidence_score = excluded.confidence_score,
        has_pricing = excluded.has_pricing,
        needs_pricing_review = excluded.needs_pricing_review,
        needs_capability_review = excluded.needs_capability_review,
        is_recommended_by_official = excluded.is_recommended_by_official,
        is_default_in_official_docs = excluded.is_default_in_official_docs,
        is_latest_alias = excluded.is_latest_alias,
        canonical_model_slug = excluded.canonical_model_slug,
        model_family = excluded.model_family,
        model_owner_provider = excluded.model_owner_provider,
        selling_platform_provider = excluded.selling_platform_provider,
        source_provider = excluded.source_provider,
        source_model_id = excluded.source_model_id,
        data_quality_flags = excluded.data_quality_flags,
        raw_evidence = excluded.raw_evidence,
        last_seen_at = now(),
        updated_at = now()
    `,
    [
      entry.provider,
      entry.modelSlug,
      entry.officialName,
      entry.modelFamily,
      SOURCE_ID,
      entry.officialSourceUrl,
      modelExists ? "matched" : "inserted",
      entry.officialStatus === "deprecated" ? "deprecated" : entry.officialStatus === "previous" ? "active" : "active",
      lifecycleTier,
      entry.confidence,
      pricingExists,
      Boolean(entry.needsPricingReview || !pricingExists),
      !modelExists,
      entry.officialStatus === "recommended",
      entry.officialStatus === "recommended" || entry.officialStatus === "latest",
      entry.officialStatus === "latest" || (entry.aliases ?? []).some((alias) => alias.includes("latest")),
      canonicalSlug(entry),
      JSON.stringify(pricingExists ? [] : ["domestic_price_missing"]),
      JSON.stringify({ official_current: entry }),
    ],
  );
}

async function ensureModel(entry: OfficialCurrentModel) {
  const providerMeta = PROVIDER_META[entry.provider] ?? { name: entry.provider, region: "global" as const };
  const provider = await upsertProvider({
    slug: entry.provider,
    name_zh: providerMeta.name,
    name_en: providerMeta.name,
    region: providerMeta.region,
    docs_url: entry.officialSourceUrl,
    tags: ["official-current"],
  });
  return upsertModel({
    provider_id: provider.id,
    slug: entry.modelSlug,
    name: entry.officialName,
    family: entry.modelFamily,
    status: entry.officialStatus === "deprecated" ? "deprecated" : "active",
    official_source_url: entry.officialSourceUrl,
    lifecycle_tier: entry.officialStatus === "deprecated" ? "deprecated" : entry.officialStatus === "previous" ? "previous_generation" : "current_mainstream",
    discovered_from: "official",
    source_confidence: entry.confidence,
    needs_pricing_review: true,
    needs_capability_review: !entry.homepageEligible || entry.officialStatus === "previous" || entry.officialStatus === "deprecated",
    is_recommended_by_official: entry.officialStatus === "recommended",
    is_default_in_official_docs: entry.officialStatus === "recommended" || entry.officialStatus === "latest",
    is_latest_alias: entry.officialStatus === "latest" || (entry.aliases ?? []).some((alias) => alias.includes("latest")),
    canonical_model_slug: canonicalSlug(entry),
    model_family: entry.modelFamily,
    model_owner_provider: entry.provider,
    selling_platform_provider: entry.provider,
    source_provider: entry.provider,
    source_model_id: entry.modelSlug,
    data_quality_flags: ["domestic_price_missing"],
  });
}

async function main() {
  const startedAt = new Date();
  await ensureTables();
  const run = await pool.query<{ id: string }>(
    "insert into official_catalog_runs (run_type, source, status, started_at) values ('sync', 'code-catalog', 'running', $1) returning id",
    [startedAt],
  );
  const runId = run.rows[0].id;
  let modelsUpserted = 0;
  let aliasesUpserted = 0;
  let candidatesUpserted = 0;
  let reviewsUpserted = 0;
  try {
    const { OFFICIAL_CURRENT_MODELS } = await loadOfficialCatalog();
    for (const entry of OFFICIAL_CURRENT_MODELS) {
      const model = await findModel(entry);
      const pricingExists = await hasPricing(entry);
      await upsertCatalogModel(entry, pricingExists);
      modelsUpserted += 1;

      const aliases = Array.from(new Set([entry.modelSlug, ...(entry.aliases ?? [])]));
      for (const alias of aliases) {
        await upsertAlias({
          provider: entry.provider,
          alias,
          canonical: entry.modelSlug,
          aliasType: alias === entry.modelSlug ? "canonical" : alias.includes("latest") ? "latest_alias" : "alias",
          family: entry.modelFamily,
          sourceUrl: entry.officialSourceUrl,
          confidence: entry.confidence,
          needsReview: false,
          homepageEligible: Boolean(entry.homepageEligible),
          notes: entry.notes ?? null,
        });
        aliasesUpserted += 1;
      }

      await upsertLatestCandidate(entry, Boolean(model), pricingExists);
      candidatesUpserted += 1;

      let entityId = model?.id ?? null;
      if (!model && MUST_EXIST_OR_REVIEW.has(entry.modelSlug)) {
        const insertedModel = await ensureModel(entry);
        entityId = insertedModel.id;
      }
      if (!model && MUST_EXIST_OR_REVIEW.has(entry.modelSlug)) {
        const review = await upsertReviewQueue({
          entity_type: "model",
          entity_id: entityId,
          reason: "official-current-model-missing",
          payload: {
            provider: entry.provider,
            model_slug: entry.modelSlug,
            canonical_model_slug: canonicalSlug(entry),
            model_family: entry.modelFamily,
            source_url: entry.officialSourceUrl,
            source_id: SOURCE_ID,
            needs_pricing_review: true,
          },
        });
        if (review.inserted) reviewsUpserted += 1;
      } else if (!pricingExists && (entry.modelSlug === "mistral-medium-3.5" || Boolean(entry.needsPricingReview) || Boolean(entry.homepageEligible))) {
        const review = await upsertReviewQueue({
          entity_type: "pricing",
          entity_id: entityId,
          reason: "official-current-price-missing",
          payload: {
            provider: entry.provider,
            model_slug: entry.modelSlug,
            canonical_model_slug: canonicalSlug(entry),
            model_family: entry.modelFamily,
            source_url: entry.officialSourceUrl,
            source_id: SOURCE_ID,
            currency: "unknown",
            region: "unknown",
            pricing_type: "api_token",
            needs_pricing_review: true,
          },
        });
        if (review.inserted) reviewsUpserted += 1;
      }
    }

    for (const group of AMBIGUOUS_ALIASES) {
      for (const alias of group.aliases) {
        await upsertAlias({
          provider: group.provider,
          alias,
          canonical: group.canonical,
          aliasType: "ambiguous_variant",
          family: group.family,
          sourceUrl: group.sourceUrl,
          confidence: 0.5,
          needsReview: true,
          homepageEligible: false,
          notes: group.notes,
        });
        aliasesUpserted += 1;
      }
    }

    await pool.query(
      `
        update official_catalog_runs
        set status = 'success',
            models_upserted = $1,
            aliases_upserted = $2,
            candidates_upserted = $3,
            reviews_upserted = $4,
            finished_at = now()
        where id = $5
      `,
      [modelsUpserted, aliasesUpserted, candidatesUpserted, reviewsUpserted, runId],
    );
    console.log(JSON.stringify({ status: "success", modelsUpserted, aliasesUpserted, candidatesUpserted, reviewsUpserted }, null, 2));
  } catch (error) {
    await pool.query(
      "update official_catalog_runs set status = 'failed', error_message = $1, finished_at = now() where id = $2",
      [error instanceof Error ? error.message : String(error), runId],
    );
    throw error;
  }
}

main()
  .catch((err) => {
    console.error("sync:official-current failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
