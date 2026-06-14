/**
 * Web 端 Drizzle schema —— 与 worker/storage/schema.ts 字段完全一致
 * （实际生产中可提取为共享 packages/db-schema，避免双份定义；MVP 阶段直接复制）
 */
import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, numeric, date, index, uniqueIndex } from "drizzle-orm/pg-core";

export const providers = pgTable(
  "providers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name_zh: text("name_zh").notNull(),
    name_en: text("name_en"),

    // 公司/品牌信息
    legal_name: text("legal_name"),                 // 公司主体名称
    brand_name: text("brand_name"),                 // 品牌名
    short_description: text("short_description"),   // 一句话简介
    long_description: text("long_description"),     // 背景介绍 (100-300字)
    founded_year: integer("founded_year"),           // 成立年份
    headquarters: text("headquarters"),              // 总部所在地
    country_or_region: text("country_or_region"),    // 国家或地区

    // 分类
    region: text("region").notNull().default("global"),
    company_type: text("company_type"),                      // founder/startup/big-tech/cloud/institute
    provider_category: text("provider_category"),            // model-vendor / cloud-vendor / api-aggregator / open-source-platform / app-platform
    parent_company: text("parent_company"),                  // 母公司或所属集团

    // 链接
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

    // 产品/模型概览
    main_products: jsonb("main_products").$type<string[]>().notNull().default([]),
    main_models: jsonb("main_models").$type<string[]>().notNull().default([]),
    strengths: jsonb("strengths").$type<string[]>().notNull().default([]),       // 擅长方向标签
    suitable_users: jsonb("suitable_users").$type<string[]>().notNull().default([]), // 适合用户

    // 计费特征
    billing_features: jsonb("billing_features").$type<string[]>().notNull().default([]),
    supported_currencies: jsonb("supported_currencies").$type<string[]>().notNull().default(["CNY"]),
    supports_api: boolean("supports_api").notNull().default(true),
    supports_subscription_plan: boolean("supports_subscription_plan").notNull().default(false),
    supports_enterprise_plan: boolean("supports_enterprise_plan").notNull().default(false),
    supports_domestic_payment: boolean("supports_domestic_payment").notNull().default(false),
    supports_invoice: boolean("supports_invoice").notNull().default(false),

    // 可信度
    data_source_urls: jsonb("data_source_urls").$type<string[]>().notNull().default([]),
    profile_confidence_score: numeric("profile_confidence_score", { precision: 4, scale: 2 }),
    need_manual_review: boolean("need_manual_review").notNull().default(false),
    last_verified_at: timestamp("last_verified_at", { withTimezone: true }),

    canonical_provider_id: uuid("canonical_provider_id"),
    canonical_slug: text("canonical_slug"),
    provider_type: text("provider_type"),
    is_canonical: boolean("is_canonical").notNull().default(true),
    alias_confidence: numeric("alias_confidence", { precision: 4, scale: 2 }).notNull().default("1.00"),
    alias_source: text("alias_source").notNull().default("self"),
    needs_alias_review: boolean("needs_alias_review").notNull().default(false),

    // 通用
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

export const providerAliases = pgTable(
  "provider_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source_slug: text("source_slug").notNull(),
    canonical_slug: text("canonical_slug").notNull(),
    display_name: text("display_name"),
    provider_type: text("provider_type").notNull().default("model_vendor"),
    alias_confidence: numeric("alias_confidence", { precision: 4, scale: 2 }).notNull().default("0.80"),
    alias_source: text("alias_source").notNull().default("manual-baseline"),
    needs_alias_review: boolean("needs_alias_review").notNull().default(false),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sourceSlugUq: uniqueIndex("provider_aliases_source_slug_uq").on(t.source_slug),
    canonicalIdx: index("provider_aliases_canonical_idx").on(t.canonical_slug),
    reviewIdx: index("provider_aliases_review_idx").on(t.needs_alias_review),
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
    first_seen_at: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    last_seen_at: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    official_release_date: date("official_release_date"),
    official_updated_at: timestamp("official_updated_at", { withTimezone: true }),
    official_source_url: text("official_source_url"),
    lifecycle_tier: text("lifecycle_tier").notNull().default("unknown"),
    discovered_from: text("discovered_from").notNull().default("pricing_source"),
    source_confidence: numeric("source_confidence", { precision: 4, scale: 2 }).notNull().default("0.70"),
    needs_pricing_review: boolean("needs_pricing_review").notNull().default(false),
    needs_capability_review: boolean("needs_capability_review").notNull().default(false),
    is_recommended_by_official: boolean("is_recommended_by_official").notNull().default(false),
    is_default_in_official_docs: boolean("is_default_in_official_docs").notNull().default(false),
    is_latest_alias: boolean("is_latest_alias").notNull().default(false),
    canonical_model_slug: text("canonical_model_slug"),
    model_family: text("model_family"),
    model_variant: text("model_variant"),
    model_owner_provider: text("model_owner_provider"),
    selling_platform_provider: text("selling_platform_provider"),
    source_provider: text("source_provider"),
    source_model_id: text("source_model_id"),
    data_quality_flags: jsonb("data_quality_flags").$type<string[]>().notNull().default([]),
    needs_alias_review: boolean("needs_alias_review").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    slugUq: uniqueIndex("models_slug_uq").on(t.slug),
    providerIdx: index("models_provider_idx").on(t.provider_id),
  }),
);

