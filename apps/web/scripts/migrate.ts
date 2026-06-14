/**
 * Drizzle migration script —— 直接用 SQL 初始化完整 schema
 * （与 worker/storage/schema.ts 和 web/lib/db/schema.ts 字段保持完全一致）
 */
import { config } from "../lib/env.js";
import pg from "pg";

const { Pool } = pg;

const SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 核心表
-- ============================================================

CREATE TABLE IF NOT EXISTS providers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text NOT NULL,
  name_zh text NOT NULL,
  name_en text,
  legal_name text,
  brand_name text,
  short_description text,
  long_description text,
  founded_year integer,
  headquarters text,
  country_or_region text,
  region text NOT NULL DEFAULT 'global',
  company_type text,
  provider_category text,
  parent_company text,
  official_website text,
  homepage text,
  developer_platform_url text,
  docs_url text,
  api_base_url text,
  api_docs_url text,
  pricing_url text,
  blog_url text,
  changelog_url text,
  github_url text,
  modelscope_url text,
  logo_url text,
  main_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  main_models jsonb NOT NULL DEFAULT '[]'::jsonb,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  suitable_users jsonb NOT NULL DEFAULT '[]'::jsonb,
  billing_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  supported_currencies jsonb NOT NULL DEFAULT '["CNY"]'::jsonb,
  supports_api boolean NOT NULL DEFAULT true,
  supports_subscription_plan boolean NOT NULL DEFAULT false,
  supports_enterprise_plan boolean NOT NULL DEFAULT false,
  supports_domestic_payment boolean NOT NULL DEFAULT false,
  supports_invoice boolean NOT NULL DEFAULT false,
  data_source_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  profile_confidence_score numeric(4, 2),
  need_manual_review boolean NOT NULL DEFAULT false,
  last_verified_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS providers_slug_uq ON providers (slug);
CREATE INDEX IF NOT EXISTS providers_region_idx ON providers (region);
CREATE INDEX IF NOT EXISTS providers_cat_idx ON providers (provider_category);
CREATE INDEX IF NOT EXISTS providers_active_idx ON providers (is_active);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS canonical_provider_id uuid;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS canonical_slug text;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS provider_type text;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS is_canonical boolean NOT NULL DEFAULT true;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS alias_confidence numeric(4, 2) NOT NULL DEFAULT 1.00;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS alias_source text NOT NULL DEFAULT 'self';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS needs_alias_review boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS provider_aliases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_slug text NOT NULL,
  canonical_slug text NOT NULL,
  display_name text,
  provider_type text NOT NULL DEFAULT 'model_vendor',
  alias_confidence numeric(4, 2) NOT NULL DEFAULT 0.80,
  alias_source text NOT NULL DEFAULT 'manual-baseline',
  needs_alias_review boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS provider_aliases_source_slug_uq ON provider_aliases (source_slug);
CREATE INDEX IF NOT EXISTS provider_aliases_canonical_idx ON provider_aliases (canonical_slug);
CREATE INDEX IF NOT EXISTS provider_aliases_review_idx ON provider_aliases (needs_alias_review);

