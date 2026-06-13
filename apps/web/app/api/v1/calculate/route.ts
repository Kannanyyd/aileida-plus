import { NextRequest, NextResponse } from "next/server";
import { listModels } from "@/lib/db/queries";
import { estimateCost, type Pricing } from "@pricing/core";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { input_tokens = 0, output_tokens = 0, cache_hit_ratio = 0, batch = false, limit = 30 } = body ?? {};
  const usage = {
    input_tokens: Number(input_tokens),
    output_tokens: Number(output_tokens),
    cached_input_tokens: Math.floor(Number(input_tokens) * (Number(cache_hit_ratio) / 100)),
  };
  const models = await listModels({ limit: 500 });
  const ranked = models
    .filter((m) => !m.need_manual_review && m.confidence_score >= 0.7)
    .map((m) => {
      const pricing: Pricing = {
        model_id: m.model_slug,
        input_per_1m_usd: m.input_per_1m_usd ?? 0,
        output_per_1m_usd: m.output_per_1m_usd ?? 0,
        input_cached_read_per_1m_usd: m.input_cached_read_per_1m_usd ?? undefined,
        currency_native: "USD",
        source_id: m.primary_source_id,
        source_url: m.source_url,
        confidence_score: m.confidence_score,
        need_manual_review: m.need_manual_review,
      };
      const r = estimateCost(pricing, usage, { useBatch: !!batch });
      return { model: m, estimate: r };
    })
    .sort((a, b) => a.estimate.total_usd - b.estimate.total_usd)
    .slice(0, limit);

  return NextResponse.json({
    usage,
    count: ranked.length,
    results: ranked.map((r) => ({
      model_slug: r.model.model_slug,
      model_name: r.model.model_name,
      provider: r.model.provider_slug,
      provider_name: r.model.provider_name_zh,
      total_usd: r.estimate.total_usd,
      effective_input_per_1m: r.estimate.effective_unit_input,
      effective_output_per_1m: r.estimate.effective_unit_output,
      breakdown: r.estimate.breakdown,
      source_url: r.model.source_url,
    })),
  });
}
