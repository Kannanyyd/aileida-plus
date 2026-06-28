import { resolveModelIdentity, extractModelFamily } from './family-resolver';
import { compareVersions, parseModelVersion, type ParsedVersion } from './version-parser';

export type ModelLifecycleTier =
  | 'current_frontier'
  | 'current_mainstream'
  | 'previous_generation'
  | 'legacy'
  | 'deprecated'
  | 'unknown';

export interface ModelLifecycleInput {
  providerSlug: string;
  modelSlug: string;
  modelName?: string;
  family?: string | null;
  modelFamily?: string | null;
  status?: string;
  releaseDate?: Date | string | null;
  updatedAt?: Date | string | null;
  officialUpdatedAt?: Date | string | null;
  contextLength?: number | null;
  capabilities?: string[] | null;
  confidenceScore?: number | null;
  modelSourceConfidence?: number | null;
  isOfficial?: boolean | null;
  isRecommendedByOfficial?: boolean | null;
  isDefaultInOfficialDocs?: boolean | null;
  isOfficialCurrent?: boolean | null;
  isOfficialRecommended?: boolean | null;
  modelRecencyStatus?: string | null;
  officialCurrentCatalogMatch?: boolean | null;
}

export interface FamilyModelEntry {
  modelId: string;
  providerSlug: string;
  modelSlug: string;
  modelName?: string;
  releaseDate?: Date | string | null;
  version?: ParsedVersion | null;
}

const TIER_AGE_THRESHOLDS = {
  frontier_max_months: 6,
  mainstream_max_months: 18,
  previous_max_months: 36,
};

