/**
 * simonw/llm-prices: current-v1.json + historical-v1.json
 *
 * current-v1.json 形如：
 * [
 *   {
 *     "model_id": "gpt-4o",
 *     "provider": "openai",
 *     "input": 2.5,
 *     "output": 10,
 *     "context_window": 128000,
 *     "input_cache_read": 1.25,
 *     "url": "https://openai.com/api/pricing/",
 *     "last_updated": "2026-01-01"
 *   }, ...
 * ]
 *
 * 注意：这里的 input/output 已经是 USD / 1M tokens
 */
import { fetchJson } from "../fetchers/http.js";
import { config } from "../config.js";
import type { NormalizedModel, NormalizedPricing } from "../types.js";

interface LlmPriceRow {
  model_id: string;
  provider: string;
  input: number;
  output: number;
  context_window?: number;
  input_cache_read?: number;
  input_cache_write?: number;
  url?: string;
  last_updated?: string;
  modality?: string;
  supports_caching?: boolean;
  supports_vision?: boolean;
  supports_function_calling?: boolean;
}

export async function fetchLlmPricesCurrent() {
  const raw = await fetchJson(config.sources.llmPricesCurrent, "llm-prices");
  const parsed = JSON.parse(raw.body) as LlmPriceRow[];
  const models: NormalizedModel[] = [];
  const pricing: NormalizedPricing[] = [];

  for (const r of parsed) {
    const externalId = `${r.provider}/${r.model_id}`;
    const caps = ["text"];
    if (r.supports_vision) caps.push("vision");
    if (r.supports_function_calling) caps.push("function-call");
    if (r.input_cache_read != null || r.supports_caching) caps.push("cache");
    if ((r.context_window ?? 0) >= 100_000) caps.push("long-context");

    models.push({
      external_id: externalId,
      provider_slug: r.provider,
      name: r.model_id,
      family: r.model_id.split("-")[0],
      modality: r.modality ? [r.modality] : ["text"],
      context_length: r.context_window,
      capabilities: Array.from(new Set(caps)),
      status: "active",
      source_id: "llm-prices",
      source_url: config.sources.llmPricesCurrent,
      confidence_score: 0.85,
      need_manual_review: false,
    });

    pricing.push({
      model_external_id: externalId,
      input_per_1m_usd: r.input,
      output_per_1m_usd: r.output,
      input_cached_read_per_1m_usd: r.input_cache_read,
      input_cached_write_per_1m_usd: r.input_cache_write,
      currency_native: "USD",
      effective_start_at: r.last_updated,
      source_id: "llm-prices",
      source_url: r.url ?? config.sources.llmPricesCurrent,
      confidence_score: 0.85,
      need_manual_review: false,
    });
  }

  return { sourceId: "llm-prices", url: config.sources.llmPricesCurrent, models, pricing, raw };
}

/**
 * historical-v1.json: 同上但带时间戳/历史
 */
interface LlmHistoricalRow {
  model_id: string;
  provider: string;
  input: number;
  output: number;
  context_window?: number;
  start_date: string;
  end_date?: string;
  url?: string;
}

export async function fetchLlmPricesHistorical() {
  const raw = await fetchJson(config.sources.llmPricesHistorical, "llm-prices-historical");
  const parsed = JSON.parse(raw.body) as LlmHistoricalRow[];
  // 仅返回 history rows；入库时按 start_date 写入 price_change_log
  const history = parsed.map((r) => ({
    model_external_id: `${r.provider}/${r.model_id}`,
    input_per_1m_usd: r.input,
    output_per_1m_usd: r.output,
    context_window: r.context_window,
    start_date: r.start_date,
    end_date: r.end_date,
    source_url: r.url ?? config.sources.llmPricesHistorical,
  }));
  return { sourceId: "llm-prices-historical", url: config.sources.llmPricesHistorical, history, raw };
}
