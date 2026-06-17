export type OfficialCurrentProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "mistral"
  | "meta"
  | "cohere"
  | "perplexity"
  | "deepseek"
  | "alibaba-cloud"
  | "moonshotai"
  | "volcengine-doubao"
  | "tencent-hunyuan"
  | "baidu-qianfan"
  | "zhipu"
  | "minimax"
  | "siliconflow";

export type OfficialModelStatus = "current" | "recommended" | "latest" | "previous" | "deprecated";

export interface OfficialCurrentModel {
  provider: OfficialCurrentProvider;
  modelSlug: string;
  aliases?: string[];
  modelFamily: string;
  officialName: string;
  officialSourceUrl: string;
  officialStatus: OfficialModelStatus;
  officialCheckedAt: string;
  confidence: number;
  notes?: string;
  homepageEligible?: boolean;
  needsPricingReview?: boolean;
}

export interface OfficialCurrentModelInput {
  model_slug?: string | null;
  canonical_model_slug?: string | null;
  model_family?: string | null;
  family?: string | null;
  provider_slug?: string | null;
  canonical_provider_slug?: string | null;
  model_owner_provider?: string | null;
}

const CHECKED_AT = "2026-06-15";

export const OFFICIAL_CURRENT_MODELS: OfficialCurrentModel[] = [
  {
    provider: "openai",
    modelSlug: "gpt-5.5",
    aliases: ["gpt-5.5-chat-latest"],
    modelFamily: "gpt-5.5",
    officialName: "GPT-5.5",
    officialSourceUrl: "https://developers.openai.com/api/docs/models",
    officialStatus: "recommended",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.95,
    homepageEligible: true,
  },
  {
    provider: "openai",
    modelSlug: "gpt-5.4-mini",
    modelFamily: "gpt-5.4",
    officialName: "GPT-5.4 mini",
    officialSourceUrl: "https://developers.openai.com/api/docs/models/all",
    officialStatus: "current",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.9,
    homepageEligible: true,
  },
  {
    provider: "anthropic",
    modelSlug: "claude-opus-4.8",
    aliases: ["claude-opus-4-8", "claude-opus-4.8-20260610"],
    modelFamily: "claude-opus-4.8",
    officialName: "Claude Opus 4.8",
    officialSourceUrl: "https://docs.anthropic.com/en/docs/about-claude/models",
    officialStatus: "recommended",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.95,
    homepageEligible: true,
  },
  {
    provider: "anthropic",
    modelSlug: "claude-sonnet-4.5",
    aliases: ["claude-sonnet-4-5"],
    modelFamily: "claude-sonnet-4.5",
    officialName: "Claude Sonnet 4.5",
    officialSourceUrl: "https://docs.anthropic.com/en/docs/about-claude/models",
    officialStatus: "current",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.9,
    homepageEligible: true,
  },
  {
    provider: "google",
    modelSlug: "gemini-3.5-flash",
    aliases: ["gemini-flash-latest", "gemini-3-5-flash"],
    modelFamily: "gemini-3.5-flash",
    officialName: "Gemini 3.5 Flash",
    officialSourceUrl: "https://ai.google.dev/gemini-api/docs/models",
    officialStatus: "recommended",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.95,
    homepageEligible: true,
  },
  {
    provider: "google",
    modelSlug: "gemini-3.1-pro-preview",
    aliases: ["gemini-pro-latest", "gemini-3-1-pro-preview"],
    modelFamily: "gemini-3.1-pro",
    officialName: "Gemini 3.1 Pro Preview",
    officialSourceUrl: "https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview",
    officialStatus: "current",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.85,
    homepageEligible: true,
    needsPricingReview: true,
    notes: "Preview models require visible preview labeling before promotion-heavy surfaces.",
  },
  {
    provider: "xai",
    modelSlug: "grok-4-0709",
    aliases: ["grok-4", "grok-4.20", "grok-4-latest"],
    modelFamily: "grok-4",
    officialName: "Grok 4 0709",
    officialSourceUrl: "https://docs.x.ai/docs/models/grok-4-0709",
    officialStatus: "current",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.9,
    homepageEligible: true,
  },
  {
    provider: "mistral",
    modelSlug: "mistral-medium-3.5",
    aliases: ["mistral-medium-latest"],
    modelFamily: "mistral-medium",
    officialName: "Mistral Medium 3.5",
    officialSourceUrl: "https://docs.mistral.ai/models/overview",
    officialStatus: "recommended",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.9,
    homepageEligible: true,
  },
  {
    provider: "mistral",
    modelSlug: "mistral-small-4",
    aliases: ["mistral-small-latest"],
    modelFamily: "mistral-small",
    officialName: "Mistral Small 4",
    officialSourceUrl: "https://docs.mistral.ai/models/overview",
    officialStatus: "current",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.9,
    homepageEligible: true,
  },
  {
    provider: "meta",
    modelSlug: "llama-4-maverick",
    modelFamily: "llama-4",
    officialName: "Llama 4 Maverick",
    officialSourceUrl: "https://llama.meta.com/",
    officialStatus: "recommended",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.9,
    homepageEligible: true,
  },
  {
    provider: "meta",
    modelSlug: "llama-4-scout",
    modelFamily: "llama-4",
    officialName: "Llama 4 Scout",
    officialSourceUrl: "https://llama.meta.com/",
    officialStatus: "current",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.9,
    homepageEligible: true,
  },
  {
    provider: "cohere",
    modelSlug: "command-r-plus-08-2024",
    aliases: ["command-r-plus"],
    modelFamily: "command-r",
    officialName: "Command R+ 08-2024",
    officialSourceUrl: "https://docs.cohere.com/docs/models",
    officialStatus: "current",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.85,
    homepageEligible: true,
  },
  {
    provider: "cohere",
    modelSlug: "north-mini-code-1-0",
    modelFamily: "north-mini-code",
    officialName: "North Mini Code",
    officialSourceUrl: "https://docs.cohere.com/changelog",
    officialStatus: "latest",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.85,
    homepageEligible: false,
    needsPricingReview: true,
  },
  {
    provider: "perplexity",
    modelSlug: "sonar-pro",
    modelFamily: "sonar",
    officialName: "Sonar Pro",
    officialSourceUrl: "https://docs.perplexity.ai/docs/sonar/models",
    officialStatus: "recommended",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.9,
    homepageEligible: true,
  },
  {
    provider: "perplexity",
    modelSlug: "sonar-reasoning-pro",
    modelFamily: "sonar",
    officialName: "Sonar Reasoning Pro",
    officialSourceUrl: "https://docs.perplexity.ai/docs/sonar/models",
    officialStatus: "current",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.9,
    homepageEligible: true,
  },
  {
    provider: "perplexity",
    modelSlug: "sonar-deep-research",
    modelFamily: "sonar",
    officialName: "Sonar Deep Research",
    officialSourceUrl: "https://docs.perplexity.ai/docs/getting-started/pricing",
    officialStatus: "current",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.9,
    homepageEligible: true,
  },
  {
    provider: "deepseek",
    modelSlug: "deepseek-chat",
    modelFamily: "deepseek-v3",
    officialName: "DeepSeek Chat",
    officialSourceUrl: "https://api-docs.deepseek.com/quick_start/pricing",
    officialStatus: "current",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.9,
    homepageEligible: true,
  },
  {
    provider: "deepseek",
    modelSlug: "deepseek-reasoner",
    modelFamily: "deepseek-r1",
    officialName: "DeepSeek Reasoner",
    officialSourceUrl: "https://api-docs.deepseek.com/api/list-models",
    officialStatus: "previous",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.86,
    homepageEligible: false,
    notes: "DeepSeek R1/Reasoner is retained for historical pricing and reasoning references only; do not show it as a homepage current-main model.",
  },
  {
    provider: "alibaba-cloud",
    modelSlug: "qwen3-235b-a22b",
    aliases: ["qwen/qwen3-235b-a22b"],
    modelFamily: "qwen3",
    officialName: "Qwen3 235B A22B",
    officialSourceUrl: "https://help.aliyun.com/zh/model-studio/models",
    officialStatus: "recommended",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.82,
    homepageEligible: true,
  },
  {
    provider: "moonshotai",
    modelSlug: "kimi-k2.7-code",
    modelFamily: "kimi-k2.7",
    officialName: "Kimi K2.7 Code",
    officialSourceUrl: "https://platform.moonshot.cn/docs/api/chat",
    officialStatus: "recommended",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.95,
    homepageEligible: true,
  },
  {
    provider: "moonshotai",
    modelSlug: "kimi-k2.6",
    modelFamily: "kimi-k2.6",
    officialName: "Kimi K2.6",
    officialSourceUrl: "https://platform.moonshot.cn/docs/introduction",
    officialStatus: "current",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.9,
    homepageEligible: true,
  },
  {
    provider: "volcengine-doubao",
    modelSlug: "doubao-seed-1.6",
    aliases: ["doubao-seed-1-6"],
    modelFamily: "doubao-seed",
    officialName: "Doubao Seed 1.6",
    officialSourceUrl: "https://www.volcengine.com/docs/82379/1330310",
    officialStatus: "current",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.82,
    homepageEligible: true,
  },
  {
    provider: "tencent-hunyuan",
    modelSlug: "hunyuan-turbos-latest",
    aliases: ["hunyuan-turbos", "hunyuan-turbo-latest"],
    modelFamily: "hunyuan-turbos",
    officialName: "Hunyuan Turbos",
    officialSourceUrl: "https://cloud.tencent.com/document/product/1729/104753",
    officialStatus: "current",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.82,
    homepageEligible: true,
  },
  {
    provider: "baidu-qianfan",
    modelSlug: "ernie-5.1",
    aliases: ["ernie-5-1"],
    modelFamily: "ernie-5",
    officialName: "ERNIE 5.1",
    officialSourceUrl: "https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Fm2vrveyu",
    officialStatus: "current",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.82,
    homepageEligible: true,
  },
  {
    provider: "zhipu",
    modelSlug: "glm-4.6",
    modelFamily: "glm-4",
    officialName: "GLM-4.6",
    officialSourceUrl: "https://docs.bigmodel.cn/cn/guide/models",
    officialStatus: "current",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.82,
    homepageEligible: true,
  },
  {
    provider: "minimax",
    modelSlug: "minimax-m3",
    modelFamily: "minimax-m3",
    officialName: "MiniMax M3",
    officialSourceUrl: "https://platform.minimaxi.com/docs/guides/pricing-paygo",
    officialStatus: "current",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.88,
    homepageEligible: true,
  },
  {
    provider: "siliconflow",
    modelSlug: "siliconflow-platform-current",
    modelFamily: "platform-catalog",
    officialName: "SiliconFlow model catalog",
    officialSourceUrl: "https://cloud.siliconflow.cn/models",
    officialStatus: "current",
    officialCheckedAt: CHECKED_AT,
    confidence: 0.7,
    homepageEligible: false,
    notes: "Selling platform catalog; do not treat as a model owner for homepage currentness.",
  },
];

