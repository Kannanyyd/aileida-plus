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

export interface OfficialDiscoveryResult {
  source: OfficialModelSource;
  candidates: OfficialModelCandidate[];
  models: NormalizedModel[];
  rawText: string;
}

const MODEL_TOKEN_RE =
  /\b(?:gpt-[a-z0-9][a-z0-9._-]*|o[0-9][a-z0-9._-]*|claude-[a-z0-9][a-z0-9._-]*|gemini-[a-z0-9][a-z0-9._-]*|grok-[a-z0-9][a-z0-9._-]*|mistral-[a-z0-9][a-z0-9._-]*|magistral-[a-z0-9][a-z0-9._-]*|codestral-[a-z0-9][a-z0-9._-]*|command-[a-z0-9][a-z0-9._-]*|embed-[a-z0-9][a-z0-9._-]*|sonar(?:-[a-z0-9._-]+)?|llama[- ]?[0-9][a-z0-9._ -]*|deepseek-[a-z0-9][a-z0-9._-]*|qwen[0-9.]*[- ][a-z0-9._-]+|glm-[0-9][a-z0-9._-]*|kimi-[a-z0-9][a-z0-9._-]*|moonshot-[a-z0-9][a-z0-9._-]*|abab[0-9.][a-z0-9._-]*|doubao[- ][a-z0-9._-]+|ernie[- ][a-z0-9._-]+|hunyuan[- ][a-z0-9._-]+|step[- ][a-z0-9._-]+)\b/gi;

function stripHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

function normalizeSlug(token: string) {
  return token.trim().replace(/\s+/g, "-").replace(/[:：]/g, "").toLowerCase();
}

function inferFamily(slug: string) {
  return slug.split(/[/-]/).slice(0, 2).join("-");
}

function inferStatus(context: string): OfficialModelCandidate["model_status"] {
  if (/retired|no longer available|下线|停止服务/i.test(context)) return "retired";
  if (/deprecated|legacy|不再推荐|即将下线|废弃/i.test(context)) return "deprecated";
  if (/preview|experimental|实验|预览/i.test(context)) return "preview";
  if (/beta|公测/i.test(context)) return "beta";
  if (/active|recommended|default|stable|正式|推荐/i.test(context)) return "active";
  return "unknown";
}

function inferTier(
  status: OfficialModelCandidate["model_status"],
  context: string,
): OfficialModelCandidate["lifecycle_tier"] {
  if (status === "retired" || status === "deprecated") return "deprecated";
  if (/legacy|older|previous|上一代/i.test(context)) return "previous_generation";
  if (/latest|frontier|most intelligent|recommended|default|最新|主推|推荐|旗舰/i.test(context)) return "current_frontier";
  if (status === "active" || status === "preview" || status === "beta") return "current_mainstream";
  return "unknown";
}

function toModel(c: OfficialModelCandidate): NormalizedModel {
  const status = c.model_status === "retired" || c.model_status === "unknown" ? "active" : c.model_status;
  return {
    external_id: `${c.provider_slug}/${c.model_slug}`,
    provider_slug: c.provider_slug,
    name: c.model_name,
    family: c.family,
    modality: /image|vision|audio|video|imagine/i.test(c.model_name) ? ["text", "image"] : ["text"],
    capabilities: [
      /reason|thinking|o[0-9]|deepseek-r/i.test(c.model_name) ? "reasoning" : "",
      /code|coder|codestral|build/i.test(c.model_name) ? "code" : "",
      /vision|image|multimodal|imagine/i.test(c.model_name) ? "vision" : "",
      /tool|function/i.test(c.evidence) ? "function-call" : "",
    ].filter(Boolean),
    status,
    source_id: c.source_id,
    source_url: c.source_url,
    confidence_score: c.confidence_score,
    need_manual_review: true,
  };
}

export async function fetchOfficialModelSource(source: OfficialModelSource): Promise<OfficialDiscoveryResult> {
  const candidates = new Map<string, OfficialModelCandidate>();
  const rawParts: string[] = [];

  for (const url of source.urls) {
    let raw;
    try {
      raw = await fetchText(url, source.id);
    } catch (err: any) {
      rawParts.push(`URL: ${url}\nERROR: ${err?.message ?? err}`);
      console.error(`[${source.id}] official url failed: ${url} ${err?.message ?? err}`);
      continue;
    }
    const text = stripHtml(raw.body);
    rawParts.push(`URL: ${url}\n${text.slice(0, 12000)}`);
    for (const match of text.matchAll(MODEL_TOKEN_RE)) {
      const token = match[0].replace(/[.,;)]$/g, "");
      const modelSlug = normalizeSlug(token);
      if (modelSlug.length < 4 || modelSlug.length > 90) continue;
      const start = Math.max(0, (match.index ?? 0) - 220);
      const end = Math.min(text.length, (match.index ?? 0) + token.length + 220);
      const evidence = text.slice(start, end);
      const status = inferStatus(evidence);
      const isLatest = /latest|最新/i.test(evidence) || /latest/i.test(modelSlug);
      const isDefault = /default|recommended|start with|主推|推荐/i.test(evidence);
      const candidate: OfficialModelCandidate = {
        provider_slug: source.providerSlug,
        model_slug: modelSlug,
        model_name: token,
        family: inferFamily(modelSlug),
        source_id: source.id,
        source_url: url,
        source_type: "official",
        model_status: status,
        lifecycle_tier: inferTier(status, evidence),
        confidence_score: source.confidence,
        is_recommended_by_official: isDefault,
        is_default_in_official_docs: isDefault,
        is_latest_alias: isLatest,
        evidence: evidence.slice(0, 800),
      };
      const existing = candidates.get(modelSlug);
      if (!existing || candidate.confidence_score >= existing.confidence_score) candidates.set(modelSlug, candidate);
    }
  }

  const list = Array.from(candidates.values());
  return {
    source,
    candidates: list,
    models: list.map(toModel),
    rawText: rawParts.join("\n\n---\n\n"),
  };
}

export async function fetchAllOfficialModelSources() {
  const results: OfficialDiscoveryResult[] = [];
  for (const source of OFFICIAL_MODEL_SOURCES) {
    try {
      results.push(await fetchOfficialModelSource(source));
    } catch (err: any) {
      console.error(`[${source.id}] official discovery failed: ${err?.message ?? err}`);
      results.push({ source, candidates: [], models: [], rawText: `ERROR: ${err?.message ?? err}` });
    }
  }
  return results;
}
