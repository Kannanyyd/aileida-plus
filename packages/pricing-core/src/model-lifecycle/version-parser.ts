export interface ParsedVersion {
  major: number;
  minor?: number;
  patch?: number;
  label?: string;
  raw: string;
}

const VERSION_PATTERNS = [
  /(\d+)[._](\d+)(?:[._](\d+))?/,
  /v?(\d+)(?:[._-](\d+))?(?:[._-](\d+))?/,
  /-(\d+)(?:[._-](\d+))?(?:[._-](\d+))?$/,
];

const LATEST_ALIAS_PATTERN = /(?:^|[-_/])(latest|current|stable)(?:$|[-_/])/i;

export function parseModelVersion(slug: string): ParsedVersion | null {
  if (!slug) return null;

  const lowerSlug = slug.toLowerCase();

  if (LATEST_ALIAS_PATTERN.test(lowerSlug)) {
    return { major: Number.MAX_SAFE_INTEGER, raw: 'latest', label: 'latest' };
  }

  for (const pattern of VERSION_PATTERNS) {
    const match = lowerSlug.match(pattern);
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = match[2] ? parseInt(match[2], 10) : undefined;
      const patch = match[3] ? parseInt(match[3], 10) : undefined;
      if (!isNaN(major) && major > 0) {
        return {
          major,
          minor,
          patch,
          raw: match[0],
        };
      }
    }
  }

  return null;
}

export function compareVersions(a: ParsedVersion | null, b: ParsedVersion | null): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  if (a.label === 'latest' && b.label !== 'latest') return 1;
  if (b.label === 'latest' && a.label !== 'latest') return -1;

  if (a.major !== b.major) return a.major - b.major;
  const aMinor = a.minor ?? 0;
  const bMinor = b.minor ?? 0;
  if (aMinor !== bMinor) return aMinor - bMinor;
  const aPatch = a.patch ?? 0;
  const bPatch = b.patch ?? 0;
  return aPatch - bPatch;
}

export function isNewerVersion(a: string, b: string): boolean {
  const va = parseModelVersion(a);
  const vb = parseModelVersion(b);
  return compareVersions(va, vb) > 0;
}