function parseDateToMs(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

function modelAgeMonths(input: ModelLifecycleInput): number | null {
  const date = input.releaseDate ?? input.officialUpdatedAt ?? input.updatedAt;
  const time = parseDateToMs(date);
  if (time == null) return null;
  return (Date.now() - time) / (1000 * 60 * 60 * 24 * 30);
}

function hasSufficientCapabilityEvidence(input: ModelLifecycleInput): boolean {
  const caps = input.capabilities ?? [];
  const confidence = Math.max(input.confidenceScore ?? 0, input.modelSourceConfidence ?? 0);
  return caps.length >= 2 && confidence >= 0.6;
}

export function detectLifecycleTier(
  input: ModelLifecycleInput,
  familyModels: FamilyModelEntry[] = [],
): ModelLifecycleTier {
  if (input.status === 'deprecated') return 'deprecated';

  if (input.officialCurrentCatalogMatch && (input.isOfficialCurrent || input.isOfficialRecommended)) {
    if (input.isOfficialRecommended) return 'current_frontier';
    return 'current_mainstream';
  }

  if (input.isRecommendedByOfficial || input.isDefaultInOfficialDocs) {
    return 'current_mainstream';
  }

  if (input.modelRecencyStatus === 'current' || input.modelRecencyStatus === 'recent') {
    const age = modelAgeMonths(input);
    if (age == null || age <= TIER_AGE_THRESHOLDS.frontier_max_months) {
      if (hasSufficientCapabilityEvidence(input) && (input.isOfficial || (input.confidenceScore ?? 0) >= 0.85)) {
        return 'current_frontier';
      }
      return 'current_mainstream';
    }
    if (age <= TIER_AGE_THRESHOLDS.mainstream_max_months) {
      return 'current_mainstream';
    }
  }

  if (familyModels.length > 0) {
    const identity = resolveModelIdentity(input.providerSlug, input.modelSlug, input.family ?? input.modelFamily);
    const sameFamily = familyModels.filter((m) => {
      const mIdentity = resolveModelIdentity(m.providerSlug, m.modelSlug);
      return mIdentity.provider === identity.provider && mIdentity.family === identity.family;
    });

    if (sameFamily.length > 0) {
      const myVersion = identity.version ?? parseModelVersion(input.modelSlug);
      let hasNewer = false;
      let newestVersion: ParsedVersion | null = null;

      for (const m of sameFamily) {
        const v = m.version ?? parseModelVersion(m.modelSlug);
        if (!v) continue;
        if (!newestVersion || compareVersions(v, newestVersion) > 0) {
          newestVersion = v;
        }
      }

      if (myVersion && newestVersion && compareVersions(newestVersion, myVersion) > 0) {
        hasNewer = true;
      }

      if (!myVersion && sameFamily.length > 1) {
        hasNewer = true;
      }

      if (hasNewer) {
        const age = modelAgeMonths(input);
        if (age != null && age > TIER_AGE_THRESHOLDS.previous_max_months) {
          return 'legacy';
        }
        return 'previous_generation';
      }
    }
  }

  if ((input.status === 'preview' || input.status === 'beta') && !input.isRecommendedByOfficial) {
    return 'unknown';
  }

  const age = modelAgeMonths(input);
  const confidence = Math.max(input.confidenceScore ?? 0, input.modelSourceConfidence ?? 0);

  if (age != null) {
    if (age > TIER_AGE_THRESHOLDS.previous_max_months) return 'legacy';
    if (age > TIER_AGE_THRESHOLDS.mainstream_max_months) return 'previous_generation';
    if (age <= TIER_AGE_THRESHOLDS.frontier_max_months && confidence >= 0.7) {
      if (input.isOfficial && hasSufficientCapabilityEvidence(input)) return 'current_frontier';
      if (confidence >= 0.65) return 'current_mainstream';
    }
  }

  if (confidence < 0.55) return 'unknown';
  if (!input.releaseDate && !input.updatedAt && confidence < 0.75) return 'unknown';

  return 'unknown';
}

export function hasNewerFamilyModel(
  input: ModelLifecycleInput,
  familyModels: FamilyModelEntry[] = [],
): { hasNewer: boolean; supersededBy?: string } {
  const identity = resolveModelIdentity(input.providerSlug, input.modelSlug, input.family ?? input.modelFamily);
  const sameFamily = familyModels.filter((m) => {
    if (m.modelSlug.toLowerCase() === input.modelSlug.toLowerCase()) return false;
    const mIdentity = resolveModelIdentity(m.providerSlug, m.modelSlug);
    return mIdentity.provider === identity.provider && mIdentity.family === identity.family;
  });

  if (sameFamily.length === 0) return { hasNewer: false };

  const myVersion = identity.version ?? parseModelVersion(input.modelSlug);
  let newestEntry: FamilyModelEntry | null = null;
  let newestVersion: ParsedVersion | null = null;

  for (const m of sameFamily) {
    const v = m.version ?? parseModelVersion(m.modelSlug);
    if (!v) continue;
    if (!newestVersion || compareVersions(v, newestVersion) > 0) {
      newestVersion = v;
      newestEntry = m;
    }
  }

  if (myVersion && newestVersion && compareVersions(newestVersion, myVersion) > 0) {
    return { hasNewer: true, supersededBy: newestEntry?.modelSlug };
  }

  return { hasNewer: false };
}

export function isModelObsoleteByName(modelSlug: string, modelName: string = ''): boolean {
  const text = `${modelSlug} ${modelName}`.toLowerCase();
  const obsoletePatterns = [
    /\bgpt-3\.5\b/,
    /\btext-davinci\b/,
    /\bdavinci\b/,
    /\bbabbage\b/,
    /\bcurie\b/,
    /\bada\b/,
    /\bclaude-2\b/,
    /\bclaude-instant\b/,
    /\bgemini-1\.0\b/,
    /\bllama-2\b/,
    /\bqwen1\b/,
    /\bchatglm[23]\b/,
    /\bv0\b/,
    /\blegacy\b/,
    /\bold\b/,
  ];
  return obsoletePatterns.some((p) => p.test(text));
}

export function isModelPreviousGenerationByName(modelSlug: string, modelName: string = ''): boolean {
  if (isModelObsoleteByName(modelSlug, modelName)) return true;
  const text = `${modelSlug} ${modelName}`.toLowerCase();
  const previousPatterns = [
    /\bgpt-4\b(?!-\d)/,
    /\bgpt-4o\b(?!-\d)/,
    /\bgpt-4-turbo\b/,
    /\bclaude-3\b/,
    /\bgemini-1\.5\b/,
    /\bgemini-2\.5\b/,
    /\bllama-3\b(?!-\d)/,
    /\bqwen2(?:\.5)?\b/,
    /\bdeepseek-v2\b/,
    /\bdeepseek-r1\b/,
    /\bdoubao-1\.5\b/,
  ];
  return previousPatterns.some((p) => p.test(text));
}