export const latestModelCandidates = pgTable(
  "latest_model_candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider_slug: text("provider_slug").notNull(),
    model_slug: text("model_slug").notNull(),
    model_name: text("model_name").notNull(),
    family: text("family"),
    source_id: text("source_id").notNull(),
    source_url: text("source_url").notNull(),
    source_type: text("source_type").notNull().default("official"),
    discovery_status: text("discovery_status").notNull().default("candidate"),
    model_status: text("model_status").notNull().default("unknown"),
    lifecycle_tier: text("lifecycle_tier").notNull().default("unknown"),
    confidence_score: numeric("confidence_score", { precision: 4, scale: 2 }).notNull().default("0.80"),
    has_pricing: boolean("has_pricing").notNull().default(false),
    needs_pricing_review: boolean("needs_pricing_review").notNull().default(true),
    needs_capability_review: boolean("needs_capability_review").notNull().default(true),
    is_recommended_by_official: boolean("is_recommended_by_official").notNull().default(false),
    is_default_in_official_docs: boolean("is_default_in_official_docs").notNull().default(false),
    is_latest_alias: boolean("is_latest_alias").notNull().default(false),
    canonical_model_slug: text("canonical_model_slug"),
    model_family: text("model_family"),
    model_variant: text("model_variant"),
    model_owner_provider: text("model_owner_provider"),
    selling_platform_provider: text("selling_platform_provider"),
    source_provider: text("source_provider"),
    source_model_id: text("source_model_id"),
    data_quality_flags: jsonb("data_quality_flags").$type<string[]>().notNull().default([]),
    needs_alias_review: boolean("needs_alias_review").notNull().default(false),
    raw_evidence: jsonb("raw_evidence").notNull().default({}),
    first_seen_at: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    last_seen_at: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    candidateUq: uniqueIndex("latest_model_candidates_uq").on(t.provider_slug, t.model_slug, t.source_id),
    providerIdx: index("lmc_provider_idx").on(t.provider_slug),
    statusIdx: index("lmc_status_idx").on(t.discovery_status),
    pricingReviewIdx: index("lmc_pricing_review_idx").on(t.needs_pricing_review),
    seenIdx: index("lmc_seen_idx").on(t.last_seen_at),
  }),
);

export const modelDiscoveryLogs = pgTable(
  "model_discovery_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source_id: text("source_id").notNull(),
    provider_slug: text("provider_slug").notNull(),
    source_url: text("source_url").notNull(),
    status: text("status").notNull(),
    candidates_found: integer("candidates_found").notNull().default(0),
    models_inserted: integer("models_inserted").notNull().default(0),
    missing_pricing: integer("missing_pricing").notNull().default(0),
    http_status: integer("http_status"),
    parser_status: text("parser_status").notNull().default("unknown"),
    next_action: text("next_action"),
    error_message: text("error_message"),
    duration_ms: integer("duration_ms"),
    fetched_at: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sourceIdx: index("mdl_source_idx").on(t.source_id),
    providerIdx: index("mdl_provider_idx").on(t.provider_slug),
    statusIdx: index("mdl_status_idx").on(t.status),
  }),
);

