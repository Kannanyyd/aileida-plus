/**
 * 解析 LiteLLM model_prices_and_context_window.json
 *
 * LiteLLM 字段格式（节选）：
 * {
 *   "gpt-4o": {
 *     "input_cost_per_token": 0.0000025,
 *     "output_cost_per_token": 0.00001,
 *     "max_tokens": 128000,
 *     "max_input_tokens": 128000,
 *     "max_output_tokens": 16384,
 *     "litellm_provider": "openai",
 *     "mode": "chat",
 *     "supports_function_calling": true,
 *     "supports_vision": true,
 *     "supports_caching": true,
 *     "cache_read_input_token_cost": 0.00000125
 *   }
 * }
 */
import { fetchJson } from "../fetchers/http.js";
import { config } from "../config.js";
import type { NormalizedModel, NormalizedPricing } from "../types.js";

const PROVIDER_MAP: Record<string, string> = {
  openai: "openai",
  anthropic: "anthropic",
  google: "google",
  vertex_ai_language_models: "google",
  gemini: "google",
  mistral: "mistral",
  cohere: "cohere",
  meta: "meta",
  meta_llama: "meta",
  groq: "groq",
  deepseek: "deepseek",
  deepseek_chat: "deepseek",
  alibaba: "alibaba",
  alibaba_cn: "alibaba",
  qwen: "alibaba",
  moonshot: "moonshot",
  moonshot_chat: "moonshot",
  zhipu: "zhipu",
  zhipu_chat: "zhipu",
  baichuan: "baichuan",
  minimax: "MiniMax",
  minimax_chat: "MiniMax",
  yi: "yi",
  perplexity: "perplexity",
  databricks: "databricks",
  azure: "azure",
  bedrock: "bedrock",
  openrouter: "openrouter",
  xai: "xai",
  nvidia: "nvidia",
  doubao: "volcengine",
  volcengine: "volcengine",
  jpmwepzn: "volcengine",
  siliconflow: "siliconflow",
  stepfun: "stepfun",
  tencent: "tencent",
  hunyuan: "tencent",
  baidu: "baidu",
  qianfan: "baidu",
  coze: "coze",
  lmsys: "lmsys",
};

function mapProvider(raw: string | undefined): string {
  if (!raw) return "unknown";
  return PROVIDER_MAP[raw] ?? raw.replace(/_/g, "-");
}

function deriveCapabilities(rec: Record<string, unknown>): string[] {
  const caps: string[] = ["text"];
  if (rec.supports_vision) caps.push("vision");
  if (rec.supports_function_calling) caps.push("function-call");
  if (rec.supports_response_schema) caps.push("json-mode");
  if (rec.supports_caching) caps.push("cache");
  if (rec.supports_prompt_caching) caps.push("cache");
  if (rec.supports_vision && rec.mode === "image_generation") caps.push("image-gen");
  if (rec.mode === "embedding") caps.push("embedding");
  if (rec.supports_audio_input || rec.mode === "audio") caps.push("audio");
  if (typeof rec.max_input_tokens === "number" && rec.max_input_tokens >= 100000) {
    caps.push("long-context");
  }
  return Array.from(new Set(caps));
}

export async function fetchLiteLLM() {
  const raw = await fetchJson(config.sources.litellm, "litellm");
  const parsed = JSON.parse(raw.body) as Record<string, Record<string, unknown>>;

  const models: NormalizedModel[] = [];
  const pricing: NormalizedPricing[] = [];

  for (const [key, rec] of Object.entries(parsed)) {
    if (key.startsWith("sample_spec")) continue;
    if (!rec || typeof rec !== "object") continue;
    if (rec.input_cost_per_token == null && rec.output_cost_per_token == null) continue;
    if (rec.mode === "embedding") {
      // 单独标记
    }
    const providerRaw = (rec.litellm_provider as string) ?? "unknown";
    const provider = mapProvider(providerRaw);
    const externalId = `${provider}/${key}`;

    models.push({
      external_id: externalId,
      provider_slug: provider,
      name: (rec.title as string) ?? key,
      family: key.split("/").pop()?.split("-")[0],
      modality:
        rec.mode === "embedding"
          ? ["text"]
          : rec.supports_vision
            ? ["text", "image"]
            : rec.mode === "audio"
              ? ["text", "audio"]
              : ["text"],
      context_length: (rec.max_input_tokens as number) ?? (rec.max_tokens as number),
      max_output_tokens: rec.max_output_tokens as number | undefined,
      capabilities: deriveCapabilities(rec),
      status: "active",
      source_id: "litellm",
      source_url: config.sources.litellm,
      confidence_score: 0.85,
      need_manual_review: false,
    });

    const input = Number(rec.input_cost_per_token ?? 0);
    const output = Number(rec.output_cost_per_token ?? 0);
    pricing.push({
      model_external_id: externalId,
      input_per_1m_usd: input * 1_000_000,
      output_per_1m_usd: output * 1_000_000,
      input_cached_read_per_1m_usd:
        rec.cache_read_input_token_cost != null
          ? Number(rec.cache_read_input_token_cost) * 1_000_000
          : undefined,
      input_cached_write_per_1m_usd:
        rec.cache_creation_input_token_cost != null
          ? Number(rec.cache_creation_input_token_cost) * 1_000_000
          : undefined,
      currency_native: "USD",
      source_id: "litellm",
      source_url: config.sources.litellm,
      confidence_score: 0.85,
      need_manual_review: false,
    });
  }

  return { sourceId: "litellm", url: config.sources.litellm, models, pricing, raw };
}
