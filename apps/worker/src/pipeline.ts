/**
 * 跑一个 source 抓取 → 标准化 → 入库
 */
import { fetchLiteLLM } from "./sources/litellm.js";
import { fetchOpenRouter } from "./sources/openrouter.js";
import { fetchLlmPricesCurrent, fetchLlmPricesHistorical } from "./sources/llm-prices.js";
import { fetchGenaiPrices } from "./sources/genai-prices.js";
import { fetchCnProvider } from "./sources/cn-provider.js";
import { CN_PROVIDERS } from "./sources/cn-registry.js";
import { upsertProvider } from "./storage/provider-store.js";
import { upsertModel, findModelByExternalId } from "./storage/model-store.js";
import { upsertPricing } from "./storage/pricing-store.js";
import { db } from "./storage/client.js";
import { providers, promotions as promotionTable } from "./storage/schema.js";
import { eq } from "drizzle-orm";
import type { NormalizedModel, NormalizedPricing, NormalizedPromotion } from "./types.js";

const PROVIDER_META: Record<string, { name_zh: string; region: "cn" | "global"; homepage?: string }> = {
  openai: { name_zh: "OpenAI", region: "global", homepage: "https://openai.com" },
  anthropic: { name_zh: "Anthropic", region: "global", homepage: "https://anthropic.com" },
  google: { name_zh: "Google DeepMind", region: "global", homepage: "https://deepmind.google" },
  mistral: { name_zh: "Mistral AI", region: "global", homepage: "https://mistral.ai" },
  cohere: { name_zh: "Cohere", region: "global", homepage: "https://cohere.com" },
  meta: { name_zh: "Meta AI", region: "global", homepage: "https://ai.meta.com" },
  groq: { name_zh: "Groq", region: "global", homepage: "https://groq.com" },
  deepseek: { name_zh: "DeepSeek", region: "cn", homepage: "https://www.deepseek.com" },
  alibaba: { name_zh: "阿里通义千问", region: "cn", homepage: "https://tongyi.aliyun.com" },
  moonshot: { name_zh: "月之暗面 Kimi", region: "cn", homepage: "https://www.moonshot.cn" },
  zhipu: { name_zh: "智谱 AI", region: "cn", homepage: "https://www.zhipuai.cn" },
  baichuan: { name_zh: "百川智能", region: "cn", homepage: "https://www.baichuan-ai.com" },
  MiniMax: { name_zh: "MiniMax", region: "cn", homepage: "https://api.MiniMax.chat" },
  yi: { name_zh: "零一万物", region: "cn", homepage: "https://www.lingyiwanwu.com" },
  perplexity: { name_zh: "Perplexity", region: "global", homepage: "https://www.perplexity.ai" },
  "aliyun-bailian": { name_zh: "阿里云百炼", region: "cn", homepage: "https://bailian.console.aliyun.com" },
  volcengine: { name_zh: "火山方舟 / 豆包", region: "cn", homepage: "https://www.volcengine.com/product/ark" },
  "tencent-hunyuan": { name_zh: "腾讯混元", region: "cn", homepage: "https://cloud.tencent.com/product/hunyuan" },
  "baidu-qianfan": { name_zh: "百度千帆", region: "cn", homepage: "https://qianfan.cloud.baidu.com" },
  siliconflow: { name_zh: "硅基流动 SiliconFlow", region: "cn", homepage: "https://siliconflow.cn" },
  stepfun: { name_zh: "阶跃星辰 StepFun", region: "cn", homepage: "https://www.stepfun.com" },
  tencent: { name_zh: "腾讯", region: "cn", homepage: "https://cloud.tencent.com" },
  baidu: { name_zh: "百度", region: "cn", homepage: "https://cloud.baidu.com" },
  azure: { name_zh: "Azure OpenAI", region: "global", homepage: "https://azure.microsoft.com" },
  bedrock: { name_zh: "AWS Bedrock", region: "global", homepage: "https://aws.amazon.com/bedrock" },
  openrouter: { name_zh: "OpenRouter", region: "global", homepage: "https://openrouter.ai" },
  xai: { name_zh: "xAI", region: "global", homepage: "https://x.ai" },
  nvidia: { name_zh: "NVIDIA NIM", region: "global", homepage: "https://build.nvidia.com" },
};

async function ensureProvider(slug: string): Promise<string> {
  const meta = PROVIDER_META[slug] ?? { name_zh: slug, region: "global" as const };
  const found = await db.select().from(providers).where(eq(providers.slug, slug)).limit(1);
  if (found.length > 0) return found[0].id;
  const p = await upsertProvider({
    slug,
    name_zh: meta.name_zh,
    name_en: slug,
    region: meta.region,
    homepage: meta.homepage,
  });
  return p.id;
}

