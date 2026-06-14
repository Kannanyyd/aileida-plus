export type ProviderKind = "model_vendor" | "cloud_platform" | "api_aggregator" | "open_source_platform" | "unknown";

export interface ProviderAliasInfo {
  sourceSlug: string;
  canonicalSlug: string;
  displayName: string;
  providerType: ProviderKind;
  confidence: number;
  needsReview: boolean;
  notes?: string;
}

const aliasRows: ProviderAliasInfo[] = [
  { sourceSlug: "xai", canonicalSlug: "xai", displayName: "xAI", providerType: "model_vendor", confidence: 1, needsReview: false },
  { sourceSlug: "x-ai", canonicalSlug: "xai", displayName: "xAI", providerType: "model_vendor", confidence: 0.98, needsReview: false },
  { sourceSlug: "x.ai", canonicalSlug: "xai", displayName: "xAI", providerType: "model_vendor", confidence: 0.98, needsReview: false },
  { sourceSlug: "google", canonicalSlug: "google", displayName: "Google", providerType: "model_vendor", confidence: 1, needsReview: false },
  { sourceSlug: "google-ai", canonicalSlug: "google", displayName: "Google AI", providerType: "model_vendor", confidence: 0.95, needsReview: false },
  { sourceSlug: "gemini", canonicalSlug: "google", displayName: "Google Gemini", providerType: "model_vendor", confidence: 0.95, needsReview: false },
  { sourceSlug: "vertex-ai-language-models", canonicalSlug: "google", displayName: "Google Vertex AI", providerType: "cloud_platform", confidence: 0.9, needsReview: false },
  { sourceSlug: "openai", canonicalSlug: "openai", displayName: "OpenAI", providerType: "model_vendor", confidence: 1, needsReview: false },
  { sourceSlug: "~openai", canonicalSlug: "openai", displayName: "OpenAI", providerType: "model_vendor", confidence: 0.92, needsReview: false },
  { sourceSlug: "azure-openai", canonicalSlug: "openai", displayName: "Azure OpenAI", providerType: "cloud_platform", confidence: 0.7, needsReview: true },
  { sourceSlug: "anthropic", canonicalSlug: "anthropic", displayName: "Anthropic", providerType: "model_vendor", confidence: 1, needsReview: false },
  { sourceSlug: "claude", canonicalSlug: "anthropic", displayName: "Claude", providerType: "model_vendor", confidence: 0.95, needsReview: false },
  { sourceSlug: "alibaba", canonicalSlug: "alibaba-cloud", displayName: "Alibaba Cloud", providerType: "cloud_platform", confidence: 0.88, needsReview: false },
  { sourceSlug: "aliyun", canonicalSlug: "alibaba-cloud", displayName: "Alibaba Cloud", providerType: "cloud_platform", confidence: 0.9, needsReview: false },
  { sourceSlug: "aliyun-bailian", canonicalSlug: "alibaba-cloud", displayName: "Bailian", providerType: "cloud_platform", confidence: 0.96, needsReview: false },
  { sourceSlug: "bailian", canonicalSlug: "alibaba-cloud", displayName: "Bailian", providerType: "cloud_platform", confidence: 0.95, needsReview: false },
  { sourceSlug: "qwen", canonicalSlug: "alibaba-cloud", displayName: "Qwen", providerType: "model_vendor", confidence: 0.82, needsReview: true },
  { sourceSlug: "bytedance", canonicalSlug: "bytedance-volcano", displayName: "ByteDance", providerType: "cloud_platform", confidence: 0.88, needsReview: false },
  { sourceSlug: "volcano", canonicalSlug: "bytedance-volcano", displayName: "Volcano Engine", providerType: "cloud_platform", confidence: 0.95, needsReview: false },
  { sourceSlug: "volcengine", canonicalSlug: "bytedance-volcano", displayName: "Volcano Engine", providerType: "cloud_platform", confidence: 0.98, needsReview: false },
  { sourceSlug: "doubao", canonicalSlug: "bytedance-volcano", displayName: "Doubao", providerType: "model_vendor", confidence: 0.85, needsReview: true },
  { sourceSlug: "siliconflow", canonicalSlug: "siliconflow", displayName: "SiliconFlow", providerType: "api_aggregator", confidence: 1, needsReview: false },
  { sourceSlug: "硅基流动", canonicalSlug: "siliconflow", displayName: "SiliconFlow", providerType: "api_aggregator", confidence: 0.98, needsReview: false },
  { sourceSlug: "openrouter", canonicalSlug: "openrouter", displayName: "OpenRouter", providerType: "api_aggregator", confidence: 1, needsReview: false },
];

export const PROVIDER_ALIAS_RULES = aliasRows;

const aliasMap = new Map(aliasRows.map((row) => [row.sourceSlug.toLowerCase(), row]));

export function canonicalProviderSlug(sourceSlug: string | null | undefined): string {
  const slug = (sourceSlug ?? "").toLowerCase();
  return aliasMap.get(slug)?.canonicalSlug ?? slug;
}

export function providerAliasInfo(sourceSlug: string | null | undefined): ProviderAliasInfo | null {
  const slug = (sourceSlug ?? "").toLowerCase();
  return aliasMap.get(slug) ?? null;
}

export function inferSellingPlatform(raw: {
  providerSlug?: string | null;
  platform?: string | null;
  channel?: string | null;
  isAggregator?: boolean | null;
}): string {
  const platform = raw.platform?.toLowerCase();
  if (platform) return canonicalProviderSlug(platform);
  const provider = (raw.providerSlug ?? "").toLowerCase();
  if (raw.isAggregator || raw.channel === "aggregator") return canonicalProviderSlug(provider);
  if (provider.includes("azure")) return "azure";
  return canonicalProviderSlug(provider);
}

