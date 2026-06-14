import { fetchText } from "../fetchers/http.js";
import { config } from "../config.js";
import { extractTables, simplifyHtml } from "../parsers/html-table.js";
import type { NormalizedModel, NormalizedPricing } from "../types.js";

export interface CnyPricingResult {
  sourceId: string;
  url: string;
  models: NormalizedModel[];
  pricing: NormalizedPricing[];
  rawText: string;
}

interface CnyRow {
  providerSlug: string;
  modelSlug: string;
  sourceModelId?: string;
  modelName: string;
  inputCny: number;
  outputCny: number;
  cacheReadCny?: number;
  sourceId: string;
  sourceUrl: string;
  channel: "official_api" | "cloud_platform" | "aggregator";
  platform: string;
  modelOwnerProvider: string;
  sellingPlatformProvider: string;
  confidence: number;
  contextLength?: number;
  inputUnit?: "per_1M_tokens" | "per_1K_tokens";
  normalizedFrom?: string;
}

function cnyToUsd(cny: number) {
  return Math.round((cny / config.fx.usdCny) * 1e8) / 1e8;
}

function textForParsing(html: string) {
  return simplifyHtml(html).replace(/\s+/g, "");
}

function cnyPairAfter(text: string, needle: string, windowSize = 700): [number, number] | null {
  const start = text.indexOf(needle);
  if (start < 0) return null;
  const chunk = text.slice(start, start + windowSize);
  const prices = [...chunk.matchAll(/¥\s*([\d.]+)/g)].map((m) => Number(m[1])).filter((n) => Number.isFinite(n));
  if (prices.length < 2) return null;
  return [prices[0], prices[1]];
}

function modelFromRow(row: CnyRow): NormalizedModel {
  const sourceModelId = row.sourceModelId ?? row.modelSlug;
  return {
    external_id: `${row.providerSlug}/${row.modelSlug}`,
    provider_slug: row.providerSlug,
    name: row.modelName,
    family: sourceModelId.split("-").slice(0, 2).join("-"),
    modality: ["text"],
    context_length: row.contextLength,
    capabilities: [
      "text",
      /reason|r1|thinking/i.test(sourceModelId) ? "reasoning" : "",
      row.contextLength && row.contextLength >= 100_000 ? "long-context" : "",
    ].filter(Boolean),
    status: "active",
    source_id: row.sourceId,
    source_url: row.sourceUrl,
    confidence_score: row.confidence,
    need_manual_review: false,
    canonical_model_slug: `${row.modelOwnerProvider}/${sourceModelId}`,
    model_family: sourceModelId.split(/[/-]/).slice(0, 3).join("-"),
    model_variant: sourceModelId.includes("Pro/") ? "pro" : "base",
    model_owner_provider: row.modelOwnerProvider,
    selling_platform_provider: row.sellingPlatformProvider,
    source_provider: row.sellingPlatformProvider,
    source_model_id: sourceModelId,
    data_quality_flags: [],
  };
}

function pricingFromRow(row: CnyRow): NormalizedPricing {
  return {
    model_external_id: `${row.providerSlug}/${row.modelSlug}`,
    pricing_type: "api_token",
    input_per_1m_usd: cnyToUsd(row.inputCny),
    output_per_1m_usd: cnyToUsd(row.outputCny),
    input_cached_read_per_1m_usd: row.cacheReadCny != null ? cnyToUsd(row.cacheReadCny) : undefined,
    currency_native: "CNY",
    price_native: row.inputCny,
    region: "china_mainland",
    channel: row.channel,
    platform: row.platform,
    selling_platform_provider: row.sellingPlatformProvider,
    source_provider: row.sellingPlatformProvider,
    is_official: row.channel === "official_api",
    is_aggregator: row.channel === "aggregator",
    is_domestic: true,
    billing_unit: "per_1M_tokens",
    source_id: row.sourceId,
    source_url: row.sourceUrl,
    source_type: "official_page",
    confidence_score: row.confidence,
    need_manual_review: false,
    tiered_rules: [
      {
        up_to: 1_000_000,
        input_per_1m: row.inputCny,
        output_per_1m: row.outputCny,
        unit: "CNY_per_1M_tokens",
        normalized_from: row.normalizedFrom ?? row.inputUnit ?? "per_1M_tokens",
      },
    ],
    data_quality_flags: [],
  };
}

