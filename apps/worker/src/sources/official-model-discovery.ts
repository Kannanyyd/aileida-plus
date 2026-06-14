import { fetchText } from "../fetchers/http.js";
import type { NormalizedModel } from "../types.js";
import { OFFICIAL_MODEL_SOURCES, type OfficialModelSource } from "./official-model-registry.js";

export interface OfficialModelCandidate {
  provider_slug: string;
  model_slug: string;
  model_name: string;
  family?: string;
  source_id: string;
  source_url: string;
  source_type: "official";
  model_status: "active" | "preview" | "beta" | "deprecated" | "retired" | "unknown";
  lifecycle_tier: "current_frontier" | "current_mainstream" | "previous_generation" | "legacy" | "deprecated" | "unknown";
  confidence_score: number;
  is_recommended_by_official: boolean;
  is_default_in_official_docs: boolean;
  is_latest_alias: boolean;
  evidence: string;
}

export interface OfficialDiscoveryError {
  source_url: string;
  http_status?: number;
  error_message: string;
  parser_status: "fetch_failed" | "http_error" | "empty_result" | "parser_failed";
  next_action: string;
}

export interface OfficialDiscoveryResult {
  source: OfficialModelSource;
  candidates: OfficialModelCandidate[];
  models: NormalizedModel[];
  rawText: string;
  errors: OfficialDiscoveryError[];
  parserStatus: "success" | "partial" | "empty_result" | "failed";
  nextAction?: string;
}

type ModelPattern = { re: RegExp; formatter?: (token: string) => string };

const COMMON_PATTERNS: ModelPattern[] = [
  { re: /\bgpt-[a-z0-9][a-z0-9._-]*/gi },
  { re: /\bo\d(?:-[a-z0-9][a-z0-9._-]*)?\b/gi },
  { re: /\bclaude-[a-z0-9][a-z0-9._-]*/gi },
  { re: /\bclaude\s+(?:fable|opus|sonnet|haiku)\s+\d(?:\.\d)?\b/gi },
  { re: /\bgemini-[a-z0-9][a-z0-9._-]*/gi },
  { re: /\bgemini\s+\d(?:\.\d)?(?:\s+(?:pro|flash|flash-lite|ultra|live|tts|image|preview|thinking))*\b/gi },
  { re: /\bgrok-[a-z0-9][a-z0-9._-]*/gi },
  { re: /\bgrok\s+(?:\d(?:\.\d)?|build\s+\d(?:\.\d)?|imagine(?:\s+api)?|voice(?:\s+api)?)/gi },
  { re: /\bmistral-[a-z0-9][a-z0-9._-]*/gi },
  { re: /\b(?:magistral|codestral|ministral|pixtral)[a-z0-9._-]*(?:\s+(?:small|medium|large|\d+b|latest|preview))*\b/gi },
  { re: /\bmistral\s+(?:small|medium|large|saba|embed|ocr|nemo|devstral|document ai)\s*\d?(?:\.\d)?(?:\s+(?:latest|preview|instruct))*\b/gi },
  { re: /\bcommand-[a-z0-9][a-z0-9._-]*/gi },
  { re: /\bcommand\s+(?:a|r|r7b|light|nightly)(?:\s+(?:reasoning|plus|v\d|preview|-\d{2}-\d{4}))*\b/gi },
  { re: /\bembed-[a-z0-9][a-z0-9._-]*/gi },
  { re: /\bsonar(?:\s+(?:pro|reasoning|deep research|reasoning pro|small|large|huge|online))*\b/gi },
  { re: /\bpplx-embed(?:-context)?-v\d-[0-9.]+b\b/gi },
  { re: /\bllama[- ]?(?:guard\s*)?\d(?:\.\d)?(?:\s+(?:scout|maverick|behemoth|instruct|vision|text|multimodal|guard|\d{1,4}b))*\b/gi },
  { re: /\bdeepseek-[a-z0-9][a-z0-9._-]*/gi },
  { re: /\bqwen[0-9.]*(?:-[a-z0-9][a-z0-9._-]*)+\b/gi },
  { re: /\bqwen\d(?:\.\d)?\s+\d{1,4}b(?:\s+a\d+b)?(?:\s+instruct)?\b/gi },
  { re: /\bglm-[0-9][a-z0-9._-]*\b/gi },
  { re: /\bkimi-[a-z0-9][a-z0-9._-]*\b/gi },
  { re: /\bmoonshot-[a-z0-9][a-z0-9._-]*\b/gi },
  { re: /\babab[0-9.][a-z0-9._-]*\b/gi },
  { re: /\bdoubao-[a-z0-9][a-z0-9._-]*\b/gi },
  { re: /\bernie-[a-z0-9][a-z0-9._-]*\b/gi },
  { re: /\bhunyuan-[a-z0-9][a-z0-9._-]*\b/gi },
  { re: /\bstep-[a-z0-9][a-z0-9._-]*\b/gi },
];

