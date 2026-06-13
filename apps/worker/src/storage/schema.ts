/**
 * Drizzle ORM schema 镜像 —— 在 worker 中也使用同一份定义
 * 实际生产中两套进程通过 DATABASE_URL 共享数据
 */
import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, numeric, date, text as textType, index, uniqueIndex } from "drizzle-orm/pg-core";

export const providers = pgTable(
  "providers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name_zh: text("name_zh").notNull(),
    name_en: text("name_en"),

    legal_name: text("legal_name"),
    brand_name: text("brand_name"),
    short_description: text("short_description"),
    long_description: text("long_description"),
    founded_year: integer("founded_year"),
    headquarters: text("headquarters"),
    country_or_region: text("country_or_region"),

    region: text("region").notNull().default("global"),
    company_type: text("company_type"),
    provider_category: text("provider_category"),
    parent_company: text("parent_company"),

    official_website: text("official_website"),
    homepage: text("homepage"),
    developer_platform_url: text("developer_platform_url"),
    docs_url: text("docs_url"),
    api_base_url: text("api_base_url"),
    api_docs_url: text("api_docs_url"),
    pricing_url: text("pricing_url"),
    blog_url: text("blog_url"),
    changelog_url: text("changelog_url"),
    github_url: text("github_url"),
    modelscope_url: text("modelscope_url"),
    logo_url: text("logo_url"),

    main_products: jsonb("main_products").$type<string[]>().notNull().default([]),
    main_models: jsonb("main_models").$type<string[]>().notNull().default([]),
    strengths: jsonb("strengths").$type<string[]>().notNull().default([]),
    suitable_users: jsonb("suitable_users").$type<string[]>().notNull().default([]),

    billing_features: jsonb("billing_features").$type<string[]>().notNull().default([]),
    supported_currencies: jsonb("supported_currencies").$type<string[]>().notNull().default(["CNY"]),
    supports_api: boolean("supports_api").notNull().default(true),
    supports_subscription_plan: boolean("supports_subscription_plan").notNull().default(false),
    supports_enterprise_plan: boolean("supports_enterprise_plan").notNull().default(false),
    supports_domestic_payment: boolean("supports_domestic_payment").notNull().default(false),
    supports_invoice: boolean("supports_invoice").notNull().default(false),

    data_source_urls: jsonb("data_source_urls").$type<string[]>().notNull().default([]),
    profile_confidence_score: numeric("profile_confidence_score", { precision: 4, scale: 2 }),
    need_manual_review: boolean("need_manual_review").notNull().default(false),
    last_verified_at: timestamp("last_verified_at", { withTimezone: true }),

    is_active: boolean("is_active").notNull().default(true),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    slugUq: uniqueIndex("providers_slug_uq").on(t.slug),
    regionIdx: index("providers_region_idx").on(t.region),
    categoryIdx: index("providers_cat_idx").on(t.provider_category),
    activeIdx: index("providers_active_idx").on(t.is_active),
  }),
);

export const models = pgTable(
  "models",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider_id: uuid("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    family: text("family"),
    modality: jsonb("modality").$type<string[]>().notNull().default(["text"]),
    context_length: integer("context_length"),
    max_output_tokens: integer("max_output_tokens"),
    capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
    release_date: date("release_date"),
    status: text("status").notNull().default("active"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    slugUq: uniqueIndex("models_slug_uq").on(t.slug),
    providerIdx: index("models_provider_idx").on(t.provider_id),
  }),
);