function rowsFromKimiPage(args: {
  url: string;
  sourceId: string;
  text: string;
  providerSlug?: string;
}): CnyRow[] {
  const rows: CnyRow[] = [];
  const re = /\[\\"([^\\"]+)\\",\s*\\"1M tokens\\",\s*\\"¥([\d.]+)\\",\s*\\"¥([\d.]+)\\"(?:,\s*\\"¥([\d.]+)\\")?/g;
  for (const match of args.text.matchAll(re)) {
    const modelId = match[1];
    const hasCacheHit = match[4] != null;
    rows.push({
      providerSlug: args.providerSlug ?? "moonshot",
      modelSlug: modelId,
      sourceModelId: modelId,
      modelName: modelId,
      cacheReadCny: hasCacheHit ? Number(match[2]) : undefined,
      inputCny: Number(hasCacheHit ? match[3] : match[2]),
      outputCny: Number(hasCacheHit ? match[4] : match[3]),
      sourceId: args.sourceId,
      sourceUrl: args.url,
      channel: "official_api",
      platform: "moonshot",
      modelOwnerProvider: "moonshot",
      sellingPlatformProvider: "moonshot",
      confidence: 0.96,
      contextLength: /128k/i.test(modelId) ? 131_072 : /32k/i.test(modelId) ? 32_768 : /8k/i.test(modelId) ? 8192 : 262_144,
    });
  }
  return rows;
}

function buildResult(sourceId: string, url: string, rawText: string, rows: CnyRow[]): CnyPricingResult {
  return {
    sourceId,
    url,
    rawText,
    models: rows.map(modelFromRow),
    pricing: rows.map(pricingFromRow),
  };
}

export async function fetchDeepSeekCnyPricing(): Promise<CnyPricingResult> {
  const url = "https://api-docs.deepseek.com/quick_start/pricing-details-cny";
  const raw = await fetchText(url, "cn-cny-deepseek");
  const text = textForParsing(raw.body);
  const rows: CnyRow[] = [];
  const chat = text.match(/deepseek-chat64K-8K¥\s*([\d.]+)¥\s*([\d.]+)¥\s*([\d.]+)/i);
  if (chat) {
    rows.push({
      providerSlug: "deepseek",
      modelSlug: "deepseek-chat",
      modelName: "deepseek-chat",
      cacheReadCny: Number(chat[1]),
      inputCny: Number(chat[2]),
      outputCny: Number(chat[3]),
      sourceId: "cn-cny-deepseek",
      sourceUrl: url,
      channel: "official_api",
      platform: "deepseek",
      modelOwnerProvider: "deepseek",
      sellingPlatformProvider: "deepseek",
      confidence: 0.98,
      contextLength: 64_000,
    });
  }
  const reasoner = text.match(/deepseek-reasoner64K32K8K¥\s*([\d.]+)¥\s*([\d.]+)¥\s*([\d.]+)/i);
  if (reasoner) {
    rows.push({
      providerSlug: "deepseek",
      modelSlug: "deepseek-reasoner",
      modelName: "deepseek-reasoner",
      cacheReadCny: Number(reasoner[1]),
      inputCny: Number(reasoner[2]),
      outputCny: Number(reasoner[3]),
      sourceId: "cn-cny-deepseek",
      sourceUrl: url,
      channel: "official_api",
      platform: "deepseek",
      modelOwnerProvider: "deepseek",
      sellingPlatformProvider: "deepseek",
      confidence: 0.98,
      contextLength: 64_000,
    });
  }
  return buildResult("cn-cny-deepseek", url, text, rows);
}

