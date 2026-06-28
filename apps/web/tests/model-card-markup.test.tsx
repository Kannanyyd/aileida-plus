import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ModelCard } from "../components/model-card";
import type { ModelWithPricing } from "../lib/db/queries";

describe("ModelCard markup", () => {
  it("renders a single link for the card", () => {
    const model = {
      model_id: "model-1",
      model_slug: "test-model",
      model_name: "Test Model",
      provider_name_zh: "Test Provider",
      model_owner_provider: "test-provider",
      currency_native: "USD",
      is_domestic: false,
      pricing_region: "overseas",
      provider_region: "global",
      need_manual_review: false,
      confidence_score: 0.9,
      model_source_confidence: 0.9,
      model_lifecycle_tier: "current_mainstream",
      input_per_1m_usd: 1,
      output_per_1m_usd: 2,
      input_per_1m_cny: 7,
      output_per_1m_cny: 14,
      channel: "official_api",
      is_official: true,
      is_aggregator: false,
      data_quality_flags: [],
      capabilities: ["text"],
      context_length: 128000,
      updated_at: new Date("2026-06-28T00:00:00Z"),
      source_url: "https://example.com/pricing",
      primary_source_id: "official",
    } as unknown as ModelWithPricing;

    const markup = renderToStaticMarkup(<ModelCard m={model} />);

    expect(markup.match(/<a\b/g)).toHaveLength(1);
  });
});