export const pricing = pgTable(
  "pricing",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    model_id: uuid("model_id").notNull().references(() => models.id, { onDelete: "cascade" }),
    pricing_type: text("pricing_type").notNull().default("api_token"),
    input_per_1m_usd: numeric("input_per_1m_usd", { precision: 18, scale: 8 }),
    output_per_1m_usd: numeric("output_per_1m_usd", { precision: 18, scale: 8 }),
    input_cached_read_per_1m_usd: numeric("input_cached_read_per_1m_usd", { precision: 18, scale: 8 }),
    input_cached_write_per_1m_usd: numeric("input_cached_write_per_1m_usd", { precision: 18, scale: 8 }),
    unit_amount: numeric("unit_amount", { precision: 18, scale: 8 }),
    unit_amount_usd: numeric("unit_amount_usd", { precision: 18, scale: 8 }),
    billing_unit: text("billing_unit"),
    batch_discount: numeric("batch_discount", { precision: 5, scale: 2 }),
    tiered_rules: jsonb("tiered_rules"),
    currency_native: text("currency_native").notNull().default("USD"),
    price_native: numeric("price_native", { precision: 18, scale: 8 }),
    region: text("region").notNull().default("global"),
    channel: text("channel").notNull().default("official"),
    effective_start_at: timestamp("effective_start_at", { withTimezone: true }),
    effective_end_at: timestamp("effective_end_at", { withTimezone: true }),
    is_current: boolean("is_current").notNull().default(true),
    confidence_score: numeric("confidence_score", { precision: 4, scale: 2 }).notNull().default("0.80"),
    primary_source_id: text("primary_source_id").notNull(),
    source_snapshot_id: uuid("source_snapshot_id"),
    source_url: text("source_url").notNull(),
    source_type: text("source_type"),
    need_manual_review: boolean("need_manual_review").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    modelTypeChan: uniqueIndex("pricing_model_type_chan_uq").on(t.model_id, t.pricing_type, t.channel),
    confidenceIdx: index("pricing_confidence_idx").on(t.confidence_score),
    reviewIdx: index("pricing_review_idx").on(t.need_manual_review),
    currentIdx: index("pricing_current_idx").on(t.is_current),
  }),
);

export const priceChangeLog = pgTable(
  "price_change_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    model_id: uuid("model_id").notNull(),
    field: text("field").notNull(),
    old_value: numeric("old_value", { precision: 18, scale: 8 }),
    new_value: numeric("new_value", { precision: 18, scale: 8 }),
    change_pct: numeric("change_pct", { precision: 6, scale: 2 }),
    source_id: text("source_id").notNull(),
    source_url: text("source_url").notNull(),
    detected_at: timestamp("detected_at", { withTimezone: true }).defaultNow().notNull(),
    applied: boolean("applied").notNull().default(false),
    review_id: uuid("review_id"),
  },
  (t) => ({
    modelIdx: index("price_change_model_idx").on(t.model_id),
    fieldIdx: index("price_change_field_idx").on(t.field),
    detectedIdx: index("price_change_detected_idx").on(t.detected_at),
  }),
);

export const promotions = pgTable(
  "promotions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider_id: uuid("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    promotion_type: text("promotion_type").notNull(),
    model_external_ids: jsonb("model_external_ids").$type<string[]>().notNull().default([]),
    gift_amount: numeric("gift_amount", { precision: 18, scale: 4 }),
    gift_unit: text("gift_unit"),
    discount_rate: numeric("discount_rate", { precision: 5, scale: 2 }),
    starts_at: timestamp("starts_at", { withTimezone: true }),
    ends_at: timestamp("ends_at", { withTimezone: true }),
    min_spend: numeric("min_spend", { precision: 18, scale: 4 }),
    eligibility: text("eligibility"),
    source_url: text("source_url").notNull(),
    source_snapshot_id: uuid("source_snapshot_id"),
    confidence_score: numeric("confidence_score", { precision: 4, scale: 2 }).notNull().default("0.70"),
    need_manual_review: boolean("need_manual_review").notNull().default(true),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    providerIdx: index("promo_provider_idx").on(t.provider_id),
    typeIdx: index("promo_type_idx").on(t.promotion_type),
    activeIdx: index("promo_active_idx").on(t.is_active),
  }),
);

