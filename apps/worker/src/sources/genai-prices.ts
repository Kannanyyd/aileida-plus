/**
 * pydantic/genai-prices prices/data.json
 *
 * 字段示例（节选）：
 * {
 *   "providers": {
 *     "openai": { "name": "OpenAI", "api_base": "https://api.openai.com/v1" },
 *     ...
 *   },
 *   "models": [
 *     {
 *       "id": "gpt-4o",
 *       "provider": "openai",
 *       "name": "GPT-4o",
 *       "context_window": 128000,
 *       "capabilities": ["text", "vision"],
 *       "prices": {
 *         "input": 2.5,    // USD / 1M tokens
 *         "output": 10,
 *         "cache_read": 1.25,
 *         "cache_write": 0
 *       }
 *     }
 *   ]
 * }
 */
import { fetchJson } from "../fetchers/http.js";
import { config } from "../config.js";
import type { NormalizedModel, NormalizedPricing } from "../types.js";

interface GenaiPriceModel {
  id: string;
  provider: string;
  name?: string;
  context_window?: number;
  max_output_tokens?: number;
  capabilities?: string[];
  modality?: string[];
  status?: string;
  prices?: {
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
    audio_input?: number;
    audio_output?: number;
    image?: number;
    request?: number;
    batch_input?: number;
    batch_output?: number;
  };
  notes?: string;
  url?: string;
}

export async function fetchGenaiPrices() {
  const raw = await fetchJson(config.sources.genaiPrices, "genai-prices");
  const parsed = JSON.parse(raw.body) as {
    providers?: Record<string, { name: string; api_base?: string }>;
    models?: GenaiPriceModel[];
  };

  const models: NormalizedModel[] = [];
  const pricing: NormalizedPricing[] = [];

  for (const m of parsed.models ?? []) {
    if (!m.prices) continue;
    const externalId = `${m.provider}/${m.id}`;
    models.push({
      external_id: externalId,
      provider_slug: m.provider,
      name: m.name ?? m.id,
      family: m.id.split("-")[0],
      modality: (m.modality ?? m.capabilities ?? ["text"]) as string[],
      context_length: m.context_window,
      max_output_tokens: m.max_output_tokens,
      capabilities: m.capabilities ?? [],
      status: (m.status as NormalizedModel["status"]) ?? "active",
      source_id: "genai-prices",
      source_url: config.sources.genaiPrices,
      confidence_score: 0.9,
      need_manual_review: false,
    });

    const p = m.prices;
    pricing.push({
      model_external_id: externalId,
      pricing_type: "api_token",
      input_per_1m_usd: p.input,
      output_per_1m_usd: p.output,
      input_cached_read_per_1m_usd: p.cache_read,
      input_cached_write_per_1m_usd: p.cache_write,
      batch_discount:
        p.batch_input != null && p.input != null && p.input > 0
          ? p.batch_input / p.input
          : undefined,
      currency_native: "USD",
      source_id: "genai-prices",
      source_url: m.url ?? config.sources.genaiPrices,
      confidence_score: 0.9,
      need_manual_review: false,
    });
    if (p.audio_input != null || p.audio_output != null) {
      pricing.push({
        model_external_id: externalId,
        pricing_type: "audio",
        unit_amount: p.audio_input ?? p.audio_output,
        unit_amount_usd: p.audio_input ?? p.audio_output,
        billing_unit: "per_audio_min",
        currency_native: "USD",
        source_id: "genai-prices",
        source_url: m.url ?? config.sources.genaiPrices,
        confidence_score: 0.9,
        need_manual_review: false,
      });
    }
    if (p.image != null) {
      pricing.push({
        model_external_id: externalId,
        pricing_type: "image",
        unit_amount: p.image,
        unit_amount_usd: p.image,
        billing_unit: "per_image",
        currency_native: "USD",
        source_id: "genai-prices",
        source_url: m.url ?? config.sources.genaiPrices,
        confidence_score: 0.9,
        need_manual_review: false,
      });
    }
    if (p.request != null) {
      pricing.push({
        model_external_id: externalId,
        unit_amount: p.request,
        unit_amount_usd: p.request,
        billing_unit: "per_request",
        currency_native: "USD",
        source_id: "genai-prices",
        source_url: m.url ?? config.sources.genaiPrices,
        confidence_score: 0.9,
        need_manual_review: false,
      });
    }
  }

  return { sourceId: "genai-prices", url: config.sources.genaiPrices, models, pricing, raw };
}
