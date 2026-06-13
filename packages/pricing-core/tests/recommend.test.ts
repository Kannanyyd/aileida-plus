import { describe, it, expect } from "vitest";
import { computeRecommendScore, generateRecommendations, ALL_STRENGTHS, type RecommendInput, type ScorableModel } from "../src/calculator/recommend.js";

const makeModel = (overrides: Partial<ScorableModel> = {}): ScorableModel => ({
  modelId: "test-1",
  modelName: "Test Model",
  providerName: "Test Provider",
  slug: "test/test-model",
  inputUsd: 0.15,
  outputUsd: 0.60,
  contextLength: 131072,
  capabilities: ["text"],
  strengths: ["chinese-writing", "low-cost", "document-summary"],
  confidenceScore: 0.95,
  hasPromotion: false,
  ...overrides,
});

const baseInput: RecommendInput = {
  scenario: "写作",
  intensity: "medium",
  budget: "balanced",
  techRequirements: [],
  quality: "basic",
};

describe("computeRecommendScore", () => {
  it("gives high score to writing model for writing scenario", () => {
    const model = makeModel({ strengths: ["chinese-writing", "english-writing", "document-summary"] });
    const score = computeRecommendScore(baseInput, model);
    const weakModel = makeModel({ strengths: ["code-generation"], modelId: "code-model" });
    const weakScore = computeRecommendScore(baseInput, weakModel);
    expect(score).toBeGreaterThan(weakScore);
  });

  it("gives high score to cheap model for cheapest budget", () => {
    const cheap = makeModel({ inputUsd: 0.01, outputUsd: 0.04, strengths: ["chinese-writing", "low-cost"], modelId: "cheap" });
    const expensive = makeModel({ inputUsd: 15, outputUsd: 60, strengths: ["chinese-writing"], modelId: "expensive" });
    const input: RecommendInput = { ...baseInput, budget: "cheapest" };
    expect(computeRecommendScore(input, cheap)).toBeGreaterThan(computeRecommendScore(input, expensive));
  });

  it("gives high score to reasoning model for reasoning quality", () => {
    const reasoner = makeModel({ strengths: ["complex-reasoning", "math-reasoning", "code-generation"], modelId: "reasoner" });
    const basic = makeModel({ strengths: ["low-cost", "customer-qa"], modelId: "basic" });
    const input: RecommendInput = { ...baseInput, scenario: "代码生成 / 代码解释", quality: "strong-reasoning", techRequirements: ["function-call"] };
    expect(computeRecommendScore(input, reasoner)).toBeGreaterThan(computeRecommendScore(input, basic));
  });

  it("scores at least 0", () => {
    const empty = makeModel({ strengths: [], capabilities: [], contextLength: 0 });
    const score = computeRecommendScore(baseInput, empty);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("generateRecommendations", () => {
  it("returns 3 plans", () => {
    const models = [
      makeModel({ inputUsd: 0.01, outputUsd: 0.04, strengths: ["chinese-writing", "low-cost"], modelId: "ch", modelName: "Cheap" }),
      makeModel({ inputUsd: 0.15, outputUsd: 0.60, strengths: ["chinese-writing", "document-summary"], modelId: "mid", modelName: "Mid" }),
      makeModel({ inputUsd: 3, outputUsd: 15, strengths: ["chinese-writing", "complex-reasoning", "enterprise-stability"], modelId: "hi", modelName: "High" }),
    ];
    const result = generateRecommendations(baseInput, models);
    expect(result.budget.length).toBeGreaterThan(0);
    expect(result.balanced.length).toBeGreaterThan(0);
    expect(result.premium.length).toBeGreaterThan(0);
    expect(result.disclaimer.length).toBeGreaterThan(0);
  });
});

describe("ALL_STRENGTHS", () => {
  it("has at least 20 entries", () => {
    expect(ALL_STRENGTHS.length).toBeGreaterThanOrEqual(20);
  });

  it("has unique slugs", () => {
    const slugs = ALL_STRENGTHS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