CREATE TABLE IF NOT EXISTS models (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  family text,
  modality jsonb NOT NULL DEFAULT '["text"]'::jsonb,
  context_length integer,
  max_output_tokens integer,
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  release_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS models_slug_uq ON models (slug);
CREATE INDEX IF NOT EXISTS models_provider_idx ON models (provider_id);
ALTER TABLE models ADD COLUMN IF NOT EXISTS first_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE models ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE models ADD COLUMN IF NOT EXISTS official_release_date date;
ALTER TABLE models ADD COLUMN IF NOT EXISTS official_updated_at timestamptz;
ALTER TABLE models ADD COLUMN IF NOT EXISTS official_source_url text;
ALTER TABLE models ADD COLUMN IF NOT EXISTS lifecycle_tier text NOT NULL DEFAULT 'unknown';
ALTER TABLE models ADD COLUMN IF NOT EXISTS discovered_from text NOT NULL DEFAULT 'pricing_source';
ALTER TABLE models ADD COLUMN IF NOT EXISTS source_confidence numeric(4, 2) NOT NULL DEFAULT 0.70;
ALTER TABLE models ADD COLUMN IF NOT EXISTS needs_pricing_review boolean NOT NULL DEFAULT false;
ALTER TABLE models ADD COLUMN IF NOT EXISTS needs_capability_review boolean NOT NULL DEFAULT false;
ALTER TABLE models ADD COLUMN IF NOT EXISTS is_recommended_by_official boolean NOT NULL DEFAULT false;
ALTER TABLE models ADD COLUMN IF NOT EXISTS is_default_in_official_docs boolean NOT NULL DEFAULT false;
ALTER TABLE models ADD COLUMN IF NOT EXISTS is_latest_alias boolean NOT NULL DEFAULT false;
ALTER TABLE models ADD COLUMN IF NOT EXISTS canonical_model_slug text;
ALTER TABLE models ADD COLUMN IF NOT EXISTS model_family text;
ALTER TABLE models ADD COLUMN IF NOT EXISTS model_variant text;
ALTER TABLE models ADD COLUMN IF NOT EXISTS model_owner_provider text;
ALTER TABLE models ADD COLUMN IF NOT EXISTS selling_platform_provider text;
ALTER TABLE models ADD COLUMN IF NOT EXISTS source_provider text;
ALTER TABLE models ADD COLUMN IF NOT EXISTS source_model_id text;
ALTER TABLE models ADD COLUMN IF NOT EXISTS data_quality_flags jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE models ADD COLUMN IF NOT EXISTS needs_alias_review boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS models_canonical_slug_idx ON models (canonical_model_slug);
CREATE INDEX IF NOT EXISTS models_model_family_idx ON models (model_family);
CREATE INDEX IF NOT EXISTS models_owner_provider_idx ON models (model_owner_provider);

CREATE TABLE IF NOT EXISTS latest_model_candidates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_slug text NOT NULL,
  model_slug text NOT NULL,
  model_name text NOT NULL,
  family text,
  source_id text NOT NULL,
  source_url text NOT NULL,
  source_type text NOT NULL DEFAULT 'official',
  discovery_status text NOT NULL DEFAULT 'candidate',
  model_status text NOT NULL DEFAULT 'unknown',
  lifecycle_tier text NOT NULL DEFAULT 'unknown',
  confidence_score numeric(4, 2) NOT NULL DEFAULT 0.80,
  has_pricing boolean NOT NULL DEFAULT false,
  needs_pricing_review boolean NOT NULL DEFAULT true,
  needs_capability_review boolean NOT NULL DEFAULT true,
  is_recommended_by_official boolean NOT NULL DEFAULT false,
  is_default_in_official_docs boolean NOT NULL DEFAULT false,
  is_latest_alias boolean NOT NULL DEFAULT false,
  raw_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS latest_model_candidates_uq ON latest_model_candidates (provider_slug, model_slug, source_id);
CREATE INDEX IF NOT EXISTS lmc_provider_idx ON latest_model_candidates (provider_slug);
CREATE INDEX IF NOT EXISTS lmc_status_idx ON latest_model_candidates (discovery_status);
CREATE INDEX IF NOT EXISTS lmc_pricing_review_idx ON latest_model_candidates (needs_pricing_review);
CREATE INDEX IF NOT EXISTS lmc_seen_idx ON latest_model_candidates (last_seen_at);
ALTER TABLE latest_model_candidates ADD COLUMN IF NOT EXISTS canonical_model_slug text;
ALTER TABLE latest_model_candidates ADD COLUMN IF NOT EXISTS model_family text;
ALTER TABLE latest_model_candidates ADD COLUMN IF NOT EXISTS model_variant text;
ALTER TABLE latest_model_candidates ADD COLUMN IF NOT EXISTS model_owner_provider text;
ALTER TABLE latest_model_candidates ADD COLUMN IF NOT EXISTS selling_platform_provider text;
ALTER TABLE latest_model_candidates ADD COLUMN IF NOT EXISTS source_provider text;
ALTER TABLE latest_model_candidates ADD COLUMN IF NOT EXISTS source_model_id text;
ALTER TABLE latest_model_candidates ADD COLUMN IF NOT EXISTS data_quality_flags jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE latest_model_candidates ADD COLUMN IF NOT EXISTS needs_alias_review boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS lmc_canonical_model_idx ON latest_model_candidates (canonical_model_slug);
CREATE INDEX IF NOT EXISTS lmc_model_family_idx ON latest_model_candidates (model_family);

CREATE TABLE IF NOT EXISTS model_discovery_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id text NOT NULL,
  provider_slug text NOT NULL,
  source_url text NOT NULL,
  status text NOT NULL,
  candidates_found integer NOT NULL DEFAULT 0,
  models_inserted integer NOT NULL DEFAULT 0,
  missing_pricing integer NOT NULL DEFAULT 0,
  http_status integer,
  parser_status text NOT NULL DEFAULT 'unknown',
  next_action text,
  error_message text,
  duration_ms integer,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE model_discovery_logs ADD COLUMN IF NOT EXISTS http_status integer;
ALTER TABLE model_discovery_logs ADD COLUMN IF NOT EXISTS parser_status text NOT NULL DEFAULT 'unknown';
ALTER TABLE model_discovery_logs ADD COLUMN IF NOT EXISTS next_action text;
CREATE INDEX IF NOT EXISTS mdl_source_idx ON model_discovery_logs (source_id);
CREATE INDEX IF NOT EXISTS mdl_provider_idx ON model_discovery_logs (provider_slug);
CREATE INDEX IF NOT EXISTS mdl_status_idx ON model_discovery_logs (status);

CREATE TABLE IF NOT EXISTS pricing (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id uuid NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  pricing_type text NOT NULL DEFAULT 'api_token',
  input_per_1m_usd numeric(18, 8),
  output_per_1m_usd numeric(18, 8),
  input_cached_read_per_1m_usd numeric(18, 8),
  input_cached_write_per_1m_usd numeric(18, 8),
  unit_amount numeric(18, 8),
  unit_amount_usd numeric(18, 8),
  billing_unit text,
  batch_discount numeric(5, 2),
  tiered_rules jsonb,
  currency_native text NOT NULL DEFAULT 'USD',
  price_native numeric(18, 8),
  region text NOT NULL DEFAULT 'global',
  channel text NOT NULL DEFAULT 'official',
  effective_start_at timestamptz,
  effective_end_at timestamptz,
  is_current boolean NOT NULL DEFAULT true,
  confidence_score numeric(4, 2) NOT NULL DEFAULT 0.80,
  primary_source_id text NOT NULL,
  source_snapshot_id uuid,
  source_url text NOT NULL,
  source_type text,
  need_manual_review boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pricing_has_source_url CHECK (length(source_url) > 0)
);
DROP INDEX IF EXISTS pricing_model_type_chan_uq;
CREATE UNIQUE INDEX IF NOT EXISTS pricing_model_type_chan_uq ON pricing (model_id, pricing_type, channel, region, primary_source_id);
CREATE INDEX IF NOT EXISTS pricing_confidence_idx ON pricing (confidence_score);
CREATE INDEX IF NOT EXISTS pricing_review_idx ON pricing (need_manual_review);
CREATE INDEX IF NOT EXISTS pricing_current_idx ON pricing (is_current);
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT true;
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS is_aggregator boolean NOT NULL DEFAULT false;
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS is_domestic boolean NOT NULL DEFAULT false;
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS selling_platform_provider text;
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS source_provider text;
ALTER TABLE pricing ADD COLUMN IF NOT EXISTS data_quality_flags jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS pricing_platform_idx ON pricing (platform);
CREATE INDEX IF NOT EXISTS pricing_selling_platform_idx ON pricing (selling_platform_provider);
CREATE INDEX IF NOT EXISTS pricing_source_provider_idx ON pricing (source_provider);

CREATE TABLE IF NOT EXISTS price_change_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id uuid NOT NULL,
  field text NOT NULL,
  old_value numeric(18, 8),
  new_value numeric(18, 8),
  change_pct numeric(6, 2),
  source_id text NOT NULL,
  source_url text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  applied boolean NOT NULL DEFAULT false,
  review_id uuid
);
CREATE INDEX IF NOT EXISTS price_change_model_idx ON price_change_log (model_id);
CREATE INDEX IF NOT EXISTS price_change_field_idx ON price_change_log (field);
CREATE INDEX IF NOT EXISTS price_change_detected_idx ON price_change_log (detected_at);

CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  promotion_type text NOT NULL,
  model_external_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  gift_amount numeric(18, 4),
  gift_unit text,
  discount_rate numeric(5, 2),
  starts_at timestamptz,
  ends_at timestamptz,
  min_spend numeric(18, 4),
  eligibility text,
  source_url text NOT NULL,
  source_snapshot_id uuid,
  confidence_score numeric(4, 2) NOT NULL DEFAULT 0.70,
  need_manual_review boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS promo_provider_idx ON promotions (provider_id);
CREATE INDEX IF NOT EXISTS promo_type_idx ON promotions (promotion_type);
CREATE INDEX IF NOT EXISTS promo_active_idx ON promotions (is_active);

CREATE TABLE IF NOT EXISTS review_queue (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type text NOT NULL,
  entity_id uuid,
  reason text NOT NULL,
  payload jsonb NOT NULL,
  conflicts jsonb,
  status text NOT NULL DEFAULT 'pending',
  assigned_to text,
  resolution jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS review_entity_idx ON review_queue (entity_type);
CREATE INDEX IF NOT EXISTS review_reason_idx ON review_queue (reason);
CREATE INDEX IF NOT EXISTS review_status_idx ON review_queue (status);

CREATE TABLE IF NOT EXISTS source_snapshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id text NOT NULL,
  url text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  content_type text NOT NULL,
  raw_content text NOT NULL,
  raw_hash text NOT NULL,
  parser_version text,
  parsed_at timestamptz,
  parse_status text NOT NULL DEFAULT 'success',
  parse_error text
);
CREATE INDEX IF NOT EXISTS snap_source_idx ON source_snapshots (source_id);
CREATE INDEX IF NOT EXISTS snap_hash_idx ON source_snapshots (raw_hash);

