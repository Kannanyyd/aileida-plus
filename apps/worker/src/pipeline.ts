/**
 * 跑一个 source 抓取 → 标准化 → 入库
 * 记录 source_fetch_logs 和 source_snapshots
 */
import { fetchLiteLLM } from "./sources/litellm.js";
import { fetchOpenRouter } from "./sources/openrouter.js";
import { fetchLlmPricesCurrent } from "./sources/llm-prices.js";
import { fetchGenaiPrices } from "./sources/genai-prices.js";
import { fetchCnProvider } from "./sources/cn-provider.js";
import {
  fetchAliyunBailianCnyPricing,
  fetchBaiduQianfanCnyPricing,
  fetchDeepSeekCnyPricing,
  fetchKimiCnyPricing,
  fetchMiniMaxCnyPricing,
  fetchModelScopeCnyPricing,
  fetchSiliconFlowCnyPricing,
  fetchTencentHunyuanCnyPricing,
  fetchVolcengineDoubaoCnyPricing,
  fetchZhipuCnyPricing,
} from "./sources/cn-cny-pricing.js";
import { CN_PROVIDERS } from "./sources/cn-registry.js";
import { fetchOfficialModelSource } from "./sources/official-model-discovery.js";
import { OFFICIAL_MODEL_SOURCES } from "./sources/official-model-registry.js";
import { fetchVendorAnnouncements, type VendorAnnouncementCandidate } from "./sources/vendor-announcements.js";
import { config } from "./config.js";
import { upsertProvider } from "./storage/provider-store.js";
import { upsertModel, findModelByExternalId } from "./storage/model-store.js";
import { upsertPricing } from "./storage/pricing-store.js";
import { db } from "./storage/client.js";
import { newsItems, newsSources, providers, promotions as promotionTable } from "./storage/schema.js";
import { logFetchStart, logFetchSuccess, logFetchError, saveSnapshot } from "./storage/fetch-log.js";
import { ingestOfficialDiscovery, logDiscoveryRun } from "./storage/discovery-store.js";
import { eq, sql } from "drizzle-orm";
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
  minimax: { name_zh: "MiniMax", region: "cn", homepage: "https://platform.minimaxi.com" },
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

const PROVIDER_ALIAS_MAP: Record<string, string> = {
  "MiniMax": "minimax",
  "MINIMAX": "minimax",
  "OpenAI": "openai",
  "Anthropic": "anthropic",
  "Google": "google",
  "DeepSeek": "deepseek",
};

function normalizeProviderSlug(slug: string): string {
  const lower = slug.toLowerCase();
  return PROVIDER_ALIAS_MAP[slug] ?? PROVIDER_ALIAS_MAP[lower] ?? lower;
}