async function ingestModelsAndPricing(
  modelsList: NormalizedModel[],
  pricingList: NormalizedPricing[],
  sourceLabel: string,
) {
  // 1) 按 provider 分组
  const byProvider = new Map<string, { models: NormalizedModel[]; pricing: NormalizedPricing[] }>();
  for (const m of modelsList) {
    if (!byProvider.has(m.provider_slug)) byProvider.set(m.provider_slug, { models: [], pricing: [] });
    byProvider.get(m.provider_slug)!.models.push(m);
  }
  for (const p of pricingList) {
    const providerSlug = p.model_external_id.split("/")[0];
    if (!byProvider.has(providerSlug)) byProvider.set(providerSlug, { models: [], pricing: [] });
    byProvider.get(providerSlug)!.pricing.push(p);
  }

  let totalInserted = 0;
  let totalPricingRows = 0;
  let totalReview = 0;

  for (const [providerSlug, group] of byProvider.entries()) {
    const providerId = await ensureProvider(providerSlug);
    // 2) upsert 模型
    const slugToModelId = new Map<string, string>();
    for (const m of group.models) {
      // 模型 slug 仅取 id 最后一段（避免不同源重复 provider 前缀）
      const modelSlug = m.external_id.split("/").slice(1).join("/");
      const row = await upsertModel({
        provider_id: providerId,
        slug: modelSlug,
        name: m.name,
        family: m.family,
        modality: m.modality,
        context_length: m.context_length,
        max_output_tokens: m.max_output_tokens,
        capabilities: m.capabilities,
        release_date: m.release_date,
        status: m.status,
      });
      slugToModelId.set(m.external_id, row.id);
      totalInserted++;
    }
    // 3) 写入价格
    for (const p of group.pricing) {
      const modelId =
        slugToModelId.get(p.model_external_id) ?? (await findModelByExternalId(p.model_external_id))?.id;
      if (!modelId) continue;
      const r = await upsertPricing({ model_id: modelId, pricing: p });
      if (r.status === "review-queue") totalReview++;
      else totalPricingRows++;
    }
  }

  console.log(
    `[${sourceLabel}] providers=${byProvider.size} models=${totalInserted} pricing=${totalPricingRows} review=${totalReview}`,
  );
}

/** 写入优惠数据 */
async function ingestPromotions(promos: NormalizedPromotion[], sourceId: string) {
  let inserted = 0;
  for (const p of promos) {
    try {
      const providerId = await ensureProvider(p.provider_slug);
      await db
        .insert(promotionTable)
        .values({
          provider_id: providerId,
          title: p.title,
          description: p.description,
          promotion_type: p.promotion_type,
          gift_amount: p.gift_amount?.toString() ?? null,
          gift_unit: p.gift_unit,
          discount_rate: p.discount_rate?.toString() ?? null,
          starts_at: p.starts_at ? new Date(p.starts_at) : null,
          ends_at: p.ends_at ? new Date(p.ends_at) : null,
          source_url: p.source_url,
          confidence_score: (p.confidence_score ?? 0.7).toString(),
          need_manual_review: true,
          is_active: true,
        })
        .onConflictDoNothing();
      inserted++;
    } catch {
      // 跳过重复或格式异常的
    }
  }
  if (inserted > 0) console.log(`[${sourceId}] promotions ingested=${inserted}`);
}

export async function runLiteLLM() {
  const r = await fetchLiteLLM();
  await ingestModelsAndPricing(r.models, r.pricing, "litellm");
}

export async function runOpenRouter() {
  const r = await fetchOpenRouter();
  await ingestModelsAndPricing(r.models, r.pricing, "openrouter");
}

export async function runLlmPrices() {
  const r = await fetchLlmPricesCurrent();
  await ingestModelsAndPricing(r.models, r.pricing, "llm-prices");
}

export async function runGenaiPrices() {
  const r = await fetchGenaiPrices();
  await ingestModelsAndPricing(r.models, r.pricing, "genai-prices");
}

export async function runAllCn() {
  for (const p of CN_PROVIDERS) {
    try {
      const r = await fetchCnProvider(p.id);
      // 写入模型和价格
      await ingestModelsAndPricing(r.models, r.pricing, p.id);
      // 写入优惠（由 cn-provider 解析）
      if (r.promotions && r.promotions.length > 0) {
        try {
          await ingestPromotions(r.promotions, p.id);
        } catch (err) {
          console.error(`[${p.id}] promotions ingest failed:`, err);
        }
      }
    } catch (err) {
      console.error(`[${p.id}] failed:`, err);
    }
  }
}

export async function runAll() {
  await runLiteLLM();
  await runOpenRouter();
  await runLlmPrices();
  await runGenaiPrices();
  await runAllCn();
}