export const OFFICIAL_CURRENT_PROVIDERS = Array.from(
  new Set(OFFICIAL_CURRENT_MODELS.map((entry) => entry.provider)),
) as OfficialCurrentProvider[];

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/^openrouter\//, "")
    .replace(/^models\//, "")
    .replace(/_/g, "-")
    .trim();
}

function providerCandidates(model: OfficialCurrentModelInput): string[] {
  return [
    model.model_owner_provider,
    model.canonical_provider_slug,
    model.provider_slug,
    model.canonical_model_slug?.split("/")[0],
  ].map(normalize).filter(Boolean);
}

export function providerOfficialCurrentModels(provider: string): OfficialCurrentModel[] {
  const normalized = normalize(provider);
  return OFFICIAL_CURRENT_MODELS.filter((entry) => entry.provider === normalized);
}

export function findOfficialCurrentModel(model: OfficialCurrentModelInput): OfficialCurrentModel | null {
  const providers = new Set(providerCandidates(model));
  const slugCandidates = new Set([
    normalize(model.model_slug),
    normalize(model.canonical_model_slug),
    normalize(model.canonical_model_slug?.split("/").slice(1).join("/")),
  ].filter(Boolean));

  for (const entry of OFFICIAL_CURRENT_MODELS) {
    if (!providers.has(entry.provider)) continue;
    const entrySlugs = [entry.modelSlug, ...(entry.aliases ?? [])].map(normalize);
    if (entrySlugs.some((slug) => slugCandidates.has(slug))) return entry;
  }
  return null;
}

export function hasOfficialCurrentEvidence(model: OfficialCurrentModelInput): boolean {
  const entry = findOfficialCurrentModel(model);
  return Boolean(entry && ["current", "recommended", "latest"].includes(entry.officialStatus));
}