CREATE TABLE IF NOT EXISTS scraper_jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id text NOT NULL,
  schedule text NOT NULL,
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_status text,
  consecutive_failures integer NOT NULL DEFAULT 0,
  last_error text,
  avg_duration_ms integer
);
CREATE INDEX IF NOT EXISTS jobs_source_idx ON scraper_jobs (source_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON scraper_jobs (last_status);

CREATE TABLE IF NOT EXISTS fx_rates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  base text NOT NULL,
  quote text NOT NULL,
  rate numeric(18, 8) NOT NULL,
  as_of timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'static'
);

-- ============================================================
-- 补充表：擅长方向 + 用户点评
-- ============================================================

CREATE TABLE IF NOT EXISTS model_strengths (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id uuid NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name_zh text NOT NULL,
  name_en text,
  category text NOT NULL DEFAULT 'capability',
  sort_order integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS strength_model_slug_uq ON model_strengths (model_id, slug);
CREATE INDEX IF NOT EXISTS strength_model_idx ON model_strengths (model_id);

CREATE TABLE IF NOT EXISTS user_reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  model_id uuid NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  usage_scenario text NOT NULL,
  usage_intensity text NOT NULL DEFAULT 'medium',
  usage_started_at timestamptz,
  rating_price numeric(3, 1),
  rating_chinese numeric(3, 1),
  rating_code numeric(3, 1),
  rating_reasoning numeric(3, 1),
  rating_speed numeric(3, 1),
  rating_stability numeric(3, 1),
  rating_api_ease numeric(3, 1),
  rating_docs_clarity numeric(3, 1),
  rating_payment numeric(3, 1),
  rating_overall numeric(3, 1) NOT NULL,
  pros text,
  cons text,
  suitable_for jsonb NOT NULL DEFAULT '[]'::jsonb,
  not_suitable_for jsonb NOT NULL DEFAULT '[]'::jsonb,
  verified_use boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  is_flagged boolean NOT NULL DEFAULT false,
  flag_reason text,
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS review_model_idx ON user_reviews (model_id);
CREATE INDEX IF NOT EXISTS review_approved_idx ON user_reviews (is_approved);
CREATE INDEX IF NOT EXISTS review_flagged_idx ON user_reviews (is_flagged);
CREATE INDEX IF NOT EXISTS review_overall_idx ON user_reviews (rating_overall);

-- ============================================================
-- 补充表：每日 AI 动态 + 会员/Plan 体系
-- ============================================================

CREATE TABLE IF NOT EXISTS news_sources (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text NOT NULL UNIQUE,
  name_zh text NOT NULL,
  name_en text,
  source_type text NOT NULL,
  region text NOT NULL DEFAULT 'cn',
  provider_id uuid REFERENCES providers(id) ON DELETE SET NULL,
  urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  fetch_schedule text NOT NULL DEFAULT '0 */6 * * *',
  parser_type text NOT NULL DEFAULT 'rss',
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ns_type_idx ON news_sources (source_type);
CREATE INDEX IF NOT EXISTS ns_region_idx ON news_sources (region);
CREATE INDEX IF NOT EXISTS ns_active_idx ON news_sources (is_active);

CREATE TABLE IF NOT EXISTS news_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  summary text,
  category text NOT NULL,
  importance integer NOT NULL DEFAULT 3,
  related_provider_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_model_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  item_count integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  is_featured boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS ne_category_idx ON news_events (category);
CREATE INDEX IF NOT EXISTS ne_published_idx ON news_events (is_published);

CREATE TABLE IF NOT EXISTS news_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id uuid NOT NULL REFERENCES news_sources(id) ON DELETE CASCADE,
  event_id uuid REFERENCES news_events(id) ON DELETE SET NULL,
  external_id text,
  title text NOT NULL,
  summary text,
  body_text text,
  url text NOT NULL,
  published_at timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  category text NOT NULL,
  subcategory text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_provider_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_model_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  impact_summary text,
  affects_pricing boolean NOT NULL DEFAULT false,
  affects_recommendation boolean NOT NULL DEFAULT false,
  importance integer NOT NULL DEFAULT 3,
  confidence_score numeric(4, 2) NOT NULL DEFAULT 0.80,
  need_manual_review boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ni_external_uq ON news_items (source_id, external_id);
CREATE INDEX IF NOT EXISTS ni_source_idx ON news_items (source_id);
CREATE INDEX IF NOT EXISTS ni_event_idx ON news_items (event_id);
CREATE INDEX IF NOT EXISTS ni_category_idx ON news_items (category);
CREATE INDEX IF NOT EXISTS ni_published_idx ON news_items (is_published);
CREATE INDEX IF NOT EXISTS ni_fetched_idx ON news_items (fetched_at);

CREATE TABLE IF NOT EXISTS daily_digests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  date date NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  stats jsonb NOT NULL DEFAULT '{"newModels":0,"priceChanges":0,"promotions":0,"planUpdates":0,"policy":0,"other":0}'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_offerings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  model_id uuid REFERENCES models(id) ON DELETE SET NULL,
  offering_type text NOT NULL,
  name text NOT NULL,
  description text,
  billing_cycle text,
  price_amount numeric(18, 4),
  price_currency text NOT NULL DEFAULT 'CNY',
  price_period text,
  seat_count integer,
  token_quota numeric(18, 0),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  source_url text NOT NULL,
  confidence_score numeric(4, 2) NOT NULL DEFAULT 0.80,
  need_manual_review boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS po_provider_idx ON product_offerings (provider_id);
CREATE INDEX IF NOT EXISTS po_type_idx ON product_offerings (offering_type);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name text NOT NULL,
  tier text NOT NULL,
  description text,
  monthly_price numeric(18, 4),
  annual_price numeric(18, 4),
  currency text NOT NULL DEFAULT 'CNY',
  model_access jsonb NOT NULL DEFAULT '[]'::jsonb,
  message_limit integer,
  context_limit integer,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  extras jsonb,
  source_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sp_provider_idx ON subscription_plans (provider_id);
CREATE INDEX IF NOT EXISTS sp_tier_idx ON subscription_plans (tier);

CREATE TABLE IF NOT EXISTS exchange_rate_snapshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  base text NOT NULL,
  quote text NOT NULL,
  rate numeric(18, 8) NOT NULL,
  as_of timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  previous_rate numeric(18, 8),
  change_pct numeric(6, 2)
);
CREATE INDEX IF NOT EXISTS ers_pair_idx ON exchange_rate_snapshots (base, quote);

CREATE TABLE IF NOT EXISTS source_fetch_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id uuid NOT NULL,
  source_type text NOT NULL,
  url text,
  status text NOT NULL,
  items_fetched integer NOT NULL DEFAULT 0,
  items_new integer NOT NULL DEFAULT 0,
  error_message text,
  duration_ms integer,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sfl_source_idx ON source_fetch_logs (source_id);
CREATE INDEX IF NOT EXISTS sfl_status_idx ON source_fetch_logs (status);

INSERT INTO provider_aliases
  (source_slug, canonical_slug, display_name, provider_type, alias_confidence, alias_source, needs_alias_review, notes)
VALUES
  ('xai', 'xai', 'xAI', 'model_vendor', 1.00, 'manual-baseline', false, 'canonical'),
  ('x-ai', 'xai', 'xAI', 'model_vendor', 0.98, 'manual-baseline', false, 'spelling variant'),
  ('x.ai', 'xai', 'xAI', 'model_vendor', 0.98, 'manual-baseline', false, 'domain spelling variant'),
  ('google', 'google', 'Google', 'model_vendor', 1.00, 'manual-baseline', false, 'canonical'),
  ('google-ai', 'google', 'Google', 'model_vendor', 0.95, 'manual-baseline', false, 'Google AI Studio'),
  ('gemini', 'google', 'Google Gemini', 'model_vendor', 0.95, 'manual-baseline', false, 'Gemini model owner'),
  ('vertex-ai-language-models', 'google', 'Google Vertex AI', 'cloud_platform', 0.90, 'manual-baseline', false, 'selling platform remains Vertex AI'),
  ('openai', 'openai', 'OpenAI', 'model_vendor', 1.00, 'manual-baseline', false, 'canonical'),
  ('~openai', 'openai', 'OpenAI', 'model_vendor', 0.92, 'manual-baseline', false, 'source spelling variant'),
  ('azure-openai', 'openai', 'Azure OpenAI', 'cloud_platform', 0.70, 'manual-baseline', true, 'owner is OpenAI, selling platform is Azure'),
  ('anthropic', 'anthropic', 'Anthropic', 'model_vendor', 1.00, 'manual-baseline', false, 'canonical'),
  ('claude', 'anthropic', 'Anthropic Claude', 'model_vendor', 0.95, 'manual-baseline', false, 'model family alias'),
  ('alibaba', 'alibaba-cloud', 'Alibaba Cloud', 'cloud_platform', 0.88, 'manual-baseline', false, 'cloud/model studio owner mapping'),
  ('aliyun', 'alibaba-cloud', 'Alibaba Cloud', 'cloud_platform', 0.90, 'manual-baseline', false, 'Aliyun alias'),
  ('aliyun-bailian', 'alibaba-cloud', 'Alibaba Cloud Bailian', 'cloud_platform', 0.96, 'manual-baseline', false, 'Bailian platform'),
  ('bailian', 'alibaba-cloud', 'Alibaba Cloud Bailian', 'cloud_platform', 0.95, 'manual-baseline', false, 'Bailian alias'),
  ('qwen', 'alibaba-cloud', 'Qwen', 'model_vendor', 0.82, 'manual-baseline', true, 'Qwen can be model owner; review platform split'),
  ('bytedance', 'bytedance-volcano', 'ByteDance Volcano Engine', 'cloud_platform', 0.88, 'manual-baseline', false, 'ByteDance/Volcano family'),
  ('volcano', 'bytedance-volcano', 'Volcano Engine', 'cloud_platform', 0.95, 'manual-baseline', false, 'Volcano alias'),
  ('volcengine', 'bytedance-volcano', 'Volcano Engine', 'cloud_platform', 0.98, 'manual-baseline', false, 'canonical platform spelling'),
  ('doubao', 'bytedance-volcano', 'Doubao', 'model_vendor', 0.85, 'manual-baseline', true, 'Doubao model owner under ByteDance; review exact split'),
  ('moonshot', 'moonshot', 'Moonshot AI', 'model_vendor', 1.00, 'manual-baseline', false, 'canonical'),
  ('minimax', 'minimax', 'MiniMax', 'model_vendor', 1.00, 'manual-baseline', false, 'canonical'),
  ('MiniMax', 'minimax', 'MiniMax', 'model_vendor', 1.00, 'manual-baseline', false, 'case variant'),
  ('siliconflow', 'siliconflow', 'SiliconFlow', 'api_aggregator', 1.00, 'manual-baseline', false, 'canonical aggregator'),
  ('硅基流动', 'siliconflow', 'SiliconFlow', 'api_aggregator', 0.98, 'manual-baseline', false, 'Chinese spelling'),
  ('openrouter', 'openrouter', 'OpenRouter', 'api_aggregator', 1.00, 'manual-baseline', false, 'selling platform, not model owner')
ON CONFLICT (source_slug) DO UPDATE SET
  canonical_slug = EXCLUDED.canonical_slug,
  display_name = EXCLUDED.display_name,
  provider_type = EXCLUDED.provider_type,
  alias_confidence = EXCLUDED.alias_confidence,
  alias_source = EXCLUDED.alias_source,
  needs_alias_review = EXCLUDED.needs_alias_review,
  notes = EXCLUDED.notes,
  updated_at = now();

UPDATE providers p
SET
  canonical_slug = COALESCE(a.canonical_slug, lower(p.slug)),
  provider_type = COALESCE(a.provider_type, p.provider_category, 'model_vendor'),
  is_canonical = COALESCE(a.canonical_slug, lower(p.slug)) = lower(p.slug),
  alias_confidence = COALESCE(a.alias_confidence, 1.00),
  alias_source = COALESCE(a.alias_source, 'self'),
  needs_alias_review = COALESCE(a.needs_alias_review, false),
  updated_at = now()
FROM provider_aliases a
WHERE a.source_slug = p.slug;

UPDATE providers
SET canonical_slug = lower(slug),
    provider_type = COALESCE(provider_type, provider_category, 'model_vendor'),
    is_canonical = true,
    alias_confidence = COALESCE(alias_confidence, 1.00),
    alias_source = COALESCE(alias_source, 'self')
WHERE canonical_slug IS NULL;
`;

async function main() {
  const pool = new Pool({ connectionString: config.databaseUrl });
  console.log("Running migrations...");
  await pool.query(SQL);
  console.log("✓ 19 tables created/verified");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