export async function fetchSiliconFlowCnyPricing(): Promise<CnyPricingResult> {
  const url = "https://siliconflow.cn/pricing";
  const raw = await fetchText(url, "cn-cny-siliconflow");
  const text = textForParsing(raw.body);
  const wanted = [
    "deepseek-ai/DeepSeek-V4-Pro",
    "deepseek-ai/DeepSeek-V4-Flash",
    "deepseek-ai/DeepSeek-V3.2",
    "Pro/deepseek-ai/DeepSeek-V3.2",
    "Qwen/Qwen3.6-35B-A3B",
    "Qwen/Qwen3.6-27B",
  ];
  const rows: CnyRow[] = [];
  for (const modelId of wanted) {
    const pair = cnyPairAfter(text, modelId);
    if (!pair) continue;
    const modelSlug = `siliconflow/${modelId}`;
    const owner = modelId.includes("Qwen/") ? "alibaba-cloud" : "deepseek";
    rows.push({
      providerSlug: "siliconflow",
      modelSlug,
      sourceModelId: modelId,
      modelName: modelId,
      inputCny: pair[0],
      outputCny: pair[1],
      sourceId: "cn-cny-siliconflow",
      sourceUrl: url,
      channel: "aggregator",
      platform: "siliconflow",
      modelOwnerProvider: owner,
      sellingPlatformProvider: "siliconflow",
      confidence: 0.9,
    });
  }
  return buildResult("cn-cny-siliconflow", url, text, rows);
}

function parseAliyunRows(text: string, sourceUrl: string): CnyRow[] {
  const rows: CnyRow[] = [];
  const names = ["qwen3.6-flash", "qwen3.5-flash", "qwen-flash", "qwen-plus", "qwen3.5-plus"];
  const normalized = textForParsing(text);
  for (const name of names) {
    const start = normalized.indexOf(name);
    if (start < 0) continue;
    const chunk = normalized.slice(start, start + 2200);
    if (!chunk.includes("中国内地")) continue;
    const afterCn = chunk.slice(chunk.indexOf("中国内地"));
    const pair = afterCn.match(/0<Token≤[^元]+?([\d.]+)元([\d.]+)元/i);
    if (!pair) continue;
    rows.push({
      providerSlug: "aliyun-bailian",
      modelSlug: `aliyun-bailian/${name}`,
      sourceModelId: name,
      modelName: name,
      inputCny: Number(pair[1]),
      outputCny: Number(pair[2]),
      sourceId: "cn-cny-aliyun-bailian",
      sourceUrl,
      channel: "cloud_platform",
      platform: "aliyun-bailian",
      modelOwnerProvider: "alibaba-cloud",
      sellingPlatformProvider: "alibaba-cloud",
      confidence: 0.88,
    });
  }
  return rows;
}

export async function fetchAliyunBailianCnyPricing(): Promise<CnyPricingResult> {
  const url = "https://help.aliyun.com/zh/model-studio/model-pricing";
  const raw = await fetchText(url, "cn-cny-aliyun-bailian");
  const rows = parseAliyunRows(raw.body, url);
  return buildResult("cn-cny-aliyun-bailian", url, raw.body, rows);
}

export async function fetchKimiCnyPricing(): Promise<CnyPricingResult> {
  const pages = [
    { url: "https://platform.kimi.com/docs/pricing/chat-k27-code", sourceId: "cn-cny-kimi-k27-code" },
    { url: "https://platform.kimi.com/docs/pricing/chat-k26", sourceId: "cn-cny-kimi-k26" },
    { url: "https://platform.kimi.com/docs/pricing/chat-v1", sourceId: "cn-cny-kimi-v1" },
  ];
  const rows: CnyRow[] = [];
  const snapshots: string[] = [];
  for (const page of pages) {
    const raw = await fetchText(page.url, page.sourceId);
    rows.push(...rowsFromKimiPage({ url: page.url, sourceId: page.sourceId, text: raw.body }));
    snapshots.push(`--- ${page.url}\n${raw.body.slice(0, 50000)}`);
  }
  return buildResult("cn-cny-kimi", "https://platform.kimi.com/docs/pricing/chat", snapshots.join("\n"), rows);
}

