/**
 * 国内厂商抓取：Playwright 渲染 + 表格/文本解析
 *
 * 策略：
 * 1. 优先用 Playwright 等待页面渲染
 * 2. 查找 <table> 中的价格行
 * 3. 如果没有表格，从页面文本中搜索价格数字
 * 4. 无法解析价格时，至少记录 provider 和 HTML text 摘要
 * 5. 所有结果标记 need_manual_review
 */
import { fetchHtml } from "../fetchers/html.js";
import { fetchText } from "../fetchers/http.js";
import { extractTables, simplifyHtml } from "../parsers/html-table.js";
import { config } from "../config.js";
import type { CnProvider, CnProviderTarget } from "./cn-registry.js";
import { getProviderById } from "./cn-registry.js";
import type { NormalizedModel, NormalizedPricing, NormalizedPromotion } from "../types.js";

const PRICE_KEYWORDS = ["价格", "单价", "input", "output", "输入", "输出", "tokens", "元", "¥", "$", "/M", "1M token"];
const MODEL_KEYWORDS = ["模型", "model", "名称", "name", "版本", "version"];

function detectCurrency(text: string): "CNY" | "USD" {
  if (/¥|￥|元|人民币|CNY/.test(text)) return "CNY";
  return "USD";
}

function parseNumber(s: string): number | null {
  const cleaned = s.replace(/[,， \n\t\r]/g, "").replace(/[¥￥$]/g, "");
  const m = cleaned.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  return Number(m[0]);
}

