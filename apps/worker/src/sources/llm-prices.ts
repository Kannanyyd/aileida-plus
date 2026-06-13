/**
 * llm-prices.com: current-v1.json
 *
 * API 返回格式:
 * {
 *   "updated_at": "2026-06-09",
 *   "prices": [
 *     {
 *       "id": "amazon-nova-micro",
 *       "vendor": "amazon",
 *       "name": "Amazon Nova Micro",
 *       "input": 0.035,      // USD / 1M tokens
 *       "output": 0.14,
 *       "input_cached": null
 *     }
 *   ]
 * }
 */
import { fetchJson } from "../fetchers/http.js";
import { config } from "../config.js";
import type { NormalizedModel, NormalizedPricing } from "../types.js";

interface LlmPriceRow {
  id: string;
  vendor: string;
  name: string;
  input: number;
  output: number;
  input_cached?: number | null;
}

interface LlmPricesResponse {
  updated_at?: string;
  prices?: LlmPriceRow[];
}

export async function fetchLlmPricesCurrent() {
  const raw = await fetchJson(config.sources.llmPricesCurrent, "llm-prices");
  const parsed = JSON.parse(raw.body) as LlmPricesResponse;
  const rows = parsed.prices ?? [];
  const updatedAt = parsed.updated_at;

  const models: NormalizedModel[] = [];
  const pricing: NormalizedPricing[] = [];

  for (const r of rows) {
    if (!r.id || !r.vendor) continue;
    const externalId = `${r.vendor}/${r.id}`;

    models.push({
      external_id: externalId,
      provider_slug: r.vendor,
      name: r.name ?? r.id,
      family: r.id.split(/[-_]/)[0],
      modality: ["text"],
      context_length: undefined,
      capabilities: r.input_cached != null ? ["text", "cache"] : ["text"],
      status: "active",
      source_id: "llm-prices",
      source_url: config.sources.llmPricesCurrent,
      confidence_score: 0.85,
      need_manual_review: false,
    });

    pricing.push({
      model_external_id: externalId,
      pricing_type: "api_token",
      input_per_1m_usd: r.input,
      output_per_1m_usd: r.output,
      input_cached_read_per_1m_usd: r.input_cached ?? undefined,
      currency_native: "USD",
      effective_start_at: updatedAt,
      source_id: "llm-prices",
      source_url: config.sources.llmPricesCurrent,
      confidence_score: 0.85,
      need_manual_review: false,
    });
  }

  return { sourceId: "llm-prices", url: config.sources.llmPricesCurrent, models, pricing, raw };
}

// historical 暂不实现
export async function fetchLlmPricesHistorical() {
  return { sourceId: "llm-prices-historical", url: "", history: [] as any[], raw: { body: "[]" } as any };
}