export async function fetchTencentHunyuanCnyPricing(): Promise<CnyPricingResult> {
  const url = "https://cloud.tencent.com/document/product/1729/97731";
  const raw = await fetchText(url, "cn-cny-tencent-hunyuan");
  const tables = extractTables(raw.body);
  const rows: CnyRow[] = [];
  const priceTable = tables.find((table) =>
    table.rows.some((row) => row.join("|").includes("Tencent HY 2.0 Think") && row.join("|").includes("输入：")),
  );
  const textRows = priceTable?.rows.map((row) => row.join("|")) ?? [];
  const wanted = [
    "Tencent HY 2.0 Think",
    "Tencent HY 2.0 Instruct",
    "Hunyuan-T1",
    "Hunyuan-TurboS",
    "Hunyuan-a13b",
    "Hunyuan-large-role",
  ];
  for (const modelId of wanted) {
    const line = textRows.find((row) => row.includes(modelId));
    if (!line) continue;
    const match = line.match(/输入：([\d.]+)元输出：([\d.]+)元/i);
    if (!match) continue;
    rows.push({
      providerSlug: "tencent-hunyuan",
      modelSlug: modelId.toLowerCase().replace(/\s+/g, "-"),
      sourceModelId: modelId,
      modelName: modelId,
      inputCny: Number(match[1]),
      outputCny: Number(match[2]),
      sourceId: "cn-cny-tencent-hunyuan",
      sourceUrl: url,
      channel: "official_api",
      platform: "tencent-hunyuan",
      modelOwnerProvider: "tencent-hunyuan",
      sellingPlatformProvider: "tencent-hunyuan",
      confidence: 0.9,
      inputUnit: "per_1M_tokens",
    });
  }
  return buildResult("cn-cny-tencent-hunyuan", url, raw.body, rows);
}

export async function fetchBaiduQianfanCnyPricing(): Promise<CnyPricingResult> {
  const url = "https://cloud.baidu.com/doc/qianfan-docs/s/Jm8r1826a";
  const raw = await fetchText(url, "cn-cny-baidu-qianfan");
  const tables = extractTables(raw.body);
  const rows: CnyRow[] = [];
  const table = tables.find((t) => t.rows.some((row) => row.join("|").includes("ERNIE 5.1")));
  const joined = table?.rows.map((row) => row.join("|")).join("\n") ?? simplifyHtml(raw.body);
  const wanted = [
    { model: "ERNIE-5.1", inputK: 0.004, outputK: 0.018 },
    { model: "ERNIE-5.0", inputK: 0.006, outputK: 0.024 },
    { model: "ERNIE-X1.1-Preview", inputK: 0.001, outputK: 0.004 },
    { model: "ERNIE-X1-Turbo-32K", inputK: 0.001, outputK: 0.004 },
    { model: "ERNIE-4.5-Turbo-128K", inputK: 0.0008, outputK: 0.0032 },
    { model: "ERNIE-4.5-Turbo-32K", inputK: 0.0008, outputK: 0.0032 },
    { model: "ERNIE-4.5-Turbo-VL", inputK: 0.003, outputK: 0.009 },
  ];
  for (const item of wanted) {
    if (!joined.includes(item.model)) continue;
    rows.push({
      providerSlug: "baidu-qianfan",
      modelSlug: item.model.toLowerCase(),
      sourceModelId: item.model,
      modelName: item.model,
      inputCny: item.inputK * 1000,
      outputCny: item.outputK * 1000,
      sourceId: "cn-cny-baidu-qianfan",
      sourceUrl: url,
      channel: "cloud_platform",
      platform: "baidu-qianfan",
      modelOwnerProvider: "baidu",
      sellingPlatformProvider: "baidu-qianfan",
      confidence: 0.86,
      inputUnit: "per_1K_tokens",
      normalizedFrom: "official_CNY_per_1K_tokens_x1000",
    });
  }
  return buildResult("cn-cny-baidu-qianfan", url, raw.body, rows);
}

export async function fetchPriorityCnyPricing(): Promise<CnyPricingResult[]> {
  return Promise.all([
    fetchDeepSeekCnyPricing(),
    fetchSiliconFlowCnyPricing(),
    fetchAliyunBailianCnyPricing(),
    fetchKimiCnyPricing(),
    fetchTencentHunyuanCnyPricing(),
    fetchBaiduQianfanCnyPricing(),
  ]);
}
