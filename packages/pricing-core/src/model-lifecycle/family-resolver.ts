import { parseModelVersion } from './version-parser';

const SUFFIX_STRIP_PATTERNS = [
  /-(latest|preview|beta|instruct|thinking|reasoning|non-reasoning|fast|turbo|mini|nano|online)$/i,
  /-\d{4}[-_]\d{2}[-_]\d{2}$/i,
  /-\d{4,8}$/i,
  /-(v\d+)$/i,
];

const FAMILY_PREFIX_RULES: Array<{ pattern: RegExp; extract: (match: RegExpMatchArray) => string }> = [
  { pattern: /^(gpt-\d+)/i, extract: (m) => m[1].toLowerCase() },
  { pattern: /^(gpt-?o\d*)/i, extract: (m) => m[1].toLowerCase().replace('gpt-o', 'gpt-o') },
  { pattern: /^(claude-[a-z]+-\d+)/i, extract: (m) => m[1].toLowerCase() },
  { pattern: /^(claude-\d+)/i, extract: (m) => m[1].toLowerCase() },
  { pattern: /^(gemini-\d+(?:\.\d+)?)/i, extract: (m) => m[1].toLowerCase() },
  { pattern: /^(grok-\d+)/i, extract: (m) => m[1].toLowerCase() },
  { pattern: /^(llama-\d+)/i, extract: (m) => m[1].toLowerCase() },
  { pattern: /^(qwen\d+(?:\.\d+)?)/i, extract: (m) => m[1].toLowerCase() },
  { pattern: /^(deepseek-[a-z]+)/i, extract: (m) => m[1].toLowerCase() },
  { pattern: /^(mistral-(?:small|medium|large|nemo))/i, extract: (m) => m[1].toLowerCase() },
  { pattern: /^(kimi-[a-z0-9.]+)/i, extract: (m) => m[1].toLowerCase().replace(/\.\d+$/, '') },
  { pattern: /^(glm-\d+)/i, extract: (m) => m[1].toLowerCase() },
  { pattern: /^(doubao[-a-z]*\d*(?:\.\d+)?)/i, extract: (m) => m[1].toLowerCase() },
  { pattern: /^(ernie-\d+(?:\.\d+)?)/i, extract: (m) => m[1].toLowerCase() },
  { pattern: /^(o\d+)/i, extract: (m) => m[1].toLowerCase() },
];

export interface ModelIdentity {
  provider: string;
  slug: string;
  family: string;
  version: ReturnType<typeof parseModelVersion>;
}

export function stripVersionSuffixes(slug: string): string {
  let cleaned = slug.toLowerCase();
  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of SUFFIX_STRIP_PATTERNS) {
      const before = cleaned;
      cleaned = cleaned.replace(pattern, '');
      if (cleaned !== before) changed = true;
    }
  }
  return cleaned;
}

export function extractModelFamily(slug: string, explicitFamily?: string | null): string {
  if (explicitFamily) return explicitFamily.toLowerCase();

  const baseSlug = slug.toLowerCase().split('/').pop() ?? slug.toLowerCase();
  const stripped = stripVersionSuffixes(baseSlug);

  for (const rule of FAMILY_PREFIX_RULES) {
    const match = stripped.match(rule.pattern);
    if (match) {
      return rule.extract(match);
    }
  }

  const parts = stripped.split(/[-_]/);
  if (parts.length >= 2) {
    const lastNumIdx = parts.findIndex((p) => /^\d/.test(p) && parseModelVersion(p));
    if (lastNumIdx > 0) {
      return parts.slice(0, lastNumIdx).join('-');
    }
  }

  return stripped.split(/[-_]/).slice(0, 2).join('-');
}

export function resolveModelIdentity(providerSlug: string, modelSlug: string, explicitFamily?: string | null): ModelIdentity {
  const normalizedProvider = providerSlug.toLowerCase();
  const normalizedSlug = modelSlug.toLowerCase();
  const family = extractModelFamily(normalizedSlug, explicitFamily);
  const version = parseModelVersion(normalizedSlug);

  return {
    provider: normalizedProvider,
    slug: normalizedSlug,
    family,
    version,
  };
}

export function getCanonicalFamilyKey(providerSlug: string, modelSlug: string, explicitFamily?: string | null, officialCanonicalSlug?: string | null): string {
  if (officialCanonicalSlug) {
    const officialFamily = extractModelFamily(officialCanonicalSlug);
    return `${providerSlug.toLowerCase()}/${officialFamily}`;
  }
  const identity = resolveModelIdentity(providerSlug, modelSlug, explicitFamily);
  return `${identity.provider}/${identity.family}`;
}
