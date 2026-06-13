import { describe, it, expect } from "vitest";
import { estimateCost, applyTiered, applyCache, applyBatch } from "../src/calculator/index.js";
import type { Pricing } from "../src/schema/index.js";

describe("token-cost helpers", () => {
  it("tiered pricing splits at boundary", () => {
    const rules = [
      { up_to: 1_000_000, input_per_1m: 1, output_per_1m: 2 },
      { up_to: 5_000_000, input_per_1m: 0.5, output_per_1m: 1 },
    ];
    expect(applyTiered(800_000, 1, rules, "input")).toBeCloseTo(0.8, 4);
    expect(applyTiered(2_000_000, 1, rules, "input")).toBeCloseTo(1 + 0.5, 4);
  });

  it("cache reduces effective cost", () => {
    const r = applyCache(1_000_000, 800_000, 1, 0.1);
    expect(r.cost).toBeCloseTo(0.2 + 0.08, 4);
    expect(r.effectivePer1m).toBeCloseTo(0.28, 4);
  });

  it("batch discount multiplies total", () => {
    expect(applyBatch(10, 0.5)).toBe(5);
  });
});

describe("estimateCost", () => {
  const pricing: Pricing = {
    model_id: "test/m1",
    provider_id: "test",
    input_per_1m_usd: 1,
    output_per_1m_usd: 3,
    input_cached_read_per_1m_usd: 0.1,
    currency_native: "USD",
    source_id: "test",
    source_url: "https://example.com/pricing",
    confidence_score: 1,
    need_manual_review: false,
  };

  it("basic in/out cost", () => {
    const r = estimateCost(pricing, { input_tokens: 1_000_000, output_tokens: 500_000 });
    expect(r.total_usd).toBeCloseTo(1 + 1.5, 4);
  });

  it("cache-aware cost", () => {
    const r = estimateCost(
      pricing,
      { input_tokens: 1_000_000, output_tokens: 0, cached_input_tokens: 900_000 },
    );
    expect(r.total_usd).toBeCloseTo(0.1 + 0.09, 4);
  });

  it("batch discount halves cost", () => {
    const p = { ...pricing, batch_discount: 0.5 };
    const r = estimateCost(p, { input_tokens: 1_000_000, output_tokens: 0 }, { useBatch: true });
    expect(r.total_usd).toBeCloseTo(0.5, 4);
  });
});