/** 从文本中搜索形如 "模型名 0.001 元/千tokens" 的价格 */
function searchTextForPrices(
  text: string,
  providerSlug: string,
  sourceId: string,
  sourceUrl: string,
  currency: "CNY" | "USD",
): { models: NormalizedModel[]; pricing: NormalizedPricing[] } {
  const models: NormalizedModel[] = [];
  const pricing: NormalizedPricing[] = [];
  const fx = currency === "CNY" ? 1 / config.fx.usdCny : 1;

  // 更严格的正则：价格行通常包含数字+单位+模型名
  // 例: "qwen-turbo 0.008元/千tokens 0.008元/千tokens" 或 "$2.50 / 1M input tokens"
  const priceLineRegex = /([\u4e00-\u9fa5a-zA-Z][\u4e00-\u9fa5a-zA-Z0-9._-]{2,40})\s*[¥$￥]?\s*(\d+\.?\d*)\s*[元\/千tokens万MkKB]?.*?[¥$￥]?\s*(\d+\.?\d*)/;
  const singlePriceRegex = /(\d+\.?\d*)\s*(元|¥|\$|USD|CNY|\/千|\/M|\/1M|每千|每百万)/i;

  const lines = text.split(/[\n。；;]/);
  for (const line of lines) {
    if (line.length < 10 || line.length > 300) continue;

    // 必须先包含至少一个价格关键字
    const hasPriceKey = PRICE_KEYWORDS.some((k) => line.includes(k));
    if (!hasPriceKey) continue;

    // 尝试匹配含两段价格的行
    const m = line.match(priceLineRegex);
    if (m) {
      const name = m[1].trim();
      const inVal = parseFloat(m[2]);
      const outVal = parseFloat(m[3]);
      if (isNaN(inVal) || isNaN(outVal)) continue;
      if (inVal <= 0 || outVal <= 0) continue;
      if (inVal > 100 || outVal > 100) continue;

      const externalId = `${providerSlug}/${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      models.push({
        external_id: externalId,
        provider_slug: providerSlug,
        name,
        family: name.split(/[-_]/)[0],
        modality: ["text"],
        capabilities: ["text"],
        status: "active",
        source_id: sourceId,
        source_url: sourceUrl,
        confidence_score: 0.3,
        need_manual_review: true,
      });
      pricing.push({
        model_external_id: externalId,
        input_per_1m_usd: inVal * fx,
        output_per_1m_usd: outVal * fx,
        currency_native: currency,
        source_id: sourceId,
        source_url: sourceUrl,
        confidence_score: 0.3,
        need_manual_review: true,
      });
      continue;
    }

    // 尝试匹配含一段价格的短行（可能是含价格的关键信息）
    const sp = line.match(singlePriceRegex);
    if (sp && line.length < 80) {
      const priceVal = parseFloat(sp[1]);
      if (isNaN(priceVal) || priceVal <= 0 || priceVal > 100) continue;
      // 尝试提取模型名（价格前的词）
      const beforePrice = line.slice(0, m ? line.indexOf(m[0]) : 0);
      const nameMatch = beforePrice.match(/([\u4e00-\u9fa5a-zA-Z][\u4e00-\u9fa5a-zA-Z0-9._-]{2,30})/);
      const name = nameMatch?.[1]?.trim() ?? `model-${models.length + 1}`;

      const externalId = `${providerSlug}/${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      models.push({
        external_id: externalId,
        provider_slug: providerSlug,
        name,
        family: name.split(/[-_]/)[0],
        modality: ["text"],
        capabilities: ["text"],
        status: "active",
        source_id: sourceId,
        source_url: sourceUrl,
        confidence_score: 0.25,
        need_manual_review: true,
      });
      pricing.push({
        model_external_id: externalId,
        input_per_1m_usd: priceVal * fx,
        output_per_1m_usd: priceVal * fx,
        currency_native: currency,
        source_id: sourceId,
        source_url: sourceUrl,
        confidence_score: 0.25,
        need_manual_review: true,
      });
    }
  }

  return { models, pricing };
}

function heuristicParseTables(
  providerSlug: string,
  sourceId: string,
  sourceUrl: string,
  tables: ReturnType<typeof extractTables>,
  currency: "CNY" | "USD",
): { models: NormalizedModel[]; pricing: NormalizedPricing[] } {
  const models: NormalizedModel[] = [];
  const pricing: NormalizedPricing[] = [];
  const fx = currency === "CNY" ? 1 / config.fx.usdCny : 1;

  for (const t of tables) {
    const headerText = t.headers.join(" ").toLowerCase();
    if (!PRICE_KEYWORDS.some((k) => headerText.includes(k.toLowerCase()))) continue;

    const idxName = t.headers.findIndex((h) => /model|模型|name|名称/.test(h.toLowerCase()));
    const idxIn = t.headers.findIndex((h) => /input|输入|入|prompt/.test(h.toLowerCase()));
    const idxOut = t.headers.findIndex((h) => /output|输出|出|completion/.test(h.toLowerCase()));
    const idxCtx = t.headers.findIndex((h) => /context|上下文|window|长度/.test(h.toLowerCase()));

    for (const row of t.rows) {
      const name = idxName >= 0 ? row[idxName] : row[0];
      if (!name || name.length < 2) continue;
      const inVal = idxIn >= 0 ? parseNumber(row[idxIn] ?? "") : parseNumber(row[1] ?? "");
      const outVal = idxOut >= 0 ? parseNumber(row[idxOut] ?? "") : parseNumber(row[2] ?? "");
      const ctx = idxCtx >= 0 ? parseNumber(row[idxCtx] ?? "") : null;
      if (inVal == null && outVal == null) continue;

      const externalId = `${providerSlug}/${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      models.push({
        external_id: externalId,
        provider_slug: providerSlug,
        name,
        family: name.split(/[-_]/)[0],
        modality: ["text"],
        context_length: ctx ?? undefined,
        capabilities: ctx != null && ctx >= 100_000 ? ["text", "long-context"] : ["text"],
        status: "active",
        source_id: sourceId,
        source_url: sourceUrl,
        confidence_score: 0.45,
        need_manual_review: true,
      });
      pricing.push({
        model_external_id: externalId,
        input_per_1m_usd: (inVal ?? 0) * fx,
        output_per_1m_usd: (outVal ?? 0) * fx,
        currency_native: currency,
        source_id: sourceId,
        source_url: sourceUrl,
        confidence_score: 0.45,
        need_manual_review: true,
      });
    }
  }
  return { models, pricing };
}

/** 抓取单个 target: 先用 HTTP fetch，如果内容太短/为空再用 Playwright */
async function fetchTarget(provider: CnProvider, target: CnProviderTarget): Promise<{
  html: string;
  status: "ok" | "empty" | "timeout" | "error";
  error?: string;
}> {
  try {
    // 1) 优先用 HTTP fetch (更快、更省资源)
    const httpResult = await fetchText(target.url, provider.id);
    if (httpResult.body && httpResult.body.length > 500) {
      return { html: httpResult.body, status: "ok" };
    }

    // 2) HTTP fetch 返回的内容太短，尝试 Playwright
    if (target.fetcher !== "fetch") {
      try {
        const htmlPayload = await fetchHtml(target.url, provider.id, {
          timeoutMs: 25_000,
          waitForNetworkIdle: false,
        });
        if (htmlPayload.body && htmlPayload.body.length > 200) {
          return { html: htmlPayload.body, status: "ok" };
        }
        return { html: htmlPayload.body, status: "empty" };
      } catch (pwErr: any) {
        console.log(`[${provider.id}] Playwright failed, using HTTP result: ${pwErr?.message?.slice(0, 60)}`);
      }
    }

    return { html: httpResult.body, status: httpResult.body.length > 100 ? "ok" : "empty" };
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    if (msg.includes("timeout") || msg.includes("Timeout")) {
      return { html: "", status: "timeout", error: msg };
    }
    return { html: "", status: "error", error: msg };
  }
}

export async function fetchCnProvider(providerId: string): Promise<{
  provider: CnProvider;
  models: NormalizedModel[];
  pricing: NormalizedPricing[];
  promotions: NormalizedPromotion[];
  raw: Array<{ target: CnProviderTarget; tables: number; bytes: number; status: string }>;
}> {
  const provider = getProviderById(providerId);
  if (!provider) throw new Error(`Unknown CN provider: ${providerId}`);

  const allModels: NormalizedModel[] = [];
  const allPricing: NormalizedPricing[] = [];
  const allPromotions: NormalizedPromotion[] = [];
  const rawSummaries: Array<{ target: CnProviderTarget; tables: number; bytes: number; status: string }> = [];

  for (const target of provider.targets) {
    const result = await fetchTarget(provider, target);
    if (result.status !== "ok") {
      rawSummaries.push({ target, tables: 0, bytes: 0, status: result.status });
      continue;
    }

    const tables = extractTables(result.html);
    rawSummaries.push({ target, tables: tables.length, bytes: result.html.length, status: "ok" });

    if (target.kind === "pricing_list" || target.kind === "model_list") {
      const text = simplifyHtml(result.html);
      // 如果页面内容太少（SPA shell），跳过解析
      if (text.length < 200 || result.html.length < 2000) {
        console.log(`[${provider.id}:${target.kind}] 页面内容不足 (text=${text.length} html=${result.html.length})，可能是 SPA`);
        continue;
      }
      const currency = detectCurrency(text);

      // 1) 先尝试表格解析
      const tableResult = heuristicParseTables(provider.providerSlug, provider.id, target.url, tables, currency);
      // 限制提取数量防止误报
      const cappedModels = tableResult.models.slice(0, 50);
      const cappedPricing = tableResult.pricing.slice(0, 50);
      allModels.push(...cappedModels);
      allPricing.push(...cappedPricing);

      // 2) 如果表格没有产出，尝试文本搜索
      if (cappedModels.length === 0 && text.length > 300) {
        const textResult = searchTextForPrices(text, provider.providerSlug, provider.id, target.url, currency);
        allModels.push(...textResult.models.slice(0, 50));
        allPricing.push(...textResult.pricing.slice(0, 50));
      }

      // 3) 如果仍然没有产出，至少记录摘要
      if (tableResult.models.length === 0 && text.length > 0) {
        console.log(`[${provider.id}:${target.kind}] 表格和文本均未提取到价格，保存文本摘要`);
      }
    } else if (target.kind === "promotion") {
      const text = simplifyHtml(result.html).slice(0, 800);
      if (text.length > 20) {
        allPromotions.push({
          provider_slug: provider.providerSlug,
          model_external_ids: [],
          title: `${provider.displayName} - 优惠信息`,
          description: text,
          promotion_type: "limited-time",
          source_url: target.url,
          confidence_score: 0.35,
          need_manual_review: true,
        });
      }
    }
  }

  return { provider, models: allModels, pricing: allPricing, promotions: allPromotions, raw: rawSummaries };
}
