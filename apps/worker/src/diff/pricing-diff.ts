/**
 * Diff 引擎：检测新模型 / 价格变化 / 优惠变化
 * 与 DB 协作的写入逻辑见 storage/
 */
import type { NormalizedModel, NormalizedPricing } from "../types.js";

export interface ExistingPricing {
  input_per_1m_usd: number;
  output_per_1m_usd: number;
  confidence_score: number;
  primary_source_id: string;
  source_url: string;
}

export interface DiffResult {
  kind: "new" | "same" | "changed" | "conflict";
  changes: Array<{ field: string; from: number; to: number; pct: number }>;
  reason?: string;
}

const PRICE_FIELDS = [
  "input_per_1m_usd",
  "output_per_1m_usd",
  "input_cached_read_per_1m_usd",
  "input_cached_write_per_1m_usd",
] as const;

/**
 * 对比 new vs existing
 */
export function diffPricing(newP: NormalizedPricing, existing: ExistingPricing | null): DiffResult {
  if (!existing) return { kind: "new", changes: [] };
  const changes: DiffResult["changes"] = [];
  for (const f of PRICE_FIELDS) {
    const a = (existing as unknown as Record<string, number>)[f];
    const b = (newP as unknown as Record<string, number | undefined>)[f];
    if (a == null && b == null) continue;
    if (a == null || b == null) continue;
    if (Math.abs(a - b) < 1e-9) continue;
    const pct = a === 0 ? 100 : ((b - a) / a) * 100;
    changes.push({ field: f, from: a, to: b, pct });
  }
  if (changes.length === 0) return { kind: "same", changes: [] };

  // 冲突判定：新数据置信度 < 0.6 或与已有数据来源不同且差异 > 10%
  const confScore = newP.confidence_score ?? 0.8;
  if (confScore < 0.6) {
    return { kind: "conflict", changes, reason: "low-confidence" };
  }
  const maxPct = Math.max(...changes.map((c) => Math.abs(c.pct)));
  if (maxPct > 10 && newP.source_id !== existing.primary_source_id) {
    return { kind: "conflict", changes, reason: "multi-source-divergence" };
  }
  return { kind: "changed", changes };
}

export interface ModelDiffResult {
  kind: "new" | "same" | "changed";
  changes: Array<{ field: keyof NormalizedModel; from: unknown; to: unknown }>;
}

export function diffModel(newM: NormalizedModel, existing: NormalizedModel | null): ModelDiffResult {
  if (!existing) return { kind: "new", changes: [] };
  const fields: Array<keyof NormalizedModel> = [
    "name",
    "context_length",
    "max_output_tokens",
    "capabilities",
    "status",
  ];
  const changes: ModelDiffResult["changes"] = [];
  for (const f of fields) {
    const a = existing[f] as unknown;
    const b = newM[f] as unknown;
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes.push({ field: f, from: a, to: b });
    }
  }
  return { kind: changes.length === 0 ? "same" : "changed", changes };
}