const SOURCE_EXTRA_PATTERNS: Record<string, ModelPattern[]> = {
  "official-anthropic": [
    { re: /\bclaude\s+(?:fable|opus|sonnet|haiku)\s+\d(?:\.\d)?\b/gi },
  ],
  "official-google-gemini": [
    { re: /\bgemini\s+\d(?:\.\d)?(?:\s+(?:pro|flash|flash-lite|ultra|live|tts|image|preview|thinking))*\b/gi },
    { re: /\bimagen\s+\d(?:\.\d)?(?:\s+(?:preview|fast|ultra))*\b/gi },
    { re: /\bveo\s+\d(?:\.\d)?(?:\s+(?:preview|fast))*\b/gi },
    { re: /\blyria\s+\d(?:\.\d)?(?:\s+(?:realtime|preview))*\b/gi },
  ],
  "official-xai": [
    { re: /\bgrok\s+(?:\d(?:\.\d)?|build\s+\d(?:\.\d)?|imagine(?:\s+api)?|voice(?:\s+api)?)/gi },
  ],
  "official-mistral": [
    { re: /\bmistral\s+(?:small|medium|large|saba|embed|ocr|nemo|devstral|document ai)\s*\d?(?:\.\d)?(?:\s+(?:latest|preview|instruct))*\b/gi },
    { re: /\ble chat enterprise\b/gi },
  ],
  "official-perplexity": [
    { re: /\bsonar(?:\s+(?:pro|reasoning|deep research|reasoning pro))*\b/gi },
    { re: /\bpplx-embed(?:-context)?-v\d-[0-9.]+b\b/gi },
  ],
  "official-meta-llama": [
    { re: /\bllama\s+4\s+(?:scout|maverick|behemoth)\b/gi },
    { re: /\bllama\s+3(?:\.\d)?(?:\s+(?:\d{1,4}b|instruct|vision|text|multimodal|guard))*\b/gi },
  ],
};

const SOURCE_ALLOWED_PREFIXES: Record<string, string[]> = {
  "official-anthropic": ["claude-"],
  "official-google-gemini": ["gemini-", "imagen-", "veo-", "lyria-"],
  "official-xai": ["grok-"],
  "official-mistral": ["mistral-", "codestral", "magistral", "ministral", "pixtral", "devstral", "le-chat"],
  "official-perplexity": ["sonar", "pplx-embed"],
  "official-meta-llama": ["llama-"],
  "official-openai": ["gpt-", "o1", "o2", "o3", "o4", "o5"],
  "official-cohere": ["command-", "embed-", "rerank-"],
};

const JUNK_WORDS = [
  "required",
  "bytedance",
  "stepfun-ai",
  "meta-llama",
  "alibaba",
  "tencent",
  "overview",
  "quickstart",
  "documentation",
  "pricing",
  "roadmap",
  "console",
];

function stripHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

