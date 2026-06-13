import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { listModels } from "@/lib/db/queries";

export const revalidate = 60;

export async function GET() {
  const models = await listModels({ limit: 500 });
  return NextResponse.json({
    count: models.length,
    models: models.map((m) => ({
      slug: m.model_slug,
      name: m.model_name,
      provider: m.provider_slug,
      provider_name: m.provider_name_zh,
      region: m.provider_region,
      input_per_1m_usd: m.input_per_1m_usd,
      output_per_1m_usd: m.output_per_1m_usd,
      cached_read_per_1m_usd: m.input_cached_read_per_1m_usd,
      context_length: m.context_length,
      capabilities: m.capabilities,
      modality: m.modality,
      confidence_score: m.confidence_score,
      need_manual_review: m.need_manual_review,
      source_url: m.source_url,
      primary_source_id: m.primary_source_id,
      updated_at: m.updated_at,
    })),
  });
}
