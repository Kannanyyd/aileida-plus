/**
 * 共享类型
 */
export interface RawPayload {
  url: string;
  fetchedAt: string;
  contentType: "json" | "html" | "text";
  body: string;
  sourceId: string;
}

export interface NormalizedModel {
  external_id: string;       // 源内唯一 id
  provider_slug: string;     // 标准化为 'openai' / 'deepseek' / ...
  name: string;
  family?: string;
  modality: string[];
  context_length?: number;
  max_output_tokens?: number;
  capabilities: string[];
  release_date?: string;
  status: "active" | "beta" | "deprecated" | "preview";
  source_id: string;
  source_url: string;
  confidence_score: number;
  need_manual_review: boolean;
}

export interface NormalizedPricing {
  model_external_id: string;
  // 多价格类型
  pricing_type?: "api_token" | "image" | "audio" | "video" | "embedding" | "rerank" | "batch" | "cache" | "off_peak";
  // Token 价格 (api_token 类型)
  input_per_1m_usd?: number;
  output_per_1m_usd?: number;
  input_cached_read_per_1m_usd?: number;
  input_cached_write_per_1m_usd?: number;
  // 媒体/特殊价格
  unit_amount?: number;
  unit_amount_usd?: number;
  billing_unit?: "per_1M_tokens" | "per_image" | "per_audio_min" | "per_video_sec" | "per_1k_embeddings" | "per_request";
  // 折扣
  batch_discount?: number;
  tiered_rules?: Array<{ up_to: number; input_per_1m: number; output_per_1m: number }>;
  // 币种与区域
  currency_native?: string;
  price_native?: number;
  region?: "global" | "overseas" | "china_mainland" | "hongkong" | "singapore" | "us" | "eu" | "unknown";
  channel?: "official_api" | "cloud_platform" | "aggregator" | "subscription_plan" | "enterprise" | "promotion" | "reseller";
  platform?: string; // openrouter | siliconflow | aliyun-bailian | volcengine-ark | etc.
  is_official?: boolean;
  is_aggregator?: boolean;
  is_domestic?: boolean;
  // 时效
  effective_start_at?: string;
  effective_end_at?: string;
  // 来源与可信度
  source_id?: string;
  source_url: string;
  source_type?: "official_page" | "api_response" | "third_party";
  confidence_score?: number;
  need_manual_review?: boolean;
}

export interface NormalizedPromotion {
  provider_slug: string;
  model_external_ids: string[];
  title: string;
  description?: string;
  promotion_type: "new-user-gift" | "limited-time" | "quantity-discount" | "coding-plan" | "free-tier" | "voucher" | "trial";
  gift_amount?: number;
  gift_unit?: "tokens" | "credits" | "cny" | "usd";
  discount_rate?: number;
  starts_at?: string;
  ends_at?: string;
  min_spend?: number;
  eligibility?: string;
  source_url: string;
  confidence_score: number;
  need_manual_review: boolean;
}
