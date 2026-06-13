/**
 * 单个国内厂商的抓取流程
 * 1) 根据 cn-registry 拿到目标 URL
 * 2) Playwright 抓取
 * 3) simplifyHtml + extractTables
 * 4) LLM 抽取（如果配置）或启发式解析
 * 5) 标准化为 NormalizedModel / NormalizedPricing / NormalizedPromotion
 *
 * 由于厂商页结构差异大，本文件给出"通用兜底"的实现：
 * - 表格解析：尝试从含 "价格 / pricing / input / output" 等关键词的表格抽取
 * - 启发式：从中提取数字和单位，标记 need_manual_review
 */
import { fetchHtml } from "../fetchers/html.js";
import { extractTables, simplifyHtml } from "../parsers/html-table.js";
import { config } from "../config.js";
import type { CnProvider, CnProviderTarget } from "./cn-registry.js";
import { getProviderById } from "./cn-registry.js";
import type { NormalizedModel, NormalizedPricing, NormalizedPromotion } from "../types.js";

const PRICE_KEYWORDS = ["价格", "单价", "input", "output", "输入", "输出", "tokens", "元", "¥", "$"];

function detectCurrency(text: string): "CNY" | "USD" {
  if (/¥|￥|元|人民币/.test(text)) return "CNY";
  return "USD";
}

function parseNumber(s: string): number | null {
  const cleaned = s.replace(/[,， ]/g, "").replace(/[¥￥$]/g, "");
  const m = cleaned.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  return Number(m[0]);
}

/**
 * 启发式：从表格行推断价格
 * 期望：每行至少含「模型名」「输入价」「输出价」三段
 */
function heuristicParseTables(
  providerSlug: string,
  sourceId: string,
  sourceUrl: string,
  tables: ReturnType<typeof extractTables>,
  currency: "CNY" | "USD",
): { models: NormalizedModel[]; pricing: NormalizedPricing[] } {
  const models: NormalizedModel[] = [];
  const pricing: NormalizedPricing[] = [];
  for (const t of tables) {
    const headerText = t.headers.join(" ").toLowerCase();
    if (!PRICE_KEYWORDS.some((k) => headerText.includes(k.toLowerCase()))) continue;

    const idxName = t.headers.findIndex((h) => /model|模型|name/.test(h));
    const idxIn = t.headers.findIndex((h) => /input|输入|入/.test(h));
    const idxOut = t.headers.findIndex((h) => /output|输出|出/.test(h));
    const idxCtx = t.headers.findIndex((h) => /context|上下文|window/.test(h));
    if (idxName < 0) continue;

    for (const row of t.rows) {
      const name = row[idxName];
      if (!name) continue;
      const inVal = idxIn >= 0 ? parseNumber(row[idxIn] ?? "") : null;
      const outVal = idxOut >= 0 ? parseNumber(row[idxOut] ?? "") : null;
      const ctx = idxCtx >= 0 ? parseNumber(row[idxCtx] ?? "") : null;
      if (inVal == null && outVal == null) continue;

      const externalId = `${providerSlug}/${name.toLowerCase().replace(/\s+/g, "-")}`;
      const fx = currency === "CNY" ? 1 / config.fx.usdCny : 1;
      models.push({
        external_id: externalId,
        provider_slug: providerSlug,
        name,
        family: name.split(/[-_]/)[0],
        modality: ["text"],
        context_length: ctx ?? undefined,
        capabilities: ["text"],
        status: "active",
        source_id: sourceId,
        source_url: sourceUrl,
        confidence_score: 0.5,
        need_manual_review: true,
      });
      pricing.push({
        model_external_id: externalId,
        input_per_1m_usd: (inVal ?? 0) * fx,
        output_per_1m_usd: (outVal ?? 0) * fx,
        currency_native: currency,
        source_id: sourceId,
        source_url: sourceUrl,
        confidence_score: 0.5,
        need_manual_review: true,
      });
    }
  }
  return { models, pricing };
}

/**
 * 抓取一个厂商全部 targets
 */
export async function fetchCnProvider(providerId: string): Promise<{
  provider: CnProvider;
  models: NormalizedModel[];
  pricing: NormalizedPricing[];
  promotions: NormalizedPromotion[];
  raw: Array<{ target: CnProviderTarget; tables: number; bytes: number }>;
}> {
  const provider = getProviderById(providerId);
  if (!provider) throw new Error(`Unknown CN provider: ${providerId}`);

  const models: NormalizedModel[] = [];
  const pricing: NormalizedPricing[] = [];
  const promotions: NormalizedPromotion[] = [];
  const rawSummaries: Array<{ target: CnProviderTarget; tables: number; bytes: number }> = [];

  for (const target of provider.targets) {
    try {
      if (target.fetcher === "playwright") {
        const payload = await fetchHtml(target.url, provider.id, { timeoutMs: 30_000 });
        const tables = extractTables(payload.body);
        rawSummaries.push({ target, tables: tables.length, bytes: payload.body.length });

        if (target.kind === "pricing_list" || target.kind === "model_list") {
          const text = simplifyHtml(payload.body);
          const currency = detectCurrency(text);
          const r = heuristicParseTables(
            provider.providerSlug,
            provider.id,
            target.url,
            tables,
            currency,
          );
          models.push(...r.models);
          pricing.push(...r.pricing);
        } else if (target.kind === "promotion") {
          // 暂不启发式抽优惠；统一走人工复核
          promotions.push({
            provider_slug: provider.providerSlug,
            model_external_ids: [],
            title: `${provider.displayName} - 抓取到的优惠页（待人工解析）`,
            description: simplifyHtml(payload.body).slice(0, 600),
            promotion_type: "limited-time",
            source_url: target.url,
            confidence_score: 0.4,
            need_manual_review: true,
          });
        }
      }
    } catch (err) {
      // 单个 target 失败不中断整体抓取
      rawSummaries.push({
        target,
        tables: 0,
        bytes: 0,
      });
    }
  }

  return { provider, models, pricing, promotions, raw: rawSummaries };
}