export const reviewQueue = pgTable(
  "review_queue",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entity_type: text("entity_type").notNull(),
    entity_id: uuid("entity_id"),
    reason: text("reason").notNull(),
    payload: jsonb("payload").notNull(),
    conflicts: jsonb("conflicts"),
    status: text("status").notNull().default("pending"),
    assigned_to: text("assigned_to"),
    resolution: jsonb("resolution"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolved_at: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => ({
    entityIdx: index("review_entity_idx").on(t.entity_type),
    reasonIdx: index("review_reason_idx").on(t.reason),
    statusIdx: index("review_status_idx").on(t.status),
  }),
);

export const sourceSnapshots = pgTable(
  "source_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source_id: text("source_id").notNull(),
    url: text("url").notNull(),
    fetched_at: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
    content_type: text("content_type").notNull(),
    raw_content: text("raw_content").notNull(),
    raw_hash: text("raw_hash").notNull(),
    parser_version: text("parser_version"),
    parsed_at: timestamp("parsed_at", { withTimezone: true }),
    parse_status: text("parse_status").notNull().default("success"),
    parse_error: text("parse_error"),
  },
  (t) => ({
    sourceIdx: index("snap_source_idx").on(t.source_id),
    hashIdx: index("snap_hash_idx").on(t.raw_hash),
  }),
);

export const scraperJobs = pgTable(
  "scraper_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source_id: text("source_id").notNull(),
    schedule: text("schedule").notNull(),
    last_run_at: timestamp("last_run_at", { withTimezone: true }),
    next_run_at: timestamp("next_run_at", { withTimezone: true }),
    last_status: text("last_status"),
    consecutive_failures: integer("consecutive_failures").notNull().default(0),
    last_error: text("last_error"),
    avg_duration_ms: integer("avg_duration_ms"),
  },
  (t) => ({
    sourceIdx: index("jobs_source_idx").on(t.source_id),
    statusIdx: index("jobs_status_idx").on(t.last_status),
  }),
);

export const fxRates = pgTable("fx_rates", {
  id: uuid("id").defaultRandom().primaryKey(),
  base: text("base").notNull(),
  quote: text("quote").notNull(),
  rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
  as_of: timestamp("as_of", { withTimezone: true }).defaultNow().notNull(),
  source: text("source").notNull().default("static"),
});

export const modelStrengths = pgTable(
  "model_strengths",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    model_id: uuid("model_id").notNull().references(() => models.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name_zh: text("name_zh").notNull(),
    name_en: text("name_en"),
    category: text("category").notNull().default("capability"),
    sort_order: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    modelIdx: index("strength_model_idx").on(t.model_id),
    modelSlugUq: uniqueIndex("strength_model_slug_uq").on(t.model_id, t.slug),
  }),
);

export const userReviews = pgTable(
  "user_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: text("user_id").notNull(),
    model_id: uuid("model_id").notNull().references(() => models.id, { onDelete: "cascade" }),
    usage_scenario: text("usage_scenario").notNull(),
    usage_intensity: text("usage_intensity").notNull().default("medium"),
    usage_started_at: timestamp("usage_started_at", { withTimezone: true }),
    rating_price: numeric("rating_price", { precision: 3, scale: 1 }),
    rating_chinese: numeric("rating_chinese", { precision: 3, scale: 1 }),
    rating_code: numeric("rating_code", { precision: 3, scale: 1 }),
    rating_reasoning: numeric("rating_reasoning", { precision: 3, scale: 1 }),
    rating_speed: numeric("rating_speed", { precision: 3, scale: 1 }),
    rating_stability: numeric("rating_stability", { precision: 3, scale: 1 }),
    rating_api_ease: numeric("rating_api_ease", { precision: 3, scale: 1 }),
    rating_docs_clarity: numeric("rating_docs_clarity", { precision: 3, scale: 1 }),
    rating_payment: numeric("rating_payment", { precision: 3, scale: 1 }),
    rating_overall: numeric("rating_overall", { precision: 3, scale: 1 }).notNull(),
    pros: text("pros"),
    cons: text("cons"),
    suitable_for: jsonb("suitable_for").$type<string[]>().notNull().default([]),
    not_suitable_for: jsonb("not_suitable_for").$type<string[]>().notNull().default([]),
    verified_use: boolean("verified_use").notNull().default(false),
    is_approved: boolean("is_approved").notNull().default(false),
    is_flagged: boolean("is_flagged").notNull().default(false),
    flag_reason: text("flag_reason"),
    reviewed_by: text("reviewed_by"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    modelIdx: index("review_model_idx").on(t.model_id),
    approvedIdx: index("review_approved_idx").on(t.is_approved),
    flaggedIdx: index("review_flagged_idx").on(t.is_flagged),
    overallIdx: index("review_overall_idx").on(t.rating_overall),
  }),
);

