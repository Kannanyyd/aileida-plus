/**
 * OpenRouter /api/v1/models
 * 字段约定见 openrouter schema；价格单位 USD / token
 */
import { fetchJson } from "../fetchers/http.js";
import { config } from "../config.js";
import type { NormalizedModel, NormalizedPricing } from "../types.js";

interface OpenRouterPricing {
  prompt?: string;
  completion?: string;
  input_cache_read?: string;
  input_cache_write?: string;
  image?: string;
  audio?: string;
  request?: string;
}

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  architecture?: { modality?: string; input_modalities?: string[]; output_modalities?: string[] };
  pricing: OpenRouterPricing;
  top_provider?: { context_length?: number; max_completion_tokens?: number };
  supported_parameters?: string[];
  created?: number;
  knowledge_cutoff?: string;
  canonical_slug?: string;
}

const OR_PROVIDER_SLUG = (id: string): string => {
  const slash = id.indexOf("/");
  return slash > 0 ? id.slice(0, slash) : id;
};

function deriveCapabilities(m: OpenRouterModel): string[] {
  const caps = new Set<string>(["text"]);
  const ins = m.architecture?.input_modalities ?? [];
  if (ins.includes("image")) caps.add("vision");
  if (ins.includes("audio")) caps.add("audio");
  if (ins.includes("video")) caps.add("video");
  if ((m.supported_parameters ?? []).includes("tools")) caps.add("function-call");
  if ((m.supported_parameters ?? []).includes("response_format")) caps.add("json-mode");
  if (m.context_length >= 100_000) caps.add("long-context");
  if (m.pricing.input_cache_read != null) caps.add("cache");
  return Array.from(caps);
}

export async function fetchOpenRouter() {
  const raw = await fetchJson(config.sources.openrouter, "openrouter");
  const parsed = JSON.parse(raw.body) as { data: OpenRouterModel[] };
  const models: NormalizedModel[] = [];
  const pricing: NormalizedPricing[] = [];

  for (const m of parsed.data ?? []) {
    if (!m.pricing) continue;
    const prompt = Number(m.pricing.prompt ?? "0");
    const completion = Number(m.pricing.completion ?? "0");
    if (prompt < 0 || completion < 0) continue; // 路由模型

    const provider = OR_PROVIDER_SLUG(m.id);

    models.push({
      external_id: m.id,
      provider_slug: provider,
      name: m.name ?? m.id,
      family: m.canonical_slug ?? m.id,
      modality: (m.architecture?.input_modalities ?? ["text"]) as string[],
      context_length: m.context_length,
      max_output_tokens: m.top_provider?.max_completion_tokens,
      capabilities: deriveCapabilities(m),
      release_date: m.created ? new Date(m.created * 1000).toISOString().slice(0, 10) : undefined,
      status: "active",
      source_id: "openrouter",
      source_url: `${config.sources.openrouter}#${m.id}`,
      confidence_score: 0.9,
      need_manual_review: false,
    });

    pricing.push({
      model_external_id: m.id,
      pricing_type: "api_token",
      input_per_1m_usd: prompt * 1_000_000,
      output_per_1m_usd: completion * 1_000_000,
      input_cached_read_per_1m_usd:
        m.pricing.input_cache_read != null ? Number(m.pricing.input_cache_read) * 1_000_000 : undefined,
      input_cached_write_per_1m_usd:
        m.pricing.input_cache_write != null ? Number(m.pricing.input_cache_write) * 1_000_000 : undefined,
      currency_native: "USD",
      source_id: "openrouter",
      source_url: `https://openrouter.ai/models/${m.id}`,
      confidence_score: 0.9,
      need_manual_review: false,
    });
    if (m.pricing.audio != null) {
      pricing.push({
        model_external_id: m.id,
        pricing_type: "audio",
        unit_amount: Number(m.pricing.audio) * 1_000_000,
        unit_amount_usd: Number(m.pricing.audio) * 1_000_000,
        billing_unit: "per_audio_min",
        currency_native: "USD",
        source_id: "openrouter",
        source_url: `https://openrouter.ai/models/${m.id}`,
        confidence_score: 0.9,
        need_manual_review: false,
      });
    }
    if (m.pricing.image != null) {
      pricing.push({
        model_external_id: m.id,
        pricing_type: "image",
        unit_amount: Number(m.pricing.image),
        unit_amount_usd: Number(m.pricing.image),
        billing_unit: "per_image",
        currency_native: "USD",
        source_id: "openrouter",
        source_url: `https://openrouter.ai/models/${m.id}`,
        confidence_score: 0.9,
        need_manual_review: false,
      });
    }
  }

  return { sourceId: "openrouter", url: config.sources.openrouter, models, pricing, raw };
}