function cleanToken(token: string) {
  return token
    .replace(/[`"'“”‘’()[\]{}<>]/g, " ")
    .replace(/[.,;:!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSlug(token: string) {
  return cleanToken(token)
    .replace(/\s*\/\s*/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[:：]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function inferFamily(slug: string) {
  if (slug.startsWith("claude-")) return slug.split("-").slice(0, 3).join("-");
  if (slug.startsWith("gemini-")) return slug.split("-").slice(0, 3).join("-");
  if (slug.startsWith("llama-")) return slug.split("-").slice(0, 3).join("-");
  if (slug.startsWith("qwen")) return slug.split("-").slice(0, 2).join("-");
  return slug.split(/[/-]/).slice(0, 2).join("-");
}

function hasJunkShape(token: string, slug: string) {
  if (slug.length < 4 || slug.length > 80) return true;
  if (!/[a-z]/i.test(slug) || !/[0-9]/.test(slug)) {
    return !/^(sonar|sonar-|mistral|mistral-|codestral|magistral|devstral|command-r|command-a|gpt-oss|qwen-image|qwen-max|qwen-plus|qwen-turbo|qwen-omni|qwen-audio|qwen-vl|deepseek-chat|deepseek-reasoner)/.test(slug);
  }
  const lower = token.toLowerCase();
  if (JUNK_WORDS.some((word) => lower.includes(word))) return true;
  if (/\b(required|docs|models|pricing|api|guide|quickstart)\b/i.test(token) && !/\b(imagine api|voice api)\b/i.test(token)) return true;
  if ((token.match(/\s+/g)?.length ?? 0) > 5) return true;
  return false;
}

function isAllowedForSource(source: OfficialModelSource, slug: string) {
  const prefixes = SOURCE_ALLOWED_PREFIXES[source.id];
  if (!prefixes) return true;
  return prefixes.some((prefix) => slug.startsWith(prefix));
}

function inferStatus(context: string): OfficialModelCandidate["model_status"] {
  if (/\b(retired|sunset)\b|no longer available|will no longer be available|retirement date/i.test(context)) return "retired";
  if (/\bdeprecated\b|legacy model|older model|previous generation/i.test(context)) return "deprecated";
  if (/preview|experimental|exp\b|experimental/i.test(context)) return "preview";
  if (/beta|public beta|private beta/i.test(context)) return "beta";
  if (/active|recommended|default|stable|generally available|available models|use .* for/i.test(context)) return "active";
  return "unknown";
}

function inferTier(input: {
  status: OfficialModelCandidate["model_status"];
  context: string;
  slug: string;
  confidence: number;
  isDefault: boolean;
  isLatest: boolean;
}): OfficialModelCandidate["lifecycle_tier"] {
  const { status, context, slug, confidence, isDefault, isLatest } = input;
  if (status === "retired" || status === "deprecated") return "deprecated";
  if (/legacy|older model|previous generation|replaced by|deprecated/i.test(context)) return "previous_generation";
  if (status === "preview" || status === "beta") return confidence >= 0.9 ? "current_mainstream" : "unknown";

  const explicitFrontier =
    /(frontier|flagship|most capable|most intelligent|most advanced|best model|state-of-the-art|latest generation)/i.test(context) ||
    /^(gpt-5|claude-fable-5|gemini-3|grok-4|mistral-large-3|llama-4)/i.test(slug);

  if (confidence >= 0.9 && (isDefault || isLatest) && explicitFrontier) return "current_frontier";
  if (/^(claude-[12]|claude-3-|gpt-3|gemini-1|llama-2)/i.test(slug)) return "previous_generation";
  if (/^(llama-3|gemini-2|claude-3-5|claude-3-7|mistral-7b)/i.test(slug)) return "previous_generation";
  if (/^(claude-(fable-5|opus-4|sonnet-4|haiku-4)|gemini-3|grok-4|llama-4|mistral-large-3)/i.test(slug)) return "current_mainstream";
  if (/^(sonar|pplx-embed|mistral-|codestral|magistral|ministral|pixtral|devstral|command-|embed-|qwen3|deepseek-v3|glm-[45])/i.test(slug) && confidence >= 0.85) return "current_mainstream";
  if (confidence >= 0.85 && (status === "active" || isDefault || isLatest || explicitFrontier)) return "current_mainstream";
  return "unknown";
}

function getContext(text: string, index: number, tokenLength: number) {
  const start = Math.max(0, index - 260);
  const end = Math.min(text.length, index + tokenLength + 260);
  return text.slice(start, end);
}

function extractTokens(source: OfficialModelSource, text: string) {
  const patterns = [...(SOURCE_EXTRA_PATTERNS[source.id] ?? []), ...COMMON_PATTERNS];
  const found: Array<{ token: string; index: number }> = [];
  for (const pattern of patterns) {
    pattern.re.lastIndex = 0;
    for (const match of text.matchAll(pattern.re)) {
      const raw = pattern.formatter ? pattern.formatter(match[0]) : match[0];
      found.push({ token: cleanToken(raw), index: match.index ?? 0 });
    }
  }
  return found;
}

function toModel(c: OfficialModelCandidate): NormalizedModel {
  const status = c.model_status === "retired" || c.model_status === "unknown" ? "active" : c.model_status;
  return {
    external_id: `${c.provider_slug}/${c.model_slug}`,
    provider_slug: c.provider_slug,
    name: c.model_name,
    family: c.family,
    modality: /image|vision|audio|video|imagine|veo|imagen|tts|voice/i.test(c.model_name) ? ["text", "image"] : ["text"],
    capabilities: [
      /reason|thinking|o[0-9]|deepseek-r|sonar-reasoning|magistral/i.test(c.model_name) ? "reasoning" : "",
      /code|coder|codestral|devstral|build/i.test(c.model_name) ? "code" : "",
      /vision|image|multimodal|imagine|imagen|veo/i.test(c.model_name) ? "vision" : "",
      /tool|function/i.test(c.evidence) ? "function-call" : "",
    ].filter(Boolean),
    status,
    source_id: c.source_id,
    source_url: c.source_url,
    confidence_score: c.confidence_score,
    need_manual_review: true,
  };
}

function addBaselineCandidates(source: OfficialModelSource, candidates: Map<string, OfficialModelCandidate>) {
  for (const baseline of source.baselineCandidates ?? []) {
    if (candidates.has(baseline.slug)) continue;
    const sourceUrl = baseline.source_url ?? source.urls[0] ?? "unknown";
    candidates.set(baseline.slug, {
      provider_slug: source.providerSlug,
      model_slug: baseline.slug,
      model_name: baseline.name,
      family: inferFamily(baseline.slug),
      source_id: source.id,
      source_url: sourceUrl,
      source_type: "official",
      model_status: baseline.model_status ?? "unknown",
      lifecycle_tier: baseline.lifecycle_tier ?? "unknown",
      confidence_score: Math.min(source.confidence, 0.86),
      is_recommended_by_official: false,
      is_default_in_official_docs: false,
      is_latest_alias: /latest/i.test(baseline.slug),
      evidence: `Official baseline fallback from ${source.providerName}. Used when live official docs are unreachable; verify against ${sourceUrl}.`,
    });
  }
}

function parseHttpStatus(message: string) {
  const match = message.match(/HTTP\s+(\d{3})/i);
  return match ? Number(match[1]) : undefined;
}

export async function fetchOfficialModelSource(source: OfficialModelSource): Promise<OfficialDiscoveryResult> {
  const candidates = new Map<string, OfficialModelCandidate>();
  const rawParts: string[] = [];
  const errors: OfficialDiscoveryError[] = [];

  for (const url of source.urls) {
    let raw;
    try {
      raw = await fetchText(url, source.id);
    } catch (err: any) {
      const errorMessage = err?.message ?? String(err);
      const httpStatus = parseHttpStatus(errorMessage);
      errors.push({
        source_url: url,
        http_status: httpStatus,
        error_message: errorMessage,
        parser_status: httpStatus ? "http_error" : "fetch_failed",
        next_action: httpStatus === 403 ? "Use official markdown/API fallback or lower-frequency retry; do not use Chromium." : "Retry lightweight HTTP and verify URL.",
      });
      rawParts.push(`URL: ${url}\nERROR: ${errorMessage}`);
      console.error(`[${source.id}] official url failed: ${url} ${errorMessage}`);
      continue;
    }

    const text = stripHtml(raw.body);
    rawParts.push(`URL: ${url}\n${text.slice(0, 12000)}`);

    try {
      for (const match of extractTokens(source, text)) {
        const token = match.token;
        const modelSlug = normalizeSlug(token);
        if (!isAllowedForSource(source, modelSlug)) continue;
        if (hasJunkShape(token, modelSlug)) continue;

        const evidence = getContext(text, match.index, token.length);
        const status = inferStatus(evidence);
        const isLatest = /latest|newest|latest generation|current model/i.test(evidence) || /latest/i.test(modelSlug);
        const isDefault = /default|recommended|start with|use .* for|which model should i choose|featured models/i.test(evidence);
        const candidate: OfficialModelCandidate = {
          provider_slug: source.providerSlug,
          model_slug: modelSlug,
          model_name: token,
          family: inferFamily(modelSlug),
          source_id: source.id,
          source_url: url,
          source_type: "official",
          model_status: status,
          lifecycle_tier: inferTier({ status, context: evidence, slug: modelSlug, confidence: source.confidence, isDefault, isLatest }),
          confidence_score: source.confidence,
          is_recommended_by_official: isDefault,
          is_default_in_official_docs: isDefault,
          is_latest_alias: isLatest,
          evidence: evidence.slice(0, 800),
        };
        const existing = candidates.get(modelSlug);
        if (!existing || candidate.confidence_score >= existing.confidence_score) candidates.set(modelSlug, candidate);
      }
    } catch (err: any) {
      errors.push({
        source_url: url,
        error_message: err?.message ?? String(err),
        parser_status: "parser_failed",
        next_action: "Add source-specific parser pattern and keep raw snapshot for manual review.",
      });
    }
  }

  if (candidates.size === 0) {
    errors.push({
      source_url: source.urls[0] ?? "unknown",
      error_message: "Parser returned zero model candidates.",
      parser_status: "empty_result",
      next_action: "Inspect official page structure and add a fallback parser or API list URL.",
    });
  }

  addBaselineCandidates(source, candidates);

  const list = Array.from(candidates.values()).sort((a, b) => a.model_slug.localeCompare(b.model_slug));
  const parserStatus = list.length === 0 ? "empty_result" : errors.length > 0 ? "partial" : "success";
  return {
    source,
    candidates: list,
    models: list.map(toModel),
    rawText: rawParts.join("\n\n---\n\n"),
    errors,
    parserStatus,
    nextAction: errors[0]?.next_action,
  };
}

export async function fetchAllOfficialModelSources() {
  const results: OfficialDiscoveryResult[] = [];
  for (const source of OFFICIAL_MODEL_SOURCES) {
    try {
      results.push(await fetchOfficialModelSource(source));
    } catch (err: any) {
      const message = err?.message ?? String(err);
      console.error(`[${source.id}] official discovery failed: ${message}`);
      results.push({
        source,
        candidates: [],
        models: [],
        rawText: `ERROR: ${message}`,
        errors: [{
          source_url: source.urls[0] ?? "unknown",
          error_message: message,
          parser_status: "parser_failed",
          next_action: "Fix source parser or URL before relying on this source.",
        }],
        parserStatus: "failed",
        nextAction: "Fix source parser or URL before relying on this source.",
      });
    }
  }
  return results;
}