// ============================================================
// 补充功能：每日 AI 动态 + 会员/Plan 体系
// ============================================================

export const newsSources = pgTable(
  "news_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name_zh: text("name_zh").notNull(),
    name_en: text("name_en"),
    source_type: text("source_type").notNull(),
    region: text("region").notNull().default("cn"),
    provider_id: uuid("provider_id").references(() => providers.id, { onDelete: "set null" }),
    urls: jsonb("urls").$type<string[]>().notNull().default([]),
    fetch_schedule: text("fetch_schedule").notNull().default("0 */6 * * *"),
    parser_type: text("parser_type").notNull().default("rss"),
    is_active: boolean("is_active").notNull().default(true),
    priority: integer("priority").notNull().default(5),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    typeIdx: index("ns_type_idx").on(t.source_type),
    regionIdx: index("ns_region_idx").on(t.region),
    activeIdx: index("ns_active_idx").on(t.is_active),
  }),
);

export const newsEvents = pgTable(
  "news_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    summary: text("summary"),
    category: text("category").notNull(),
    importance: integer("importance").notNull().default(3),
    related_provider_ids: jsonb("related_provider_ids").$type<string[]>().notNull().default([]),
    related_model_ids: jsonb("related_model_ids").$type<string[]>().notNull().default([]),
    item_count: integer("item_count").notNull().default(1),
    first_seen_at: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    last_updated_at: timestamp("last_updated_at", { withTimezone: true }).defaultNow().notNull(),
    is_featured: boolean("is_featured").notNull().default(false),
    is_published: boolean("is_published").notNull().default(true),
  },
  (t) => ({
    categoryIdx: index("ne_category_idx").on(t.category),
    publishedIdx: index("ne_published_idx").on(t.is_published),
  }),
);

export const newsItems = pgTable(
  "news_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source_id: uuid("source_id").notNull().references(() => newsSources.id, { onDelete: "cascade" }),
    event_id: uuid("event_id").references(() => newsEvents.id, { onDelete: "set null" }),
    external_id: text("external_id"),
    title: text("title").notNull(),
    summary: text("summary"),
    body_text: text("body_text"),
    url: text("url").notNull(),
    published_at: timestamp("published_at", { withTimezone: true }),
    fetched_at: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
    category: text("category").notNull(),
    subcategory: text("subcategory"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    related_provider_ids: jsonb("related_provider_ids").$type<string[]>().notNull().default([]),
    related_model_ids: jsonb("related_model_ids").$type<string[]>().notNull().default([]),
    impact_summary: text("impact_summary"),
    affects_pricing: boolean("affects_pricing").notNull().default(false),
    affects_recommendation: boolean("affects_recommendation").notNull().default(false),
    importance: integer("importance").notNull().default(3),
    confidence_score: numeric("confidence_score", { precision: 4, scale: 2 }).notNull().default("0.80"),
    need_manual_review: boolean("need_manual_review").notNull().default(false),
    is_published: boolean("is_published").notNull().default(true),
    reviewed_by: text("reviewed_by"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sourceIdx: index("ni_source_idx").on(t.source_id),
    eventIdx: index("ni_event_idx").on(t.event_id),
    categoryIdx: index("ni_category_idx").on(t.category),
    publishedIdx: index("ni_published_idx").on(t.is_published),
    fetchedIdx: index("ni_fetched_idx").on(t.fetched_at),
    externalUq: uniqueIndex("ni_external_uq").on(t.source_id, t.external_id),
  }),
);

