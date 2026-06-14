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

type KnownCnyRow = Omit<CnyRow, "sourceId" | "sourceUrl"> & {
  seenNeedles?: string[];
};

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

function dedupeRows(rows: CnyRow[]): CnyRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = [
      row.providerSlug,
      row.modelSlug,
      row.channel,
      row.sellingPlatformProvider,
      row.sourceId,
      row.inputCny,
      row.outputCny,
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rowsFromKnownPrices(text: string, sourceId: string, sourceUrl: string, defs: KnownCnyRow[]): CnyRow[] {
  return defs
    .filter((def) => (def.seenNeedles ?? [def.sourceModelId ?? def.modelSlug]).every((needle) => text.includes(needle)))
    .map(({ seenNeedles: _seenNeedles, ...row }) => ({ ...row, sourceId, sourceUrl }));
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
    "deepseek-ai/DeepSeek-V3.1-Terminus",
    "Pro/deepseek-ai/DeepSeek-V3.1-Terminus",
    "Pro/moonshotai/Kimi-K2.6",
    "Pro/zai-org/GLM-5.1",
    "zai-org/GLM-4.5V",
    "zai-org/GLM-4.5-Air",
    "THUDM/GLM-4-32B-0414",
    "MiniMaxAI/MiniMax-M2.5",
    "Pro/MiniMaxAI/MiniMax-M2.5",
    "Qwen/Qwen3.6-35B-A3B",
    "Qwen/Qwen3.6-27B",
    "Qwen/Qwen3.5-397B-A17B",
    "Qwen/Qwen3.5-122B-A10B",
    "Qwen/Qwen3.5-35B-A3B",
    "Qwen/Qwen3.5-27B",
  ];
  const rows: CnyRow[] = [];
  for (const modelId of wanted) {
    const pair = cnyPairAfter(text, modelId);
    if (!pair) continue;
    const modelSlug = `siliconflow/${modelId}`;
    const owner = modelId.includes("Qwen/")
      ? "alibaba-cloud"
      : /moonshotai|Kimi/i.test(modelId)
        ? "moonshot"
        : /zai-org|THUDM|GLM/i.test(modelId)
          ? "zhipu"
          : /MiniMax/i.test(modelId)
            ? "minimax"
            : "deepseek";
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
  return buildResult("cn-cny-siliconflow", url, text, dedupeRows(rows));
}

function knownAliyunRows(text: string, sourceUrl: string): CnyRow[] {
  const makeRows = (
    items: Array<[string, number, number]>,
    owner: string,
  ) =>
    items.map(([name, input, output]) => ({
      providerSlug: "aliyun-bailian",
      modelSlug: `aliyun-bailian/${name}`,
      sourceModelId: name,
      modelName: name,
      inputCny: input,
      outputCny: output,
      channel: "cloud_platform" as const,
      platform: "aliyun-bailian",
      modelOwnerProvider: owner,
      sellingPlatformProvider: "aliyun-bailian",
      confidence: 0.88,
      seenNeedles: [name],
    }));

  return rowsFromKnownPrices(text, "cn-cny-aliyun-bailian", sourceUrl, [
    ...makeRows(
      [
        ["qwen3.7-max", 12, 36],
        ["qwen3.7-max-2026-06-08", 12, 36],
        ["qwen3.7-max-2026-05-20", 12, 36],
        ["qwen3.7-max-preview", 12, 36],
        ["qwen3.6-max-preview", 9, 54],
        ["qwen3-max", 2.5, 10],
        ["qwen3-max-preview", 6, 24],
        ["qwen3-coder-480b-a35b-instruct", 6, 24],
        ["qwen-plus", 0.8, 2],
        ["qwen-flash", 0.15, 1.5],
      ],
      "alibaba-cloud",
    ),
    ...makeRows(
      [
        ["deepseek-v4-pro", 12, 24],
        ["deepseek-v4-flash", 1, 2],
        ["deepseek-v3.2", 2, 3],
        ["deepseek-v3.2-exp", 2, 3],
        ["deepseek-v3.1", 4, 12],
        ["deepseek-r1", 4, 16],
        ["deepseek-r1-0528", 4, 16],
        ["deepseek-v3", 2, 8],
        ["deepseek-r1-distill-qwen-7b", 0.5, 1],
        ["deepseek-r1-distill-qwen-14b", 1, 3],
      ],
      "deepseek",
    ),
    ...makeRows(
      [
        ["glm-5.1", 6, 24],
        ["glm-5", 4, 18],
        ["glm-4.7", 3, 14],
        ["glm-4.6", 3, 14],
        ["glm-4.5", 3, 14],
        ["glm-4.5-air", 0.8, 6],
      ],
      "zhipu",
    ),
    ...makeRows(
      [
        ["kimi-k2.6", 6.5, 27],
        ["kimi-k2.5", 4, 21],
      ],
      "moonshot",
    ),
    ...makeRows(
      [
        ["MiniMax-M3", 4.2, 16.8],
        ["MiniMax-M2.7", 2.1, 8.4],
        ["MiniMax-M2.5", 2.1, 8.4],
        ["MiniMax-M2.1", 2.1, 8.4],
      ],
      "minimax",
    ),
  ]);
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
  return dedupeRows([...rows, ...knownAliyunRows(text, sourceUrl)]);
}

export async function fetchAliyunBailianCnyPricing(): Promise<CnyPricingResult> {
  const url = "https://help.aliyun.com/zh/model-studio/model-pricing";
  const raw = await fetchText(url, "cn-cny-aliyun-bailian");
  const rows = parseAliyunRows(raw.body, url);
  return buildResult("cn-cny-aliyun-bailian", url, raw.body, rows);
}

export async function fetchMiniMaxCnyPricing(): Promise<CnyPricingResult> {
  const url = "https://platform.minimaxi.com/docs/guides/pricing-paygo";
  const raw = await fetchText(url, "cn-cny-minimax");
  const text = simplifyHtml(raw.body);
  const rows = rowsFromKnownPrices(text, "cn-cny-minimax", url, [
    ["minimax-m3-512k", "MiniMax-M3", 2.1, 8.4, 0.42],
    ["minimax-m3-over-512k", "MiniMax-M3", 4.2, 16.8, 0.84],
    ["minimax-m3-priority-512k", "MiniMax-M3", 3.15, 12.6, 0.63],
    ["minimax-m3-priority-over-512k", "MiniMax-M3", 6.3, 25.2, 1.26],
    ["minimax-m2.7", "MiniMax-M2.7", 2.1, 8.4, 0.42],
    ["minimax-m2.7-highspeed", "MiniMax-M2.7-highspeed", 4.2, 16.8, 0.42],
    ["minimax-m2.5", "MiniMax-M2.5", 2.1, 8.4, 0.21],
    ["minimax-m2.5-highspeed", "MiniMax-M2.5-highspeed", 4.2, 16.8, 0.21],
    ["minimax-m2.1", "MiniMax-M2.1", 2.1, 8.4, 0.21],
    ["minimax-m2.1-highspeed", "MiniMax-M2.1-highspeed", 4.2, 16.8, 0.21],
    ["minimax-m2", "MiniMax-M2", 2.1, 8.4, 0.21],
  ].map(([slug, name, input, output, cache]) => ({
    providerSlug: "minimax",
    modelSlug: String(slug),
    sourceModelId: String(name),
    modelName: String(name),
    inputCny: Number(input),
    outputCny: Number(output),
    cacheReadCny: Number(cache),
    channel: "official_api" as const,
    platform: "minimax",
    modelOwnerProvider: "minimax",
    sellingPlatformProvider: "minimax",
    confidence: 0.9,
    seenNeedles: [String(name), String(input), String(output)],
  })));
  return buildResult("cn-cny-minimax", url, raw.body, dedupeRows(rows));
}

export async function fetchZhipuCnyPricing(): Promise<CnyPricingResult> {
  const url = "https://open.bigmodel.cn/pricing";
  const raw = await fetchText(url, "cn-cny-zhipu");
  const appScript = raw.body.match(/src="([^"]*\/js\/app\.[^"]+\.js)"/)?.[1];
  let js = "";
  if (appScript) {
    const jsUrl = appScript.startsWith("http") ? appScript : `https://open.bigmodel.cn${appScript}`;
    const scriptRaw = await fetchText(jsUrl, "cn-cny-zhipu-app-js");
    js = scriptRaw.body;
  }
  const rows = rowsFromKnownPrices(js || raw.body, "cn-cny-zhipu", url, [
    ["glm-5.1-32k", "GLM-5.1", 6, 24, 1.3],
    ["glm-5.1-long", "GLM-5.1", 8, 28, 2],
    ["glm-5-turbo-32k", "GLM-5-Turbo", 5, 22, 1.2],
    ["glm-5-turbo-long", "GLM-5-Turbo", 7, 26, 1.8],
    ["glm-5-32k", "GLM-5", 4, 18, 1],
    ["glm-5-long", "GLM-5", 6, 22, 1.5],
    ["glm-4.7-32k", "GLM-4.7", 3, 14, 0.6],
    ["glm-4.5-air-32k", "GLM-4.5-Air", 0.8, 6, 0.16],
  ].map(([slug, name, input, output, cache]) => ({
    providerSlug: "zhipu",
    modelSlug: String(slug),
    sourceModelId: String(name),
    modelName: String(name),
    inputCny: Number(input),
    outputCny: Number(output),
    cacheReadCny: Number(cache),
    channel: "official_api" as const,
    platform: "zhipu",
    modelOwnerProvider: "zhipu",
    sellingPlatformProvider: "zhipu",
    confidence: 0.86,
    seenNeedles: [String(name), String(input), String(output)],
  })));
  return buildResult("cn-cny-zhipu", url, [raw.body, js].join("\n--- zhipu-app-js ---\n"), dedupeRows(rows));
}

export async function fetchVolcengineDoubaoCnyPricing(): Promise<CnyPricingResult> {
  const url = "https://www.volcengine.com/docs/82379/1544106";
  const raw = await fetchText(url, "cn-cny-volcengine-doubao");
  const note = [
    "VOLCENGINE_CNY_PRICING_AUDIT",
    "Official Ark pricing document fetched successfully.",
    "Doubao pricing cells are present, but column order requires manual confirmation before formal insert.",
    raw.body,
  ].join("\n");
  return buildResult("cn-cny-volcengine-doubao", url, note, []);
}

export async function fetchModelScopeCnyPricing(): Promise<CnyPricingResult> {
  const url = "https://modelscope.cn/docs/model-service/API-Inference/intro";
  const raw = await fetchText(url, "cn-cny-modelscope");
  const note = [
    "MODEL_SCOPE_CNY_PRICING_AUDIT",
    "Official API-Inference document fetched successfully.",
    "No stable per-token CNY API price table was found; free quotas are not stored as API unit pricing.",
    raw.body,
  ].join("\n");
  return buildResult("cn-cny-modelscope", url, note, []);
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
    fetchMiniMaxCnyPricing(),
    fetchZhipuCnyPricing(),
    fetchVolcengineDoubaoCnyPricing(),
    fetchModelScopeCnyPricing(),
    fetchTencentHunyuanCnyPricing(),
    fetchBaiduQianfanCnyPricing(),
  ]);
}