export const pricing = pgTable(
  "pricing",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    model_id: uuid("model_id").notNull().references(() => models.id, { onDelete: "cascade" }),

    // 价格分类
    pricing_type: text("pricing_type").notNull().default("api_token"), // api_token | image | audio | video | embedding | rerank | batch | cache | off_peak

    // Token/Limit 价格 (api_token/cache 类型)
    input_per_1m_usd: numeric("input_per_1m_usd", { precision: 18, scale: 8 }),
    output_per_1m_usd: numeric("output_per_1m_usd", { precision: 18, scale: 8 }),
    input_cached_read_per_1m_usd: numeric("input_cached_read_per_1m_usd", { precision: 18, scale: 8 }),
    input_cached_write_per_1m_usd: numeric("input_cached_write_per_1m_usd", { precision: 18, scale: 8 }),

    // 媒体/特殊价格 (image/audio/video/embedding/rerank 类型)
    unit_amount: numeric("unit_amount", { precision: 18, scale: 8 }),
    unit_amount_usd: numeric("unit_amount_usd", { precision: 18, scale: 8 }),
    billing_unit: text("billing_unit"), // per_1M_tokens | per_image | per_audio_min | per_video_sec | per_1k_embeddings | per_request

    // 折扣
    batch_discount: numeric("batch_discount", { precision: 5, scale: 2 }),
    tiered_rules: jsonb("tiered_rules"),

    // 币种与区域
    currency_native: text("currency_native").notNull().default("USD"),
    price_native: numeric("price_native", { precision: 18, scale: 8 }),
    region: text("region").notNull().default("global"), // global | overseas | china_mainland
    channel: text("channel").notNull().default("official"), // official_api | cloud_platform | aggregator | reseller
    platform: text("platform"), // openrouter | siliconflow | aliyun-bailian | volcengine-ark | etc.
    selling_platform_provider: text("selling_platform_provider"),
    source_provider: text("source_provider"),

    // 标签
    is_official: boolean("is_official").notNull().default(true),
    is_aggregator: boolean("is_aggregator").notNull().default(false),
    is_domestic: boolean("is_domestic").notNull().default(false),

    // 时效
    effective_start_at: timestamp("effective_start_at", { withTimezone: true }),
    effective_end_at: timestamp("effective_end_at", { withTimezone: true }),
    is_current: boolean("is_current").notNull().default(true),

    // 可信度
    confidence_score: numeric("confidence_score", { precision: 4, scale: 2 }).notNull().default("0.80"),
    primary_source_id: text("primary_source_id").notNull(),
    source_snapshot_id: uuid("source_snapshot_id"),
    source_url: text("source_url").notNull(),
    source_type: text("source_type"), // official_page | api_response | third_party
    need_manual_review: boolean("need_manual_review").notNull().default(false),
    data_quality_flags: jsonb("data_quality_flags").$type<string[]>().notNull().default([]),

    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    modelTypeChan: uniqueIndex("pricing_model_type_chan_uq").on(t.model_id, t.pricing_type, t.channel, t.region, t.primary_source_id),
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

// ============================================================
// 补充需求：擅长方向 + 用户点评 + 推荐日志
// ============================================================

/** 模型擅长方向标签（一个模型可挂多个） */
export const modelStrengths = pgTable(
  "model_strengths",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    model_id: uuid("model_id").notNull().references(() => models.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name_zh: text("name_zh").notNull(),
    name_en: text("name_en"),
    category: text("category").notNull().default("capability"), // capability | scenario | audience
    sort_order: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    modelIdx: index("strength_model_idx").on(t.model_id),
    modelSlugUq: uniqueIndex("strength_model_slug_uq").on(t.model_id, t.slug),
  }),
);