async function ensureProvider(slug: string): Promise<string> {
  const normalizedSlug = normalizeProviderSlug(slug);
  const meta = PROVIDER_META[normalizedSlug] ?? { name_zh: normalizedSlug, region: "global" as const };
  const found = await db.select().from(providers).where(eq(providers.slug, normalizedSlug)).limit(1);
  if (found.length > 0) return found[0].id;
  const p = await upsertProvider({
    slug: normalizedSlug,
    name_zh: meta.name_zh,
    name_en: normalizedSlug,
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
  const byProvider = new Map<string, { models: NormalizedModel[]; pricing: NormalizedPricing[] }>();
  for (const m of modelsList) {
    const pslug = normalizeProviderSlug(m.provider_slug);
    if (!byProvider.has(pslug)) byProvider.set(pslug, { models: [], pricing: [] });
    byProvider.get(pslug)!.models.push({ ...m, provider_slug: pslug });
  }
  for (const p of pricingList) {
    const rawProviderSlug = p.model_external_id.split("/")[0];
    const providerSlug = normalizeProviderSlug(rawProviderSlug);
    const normalizedExtId = p.model_external_id.replace(`${rawProviderSlug}/`, `${providerSlug}/`);
    if (!byProvider.has(providerSlug)) byProvider.set(providerSlug, { models: [], pricing: [] });
    byProvider.get(providerSlug)!.pricing.push({ ...p, model_external_id: normalizedExtId });
  }

  let totalModels = 0;
  let totalPricingRows = 0;
  let totalReview = 0;

  for (const [providerSlug, group] of byProvider.entries()) {
    try {
      const providerId = await ensureProvider(providerSlug);
      const slugToModelId = new Map<string, string>();
      for (const m of group.models) {
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
          canonical_model_slug: m.canonical_model_slug,
          model_family: m.model_family,
          model_variant: m.model_variant,
          model_owner_provider: m.model_owner_provider,
          selling_platform_provider: m.selling_platform_provider,
          source_provider: m.source_provider,
          source_model_id: m.source_model_id,
          data_quality_flags: m.data_quality_flags,
          needs_alias_review: m.needs_alias_review,
        });
        slugToModelId.set(m.external_id, row.id);
        totalModels++;
      }
      for (const p of group.pricing) {
        const modelId =
          slugToModelId.get(p.model_external_id) ?? (await findModelByExternalId(p.model_external_id))?.id;
        if (!modelId) continue;
        const r = await upsertPricing({ model_id: modelId, pricing: p });
        if (r.status === "review-queue") totalReview++;
        else totalPricingRows++;
      }
    } catch (err: any) {
      console.error(`[${sourceLabel}:${providerSlug}] 入库失败:`, err?.message);
    }
  }

  console.log(
    `[${sourceLabel}] providers=${byProvider.size} models=${totalModels} pricing=${totalPricingRows} review=${totalReview}`,
  );
  return { providers: byProvider.size, models: totalModels, pricing: totalPricingRows, review: totalReview };
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

async function ensureNewsSource(item: VendorAnnouncementCandidate, providerId: string) {
  const [row] = await db
    .insert(newsSources)
    .values({
      slug: item.source.slug,
      name_zh: item.source.name_zh,
      name_en: item.source.name_en,
      source_type: item.source.source_type,
      region: item.source.region,
      provider_id: providerId,
      urls: item.source.urls,
      fetch_schedule: "0 * * * *",
      parser_type: item.source.parser_type,
      is_active: true,
      priority: item.source.priority,
    })
    .onConflictDoUpdate({
      target: newsSources.slug,
      set: {
        name_zh: item.source.name_zh,
        name_en: item.source.name_en,
        source_type: item.source.source_type,
        region: item.source.region,
        provider_id: providerId,
        urls: item.source.urls,
        fetch_schedule: "0 * * * *",
        parser_type: item.source.parser_type,
        is_active: true,
        priority: item.source.priority,
        updated_at: sql`now()`,
      },
    })
    .returning({ id: newsSources.id });

  return row.id;
}

async function ingestVendorAnnouncements(items: VendorAnnouncementCandidate[]) {
  let inserted = 0;
  const publishedAt = new Date();

  for (const item of items) {
    try {
      if (!item.source.provider_slug) continue;
      const providerId = await ensureProvider(item.source.provider_slug);
      const sourceId = await ensureNewsSource(item, providerId);
      const result = await db
        .insert(newsItems)
        .values({
          source_id: sourceId,
          external_id: item.externalId,
          title: item.title,
          summary: item.summary,
          body_text: item.bodyText,
          url: item.url,
          published_at: publishedAt,
          fetched_at: publishedAt,
          category: item.category,
          tags: item.tags,
          related_provider_ids: [providerId],
          related_model_ids: [],
          impact_summary: item.affectsPricing ? "厂商官方公告包含价格、计费或优惠相关信息。" : null,
          affects_pricing: item.affectsPricing,
          affects_recommendation: item.category === "new-model" || item.affectsPricing,
          importance: item.importance,
          confidence_score: "0.90",
          need_manual_review: false,
          is_published: true,
        })
        .onConflictDoNothing()
        .returning({ id: newsItems.id });
      if (result.length > 0) inserted++;
    } catch (err: any) {
      console.error(`[news:${item.source.slug}] ingest failed:`, err?.message ?? err);
    }
  }

  console.log(`[vendor-announcements] candidates=${items.length} inserted=${inserted}`);
  return { candidates: items.length, inserted };
}

/** 包装：记录抓取日志 + 快照 */
async function runSource(
  sourceId: string,
  sourceType: string,
  url: string | undefined,
  fn: () => Promise<{ models: NormalizedModel[]; pricing: NormalizedPricing[]; rawText?: string }>,
) {
  const start = Date.now();
  const logId = await logFetchStart(sourceId, sourceType, url);
  try {
    const result = await fn();
    // 保存快照：优先用 rawText，否则用 models/pricing 序列化
    let snapshotContent = result.rawText;
    if (!snapshotContent && (result.models.length > 0 || result.pricing.length > 0)) {
      snapshotContent = JSON.stringify({
        source_id: sourceId,
        url,
        model_count: result.models.length,
        pricing_count: result.pricing.length,
        sample: result.models.slice(0, 3).map((m) => m.name),
      });
    }
    if (snapshotContent) {
      await saveSnapshot(
        sourceId,
        url ?? "unknown",
        snapshotContent.startsWith("{") ? "application/json" : "text/plain",
        snapshotContent,
      );
    }
    const stats = await ingestModelsAndPricing(result.models, result.pricing, sourceId);
    const duration = Date.now() - start;
    await logFetchSuccess(logId, stats.models + stats.pricing, stats.models + stats.pricing, duration);
    console.log(`[${sourceId}] ✅ 完成 (${duration}ms) models=${stats.models} pricing=${stats.pricing}`);
  } catch (err: any) {
    const duration = Date.now() - start;
    const msg = err?.message ?? String(err);
    console.error(`[${sourceId}] ❌ 失败 (${duration}ms): ${msg}`);
    await logFetchError(logId, msg, duration);
  }
}

export async function runLiteLLM() {
  const url = "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";
  await runSource("litellm", "github-json", url, async () => {
    const r = await fetchLiteLLM();
    return { models: r.models, pricing: r.pricing, rawText: JSON.stringify(r) };
  });
}

export async function runOpenRouter() {
  const url = "https://openrouter.ai/api/v1/models";
  await runSource("openrouter", "api", url, async () => {
    const r = await fetchOpenRouter();
    return { models: r.models, pricing: r.pricing, rawText: JSON.stringify(r) };
  });
}

export async function runLlmPrices() {
  const url = config.sources.llmPricesCurrent;
  await runSource("llm-prices", "api-json", url, async () => {
    const r = await fetchLlmPricesCurrent();
    return { models: r.models, pricing: r.pricing, rawText: JSON.stringify(r) };
  });
}

export async function runGenaiPrices() {
  const url = config.sources.genaiPrices;
  await runSource("genai-prices", "github-json", url, async () => {
    const r = await fetchGenaiPrices();
    return { models: r.models, pricing: r.pricing, rawText: JSON.stringify(r) };
  });
}

export async function runAllCn() {
  for (const p of CN_PROVIDERS) {
    try {
      await runSource(p.id, "domestic-scraper", p.targets[0]?.url ?? p.homepage, async () => {
        const r = await fetchCnProvider(p.id);
        if (r.promotions && r.promotions.length > 0) {
          await ingestPromotions(r.promotions, p.id).catch((err) =>
            console.error(`[${p.id}] promotions ingest failed:`, err),
          );
        }
        return {
          models: r.models,
          pricing: r.pricing,
          rawText: JSON.stringify({
            source: p.id,
            provider: p.displayName,
            targets: r.raw.map((s) => ({
              url: s.target.url,
              kind: s.target.kind,
              tables: s.tables,
              bytes: s.bytes,
              status: s.status,
            })),
            models_found: r.models.length,
            pricing_found: r.pricing.length,
          }),
        };
      });
    } catch (err: any) {
      console.error(`[${p.id}] 整体失败:`, err?.message);
    }
  }
}

export async function runPriorityCnyPricing() {
  const sources = [
    { id: "cn-cny-deepseek", url: "https://api-docs.deepseek.com/quick_start/pricing-details-cny", fn: fetchDeepSeekCnyPricing },
    { id: "cn-cny-siliconflow", url: "https://siliconflow.cn/pricing", fn: fetchSiliconFlowCnyPricing },
    { id: "cn-cny-aliyun-bailian", url: "https://help.aliyun.com/zh/model-studio/model-pricing", fn: fetchAliyunBailianCnyPricing },
    { id: "cn-cny-kimi", url: "https://platform.kimi.com/docs/pricing/chat", fn: fetchKimiCnyPricing },
    { id: "cn-cny-minimax", url: "https://platform.minimaxi.com/docs/guides/pricing-paygo", fn: fetchMiniMaxCnyPricing },
    { id: "cn-cny-zhipu", url: "https://open.bigmodel.cn/pricing", fn: fetchZhipuCnyPricing },
    { id: "cn-cny-volcengine-doubao", url: "https://www.volcengine.com/docs/82379/1544106", fn: fetchVolcengineDoubaoCnyPricing },
    { id: "cn-cny-modelscope", url: "https://modelscope.cn/docs/model-service/API-Inference/intro", fn: fetchModelScopeCnyPricing },
    { id: "cn-cny-tencent-hunyuan", url: "https://cloud.tencent.com/document/product/1729/97731", fn: fetchTencentHunyuanCnyPricing },
    { id: "cn-cny-baidu-qianfan", url: "https://cloud.baidu.com/doc/qianfan-docs/s/Jm8r1826a", fn: fetchBaiduQianfanCnyPricing },
  ];
  for (const source of sources) {
    await runSource(source.id, "official-cny-pricing", source.url, async () => {
      const result = await source.fn();
      return {
        models: result.models,
        pricing: result.pricing,
        rawText: result.rawText,
      };
    });
  }
}

export async function runOfficialModels(sourceId?: string) {
  const sources = sourceId
    ? OFFICIAL_MODEL_SOURCES.filter((s) => s.id === sourceId || s.providerSlug === sourceId)
    : OFFICIAL_MODEL_SOURCES;
  if (sourceId && sources.length === 0) throw new Error(`Unknown official model source: ${sourceId}`);

  let totalCandidates = 0;
  let totalInserted = 0;
  let totalMissingPricing = 0;

  for (const source of sources) {
    const start = Date.now();
    try {
      console.log(`[${source.id}] official model discovery start`);
      const result = await fetchOfficialModelSource(source);
      const stats = await ingestOfficialDiscovery(result);
      await saveSnapshot(source.id, source.urls[0] ?? "unknown", "text/plain", result.rawText.slice(0, 50000));
      await logDiscoveryRun({
        source_id: source.id,
        provider_slug: source.providerSlug,
        source_url: result.errors[0]?.source_url ?? source.urls[0] ?? "unknown",
        status: result.parserStatus === "success" ? "success" : result.parserStatus === "partial" ? "partial" : "failed",
        candidates_found: stats.candidates,
        models_inserted: stats.inserted,
        missing_pricing: stats.missingPricing,
        http_status: result.errors[0]?.http_status,
        parser_status: result.errors[0]?.parser_status ?? result.parserStatus,
        next_action: result.nextAction,
        error_message: result.errors.map((error) => `${error.source_url}: ${error.error_message}`).join("\n").slice(0, 2000) || undefined,
        duration_ms: Date.now() - start,
      });
      totalCandidates += stats.candidates;
      totalInserted += stats.inserted;
      totalMissingPricing += stats.missingPricing;
      console.log(`[${source.id}] candidates=${stats.candidates} inserted=${stats.inserted} missing_pricing=${stats.missingPricing}`);
    } catch (err: any) {
      await logDiscoveryRun({
        source_id: source.id,
        provider_slug: source.providerSlug,
        source_url: source.urls[0] ?? "unknown",
        status: "failed",
        candidates_found: 0,
        models_inserted: 0,
        missing_pricing: 0,
        parser_status: "parser_failed",
        next_action: "Fix source parser or URL before relying on this source.",
        error_message: err?.message ?? String(err),
        duration_ms: Date.now() - start,
      });
      console.error(`[${source.id}] official model discovery failed: ${err?.message ?? err}`);
    }
  }

  console.log(`[official-models] total candidates=${totalCandidates} inserted=${totalInserted} missing_pricing=${totalMissingPricing}`);
  return { candidates: totalCandidates, inserted: totalInserted, missingPricing: totalMissingPricing };
}

export async function auditLatestModels() {
  return runOfficialModels();
}

export async function runVendorAnnouncements() {
  const start = Date.now();
  const logId = await logFetchStart("vendor-announcements", "official-announcements", "registry");
  try {
    const result = await fetchVendorAnnouncements();
    await saveSnapshot("vendor-announcements", "registry", "application/json", result.rawText);
    const stats = await ingestVendorAnnouncements(result.items);
    const duration = Date.now() - start;
    await logFetchSuccess(logId, stats.inserted, stats.candidates, duration);
    console.log(`[vendor-announcements] done (${duration}ms)`);
  } catch (err: any) {
    const duration = Date.now() - start;
    await logFetchError(logId, err?.message ?? String(err), duration);
    throw err;
  }
}

export async function runAll() {
  console.log("[worker] 开始抓取国际数据源...");
  await runOfficialModels();
  await runLiteLLM();
  await runOpenRouter();
  await runLlmPrices();
  await runGenaiPrices();
  console.log("[worker] 开始抓取国内数据源...");
  await runAllCn();
  await runVendorAnnouncements();
  console.log("[worker] 全量抓取完成！");
}