export function inferModelOwnerProvider(raw: { providerSlug?: string | null; modelSlug?: string | null; modelName?: string | null }): string {
  const provider = canonicalProviderSlug(raw.providerSlug);
  const text = `${raw.modelSlug ?? ""} ${raw.modelName ?? ""}`.toLowerCase();
  if (text.includes("openai/") || /^gpt-|^o[1345]\b|^text-|^dall-e/.test(text)) return "openai";
  if (text.includes("anthropic/") || text.includes("claude")) return "anthropic";
  if (text.includes("google/") || text.includes("gemini")) return "google";
  if (text.includes("x-ai/") || text.includes("xai/") || text.includes("grok")) return "xai";
  if (text.includes("qwen") || text.includes("tongyi")) return "alibaba-cloud";
  if (text.includes("doubao")) return "bytedance-volcano";
  if (text.includes("deepseek")) return "deepseek";
  if (text.includes("moonshot") || text.includes("kimi")) return "moonshot";
  return provider;
}

export function normalizeModelSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/^[~@]/, "")
    .replace(/[:_\s]+/g, "-")
    .replace(/[^a-z0-9./-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function inferModelVariant(modelSlug: string): string {
  const slug = normalizeModelSlug(modelSlug);
  const tags: string[] = [];
  if (/(^|-)preview($|-)|(^|-)beta($|-)|experimental/.test(slug)) tags.push("preview");
  if (/(^|-)latest($|-)/.test(slug)) tags.push("latest");
  if (/non[-_]?reasoning/.test(slug)) tags.push("non-reasoning");
  else if (/reasoning|thinking|deep-research|deepresearch/.test(slug)) tags.push("reasoning");
  if (/mini|small|lite|nano|flash/.test(slug)) tags.push("light");
  if (/pro|large|opus|max|ultra/.test(slug)) tags.push("pro");
  if (/turbo|fast/.test(slug)) tags.push("fast");
  return tags.length > 0 ? tags.join("+") : "base";
}

export function inferModelFamily(modelSlug: string, family?: string | null): string {
  const raw = normalizeModelSlug(family || modelSlug).split("/").pop() ?? normalizeModelSlug(modelSlug);
  let cleaned = raw
    .replace(/-\d{4}[-_]\d{2}[-_]\d{2}$/g, "")
    .replace(/-\d{6,8}$/g, "")
    .replace(/-(latest|preview|beta|experimental|instruct|chat|online)$/g, "")
    .replace(/-(reasoning|non-reasoning|thinking)$/g, "");
  if (/^grok-4-1-fast/.test(cleaned)) return "grok-4-1-fast";
  if (/^grok-4/.test(cleaned)) return "grok-4";
  if (/^gpt-5/.test(cleaned)) return "gpt-5";
  if (/^gpt-4/.test(cleaned)) return "gpt-4";
  if (/^claude-/.test(cleaned)) return cleaned.split("-").slice(0, 3).join("-");
  if (/^gemini-/.test(cleaned)) return cleaned.split("-").slice(0, 3).join("-");
  if (/^qwen3/.test(cleaned)) return cleaned.split("-").slice(0, 2).join("-");
  if (/^deepseek-/.test(cleaned)) return cleaned.split("-").slice(0, 2).join("-");
  if (/^llama-/.test(cleaned)) return cleaned.split("-").slice(0, 3).join("-");
  return cleaned.split(/[/-]/).slice(0, 3).join("-");
}

export function inferDataQualityFlags(raw: {
  modelName?: string | null;
  modelSlug?: string | null;
  status?: string | null;
  isAggregator?: boolean | null;
  isOfficial?: boolean | null;
  sourceUrl?: string | null;
  currencyNative?: string | null;
  isDomestic?: boolean | null;
  pricingRegion?: string | null;
  hasNativeCny?: boolean | null;
  confidence?: number | null;
  needsManualReview?: boolean | null;
  needsAliasReview?: boolean | null;
}): string[] {
  const flags = new Set<string>();
  const text = `${raw.modelSlug ?? ""} ${raw.modelName ?? ""}`.toLowerCase();
  if (/(^|[-_\s])(preview|beta|experimental)([-_\s]|$)/.test(text) || ["preview", "beta"].includes(raw.status ?? "")) flags.add("preview_or_beta");
  if (raw.isAggregator && !raw.isOfficial) flags.add("aggregator_only");
  if (!raw.sourceUrl || raw.sourceUrl === "unknown") flags.add("missing_price_source_url");
  if ((raw.isDomestic || raw.pricingRegion === "china_mainland") && raw.currencyNative !== "CNY" && !raw.hasNativeCny) flags.add("domestic_price_missing");
  if (raw.currencyNative && raw.currencyNative !== "CNY" && raw.pricingRegion === "china_mainland") flags.add("currency_estimated_only");
  if ((raw.confidence ?? 1) < 0.7) flags.add("source_conflict");
  if (raw.needsManualReview) flags.add("needs_manual_review");
  if (raw.needsAliasReview) flags.add("needs_manual_review");
  if (/[{}[\]|<>]|\b(api|models|pricing|docs|guide|required)\b/i.test(text) && !/(gpt|claude|gemini|grok|qwen|llama|deepseek|kimi|glm|doubao|mistral|sonar|command)/i.test(text)) {
    flags.add("suspicious_name");
    flags.add("needs_manual_review");
  }
  return [...flags].sort();
}