export const dailyDigests = pgTable(
  "daily_digests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    date: date("date").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary"),
    highlights: jsonb("highlights").$type<{ title: string; summary: string; category: string; url: string }[]>().notNull().default([]),
    stats: jsonb("stats").$type<{ newModels: number; priceChanges: number; promotions: number; planUpdates: number; policy: number; other: number }>().notNull(),
    is_published: boolean("is_published").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const productOfferings = pgTable(
  "product_offerings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider_id: uuid("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
    model_id: uuid("model_id").references(() => models.id, { onDelete: "set null" }),
    offering_type: text("offering_type").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    billing_cycle: text("billing_cycle"),
    price_amount: numeric("price_amount", { precision: 18, scale: 4 }),
    price_currency: text("price_currency").notNull().default("CNY"),
    price_period: text("price_period"),
    seat_count: integer("seat_count"),
    token_quota: numeric("token_quota", { precision: 18, scale: 0 }),
    features: jsonb("features").$type<string[]>().notNull().default([]),
    is_active: boolean("is_active").notNull().default(true),
    source_url: text("source_url").notNull(),
    confidence_score: numeric("confidence_score", { precision: 4, scale: 2 }).notNull().default("0.80"),
    need_manual_review: boolean("need_manual_review").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    providerIdx: index("po_provider_idx").on(t.provider_id),
    typeIdx: index("po_type_idx").on(t.offering_type),
  }),
);

export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider_id: uuid("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tier: text("tier").notNull(),
    description: text("description"),
    monthly_price: numeric("monthly_price", { precision: 18, scale: 4 }),
    annual_price: numeric("annual_price", { precision: 18, scale: 4 }),
    currency: text("currency").notNull().default("CNY"),
    model_access: jsonb("model_access").$type<string[]>().notNull().default([]),
    message_limit: integer("message_limit"),
    context_limit: integer("context_limit"),
    features: jsonb("features").$type<string[]>().notNull().default([]),
    extras: jsonb("extras"),
    source_url: text("source_url").notNull(),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    providerIdx: index("sp_provider_idx").on(t.provider_id),
    tierIdx: index("sp_tier_idx").on(t.tier),
  }),
);

export const exchangeRateSnapshots = pgTable(
  "exchange_rate_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    base: text("base").notNull(),
    quote: text("quote").notNull(),
    rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
    as_of: timestamp("as_of", { withTimezone: true }).defaultNow().notNull(),
    source: text("source").notNull(),
    previous_rate: numeric("previous_rate", { precision: 18, scale: 8 }),
    change_pct: numeric("change_pct", { precision: 6, scale: 2 }),
  },
  (t) => ({
    pairIdx: index("ers_pair_idx").on(t.base, t.quote),
  }),
);

export const sourceFetchLogs = pgTable(
  "source_fetch_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source_id: uuid("source_id").notNull(),
    source_type: text("source_type").notNull(),
    url: text("url"),
    status: text("status").notNull(),
    items_fetched: integer("items_fetched").notNull().default(0),
    items_new: integer("items_new").notNull().default(0),
    error_message: text("error_message"),
    duration_ms: integer("duration_ms"),
    fetched_at: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sourceIdx: index("sfl_source_idx").on(t.source_id),
    statusIdx: index("sfl_status_idx").on(t.status),
  }),
);
