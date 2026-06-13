import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { listModels } from "@/lib/db/queries";
import { rank } from "@/lib/rank/score";

export const revalidate = 600;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  const models = await listModels({ limit: 500 });
  const ranked = rank(models, type as never);
  return NextResponse.json({
    type,
    count: ranked.length,
    items: ranked.map((r, i) => ({
      rank: i + 1,
      model_slug: r.model.model_slug,
      model_name: r.model.model_name,
      provider: r.model.provider_slug,
      provider_name: r.model.provider_name_zh,
      input_per_1m_usd: r.model.input_per_1m_usd,
      output_per_1m_usd: r.model.output_per_1m_usd,
      context_length: r.model.context_length,
      score: r.score,
    })),
  });
}