/** 用户点评（结构化、可审核） */
export const userReviews = pgTable(
  "user_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: text("user_id").notNull(),
    model_id: uuid("model_id").notNull().references(() => models.id, { onDelete: "cascade" }),
    usage_scenario: text("usage_scenario").notNull(),
    usage_intensity: text("usage_intensity").notNull().default("medium"), // low | medium | high | enterprise
    usage_started_at: timestamp("usage_started_at", { withTimezone: true }),

    // 10 维评分 (1-5)
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

    // 文字反馈
    pros: text("pros"),
    cons: text("cons"),
    suitable_for: jsonb("suitable_for").$type<string[]>().notNull().default([]),
    not_suitable_for: jsonb("not_suitable_for").$type<string[]>().notNull().default([]),

    // 审核与可信度
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
// 补充功能：每日 AI 动态 + 会员/Plan 体系 + 汇率系统
// ============================================================

/** 新闻数据源注册 */
export const newsSources = pgTable(
  "news_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    name_zh: text("name_zh").notNull(),
    name_en: text("name_en"),
    source_type: text("source_type").notNull(), // rss | api | html | sitemap | github | docs
    region: text("region").notNull().default("cn"), // cn | global
    provider_id: uuid("provider_id").references(() => providers.id, { onDelete: "set null" }),
    urls: jsonb("urls").$type<string[]>().notNull().default([]),
    fetch_schedule: text("fetch_schedule").notNull().default("0 */6 * * *"),
    parser_type: text("parser_type").notNull().default("rss"), // rss | html | json-api | sitemap
    is_active: boolean("is_active").notNull().default(true),
    priority: integer("priority").notNull().default(5), // 1-10
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    typeIdx: index("ns_type_idx").on(t.source_type),
    regionIdx: index("ns_region_idx").on(t.region),
    activeIdx: index("ns_active_idx").on(t.is_active),
  }),
);

/** 新闻事件（多条 news_item 聚合为同一事件）—— 必须在 newsItems 之前定义 */
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

/** 单条新闻/动态 */
export const newsItems = pgTable(
  "news_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source_id: uuid("source_id").notNull().references(() => newsSources.id, { onDelete: "cascade" }),
    event_id: uuid("event_id").references(() => newsEvents.id, { onDelete: "set null" }),

    // 原始信息
    external_id: text("external_id"), // RSS guid / URL hash
    title: text("title").notNull(),
    summary: text("summary"),
    body_text: text("body_text"),
    url: text("url").notNull(),
    published_at: timestamp("published_at", { withTimezone: true }),
    fetched_at: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),

    // 分类
    category: text("category").notNull(), // new-model | price-change | promotion | plan-update | policy | capability | benchmark | product-update | funding | partnership | other
    subcategory: text("subcategory"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),

    // 关联实体
    related_provider_ids: jsonb("related_provider_ids").$type<string[]>().notNull().default([]),
    related_model_ids: jsonb("related_model_ids").$type<string[]>().notNull().default([]),

    // 影响分析
    impact_summary: text("impact_summary"),
    affects_pricing: boolean("affects_pricing").notNull().default(false),
    affects_recommendation: boolean("affects_recommendation").notNull().default(false),
    importance: integer("importance").notNull().default(3), // 1-5

    // 审核
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

/** 每日摘要 */
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

/** 产品/计费形态（区分 API/会员/Plan） */
export const productOfferings = pgTable(
  "product_offerings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider_id: uuid("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
    model_id: uuid("model_id").references(() => models.id, { onDelete: "set null" }),
    offering_type: text("offering_type").notNull(), // api | chat-member | team-plan | enterprise-plan | dev-plan | credit-pack | enterprise-quote | open-source
    name: text("name").notNull(),
    description: text("description"),
    billing_cycle: text("billing_cycle"), // monthly | annual | one-time | per-use
    price_amount: numeric("price_amount", { precision: 18, scale: 4 }),
    price_currency: text("price_currency").notNull().default("CNY"),
    price_period: text("price_period"), // month | year
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

/** 会员/订阅 Plan 详情（区别于 token 价格） */
export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider_id: uuid("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tier: text("tier").notNull(), // free | plus | pro | max | team | enterprise | custom
    description: text("description"),
    monthly_price: numeric("monthly_price", { precision: 18, scale: 4 }),
    annual_price: numeric("annual_price", { precision: 18, scale: 4 }),
    currency: text("currency").notNull().default("CNY"),
    model_access: jsonb("model_access").$type<string[]>().notNull().default([]),
    message_limit: integer("message_limit"),
    context_limit: integer("context_limit"),
    features: jsonb("features").$type<string[]>().notNull().default([]),
    extras: jsonb("extras"), // 附加权益
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

/** 汇率快照（增强版，用于新闻相关场景） */
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

/** 抓取日志 */
export const sourceFetchLogs = pgTable(
  "source_fetch_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source_id: text("source_id").notNull(),
    source_type: text("source_type").notNull(), // news_source | scraper_source
    url: text("url"),
    status: text("status").notNull(), // success | partial | failed | skipped
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
