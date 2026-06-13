import { z } from "zod";

/**
 * Provider（厂商）schema —— 字段约定与 pydantic/genai-prices 兼容
 */
export const ProviderSchema = z.object({
  id: z.string().describe("厂商唯一 slug，如 'aliyun-bailian'"),
  name: z.string().describe("显示名"),
  name_en: z.string().optional(),
  region: z.enum(["cn", "global"]).default("global"),
  homepage: z.string().url().optional(),
  docs_url: z.string().url().optional(),
  api_base_url: z.string().url().optional(),
  logo_url: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});
export type Provider = z.infer<typeof ProviderSchema>;

/**
 * 模型能力标签字典
 */
export const CAPABILITY_TAGS = [
  "text",
  "vision",
  "audio",
  "video",
  "function-call",
  "json-mode",
  "long-context",
  "cache",
  "batch",
  "fine-tune",
  "embedding",
  "image-gen",
  "code",
  "reasoning",
] as const;
export type CapabilityTag = (typeof CAPABILITY_TAGS)[number];

/**
 * 模型 schema
 */
export const ModelSchema = z.object({
  id: z.string().describe("全局唯一 slug，如 'openai/gpt-4o'"),
  provider_id: z.string(),
  name: z.string(),
  family: z.string().optional().describe("模型系列，如 'gpt-4o'"),
  modality: z.array(z.enum(["text", "image", "audio", "video"])).default(["text"]),
  context_length: z.number().int().nonnegative().optional(),
  max_output_tokens: z.number().int().nonnegative().optional(),
  capabilities: z.array(z.string()).default([]),
  release_date: z.string().optional().describe("YYYY-MM-DD"),
  status: z.enum(["active", "beta", "deprecated", "preview"]).default("active"),
});
export type Model = z.infer<typeof ModelSchema>;

/**
 * 阶梯计费规则
 */
export const TieredRuleSchema = z.object({
  up_to: z.number().int().nonnegative().describe("累计 token 上限（>0）"),
  input_per_1m: z.number().nonnegative().describe("USD / 1M tokens"),
  output_per_1m: z.number().nonnegative().describe("USD / 1M tokens"),
});
export type TieredRule = z.infer<typeof TieredRuleSchema>;

/**
 * 价格 schema（统一为 USD / 1M tokens；其他单位在 normalizer 层转换）
 */
export const PricingSchema = z.object({
  model_id: z.string(),

  // 基础 token 价格
  input_per_1m_usd: z.number().nonnegative(),
  output_per_1m_usd: z.number().nonnegative(),

  // 缓存（可空）
  input_cached_read_per_1m_usd: z.number().nonnegative().optional(),
  input_cached_write_per_1m_usd: z.number().nonnegative().optional(),

  // 多模态（可空）
  audio_input_per_1m_usd: z.number().nonnegative().optional(),
  audio_output_per_1m_usd: z.number().nonnegative().optional(),
  image_per_unit_usd: z.number().nonnegative().optional().describe("USD / 张"),
  video_per_second_usd: z.number().nonnegative().optional(),

  // 固定费用
  per_call_usd: z.number().nonnegative().optional(),

  // 阶梯
  tiered_rules: z.array(TieredRuleSchema).optional(),

  // 批量折扣 0~1（0.5 = 5 折）
  batch_discount: z.number().min(0).max(1).optional(),

  // 元数据
  currency_native: z.string().default("USD"),
  effective_at: z.string().optional(),
  source_id: z.string().describe("来源 id，如 'litellm'"),
  source_url: z.string().url().describe("可追溯的源 URL"),
  confidence_score: z.number().min(0).max(1).default(0.8),
  need_manual_review: z.boolean().default(false),
});
export type Pricing = z.infer<typeof PricingSchema>;

/**
 * 优惠 schema
 */
export const PromotionTypeSchema = z.enum([
  "new-user-gift",
  "limited-time",
  "quantity-discount",
  "coding-plan",
  "free-tier",
  "voucher",
  "trial",
]);
export type PromotionType = z.infer<typeof PromotionTypeSchema>;

export const PromotionSchema = z.object({
  id: z.string().optional(),
  provider_id: z.string(),
  model_ids: z.array(z.string()).default([]),
  title: z.string(),
  description: z.string().optional(),
  promotion_type: PromotionTypeSchema,
  gift_amount: z.number().nonnegative().optional(),
  gift_unit: z.enum(["tokens", "credits", "cny", "usd"]).optional(),
  discount_rate: z.number().min(0).max(1).optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  min_spend: z.number().nonnegative().optional(),
  eligibility: z.string().optional(),
  source_url: z.string().url(),
  confidence_score: z.number().min(0).max(1).default(0.7),
  need_manual_review: z.boolean().default(true),
  is_active: z.boolean().default(true),
});
export type Promotion = z.infer<typeof PromotionSchema>;
