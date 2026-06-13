/**
 * pydantic/genai-prices prices/data.json
 *
 * data.json 是顶层数组，每个元素是一个 Provider:
 * [
 *   {
 *     "id": "anthropic",
 *     "name": "Anthropic",
 *     "pricing_urls": ["https://www.anthropic.com/pricing#api"],
 *     "models": [
 *       {
 *         "id": "claude-3-5-haiku-latest",
 *         "name": "Claude Haiku 3.5",
 *         "context_window": 200000,
 *         "prices": {
 *           "input_mtok": 0.8,
 *           "cache_write_mtok": 1,
 *           "cache_read_mtok": 0.08,
 *           "output_mtok": 4
 *         }
 *       }
 *     ]
 *   }
 * ]
 */
import { fetchJson } from "../fetchers/http.js";
import { config } from "../config.js";
import type { NormalizedModel, NormalizedPricing } from "../types.js";

interface GenaiPriceEntry {
  input_mtok?: number;
  output_mtok?: number;
  cache_read_mtok?: number;
  cache_write_mtok?: number;
  input_per_image?: number;
  output_per_image?: number;
}

interface GenaiModel {
  id: string;
  name?: string;
  description?: string;
  context_window?: number;
  max_output_tokens?: number;
  prices?: GenaiPriceEntry;
  deprecated?: boolean;
}

interface GenaiProvider {
  id: string;
  name?: string;
  pricing_urls?: string[];
  models?: GenaiModel[];
}

export async function fetchGenaiPrices() {
  let raw;
  let url = config.sources.genaiPrices;

  // 优先抓 data_slim.json (更小更快)，失败则尝试 data.json
  try {
    raw = await fetchJson(url, "genai-prices");
    if (!raw.body || raw.body.trim().length < 10) {
      throw new Error("empty response");
    }
  } catch (err: any) {
    const fallback = config.sources.genaiPricesSlim;
    if (fallback && fallback !== url) {
      console.log(`[genai-prices] 主 URL 失败 (${err?.message?.slice(0, 60)}), 尝试 slim`);
      url = fallback;
      raw = await fetchJson(url, "genai-prices");
    } else if (url !== config.sources.genaiPricesSlim) {
      console.log(`[genai-prices] 主 URL 失败, 尝试备用`);
      url = config.sources.genaiPricesSlim ?? url;
      raw = await fetchJson(url, "genai-prices");
    } else {
      throw err;
    }
  }

  const providers = JSON.parse(raw.body) as GenaiProvider[];
  const models: NormalizedModel[] = [];
  const pricing: NormalizedPricing[] = [];

  for (const prov of providers) {
    if (!prov.models || prov.models.length === 0) continue;
    const slug = prov.id.toLowerCase().replace(/[^a-z0-9-]/g, "-");

    for (const m of prov.models) {
      if (m.deprecated) continue;
      if (!m.prices) continue;
      const p = m.prices;
      // 检查价格字段是否为有效数字
      const inPrice = typeof p.input_mtok === "number" ? p.input_mtok : undefined;
      const outPrice = typeof p.output_mtok === "number" ? p.output_mtok : undefined;
      if (inPrice == null && outPrice == null) continue;

      const externalId = `${slug}/${m.id}`;
      const caps = ["text"];
      if (p.cache_read_mtok != null || p.cache_write_mtok != null) caps.push("cache");
      if ((m.context_window ?? 0) >= 100_000) caps.push("long-context");

      models.push({
        external_id: externalId,
        provider_slug: slug,
        name: m.name ?? m.id,
        family: m.id.split(/[-_]/)[0],
        modality: ["text"],
        context_length: typeof m.context_window === "number" ? m.context_window : undefined,
        max_output_tokens: typeof m.max_output_tokens === "number" ? m.max_output_tokens : undefined,
        capabilities: caps,
        status: "active",
        source_id: "genai-prices",
        source_url: prov.pricing_urls?.[0] ?? url,
        confidence_score: 0.9,
        need_manual_review: false,
      });

      pricing.push({
        model_external_id: externalId,
        pricing_type: "api_token",
        input_per_1m_usd: inPrice,
        output_per_1m_usd: outPrice,
        input_cached_read_per_1m_usd: typeof p.cache_read_mtok === "number" ? p.cache_read_mtok : undefined,
        input_cached_write_per_1m_usd: typeof p.cache_write_mtok === "number" ? p.cache_write_mtok : undefined,
        currency_native: "USD",
        source_id: "genai-prices",
        source_url: prov.pricing_urls?.[0] ?? url,
        confidence_score: 0.9,
        need_manual_review: false,
      });
    }
  }

  return { sourceId: "genai-prices", url, models, pricing, raw };
}
