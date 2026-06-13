import { NextRequest, NextResponse } from "next/server";
import { listModels } from "@/lib/db/queries";
import { db } from "@/lib/db/client";
import { modelStrengths } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import {
  generateRecommendations,
  type RecommendInput,
  type ScorableModel,
} from "@pricing/core";

export async function POST(req: NextRequest) {
  try {
    const body: RecommendInput = await req.json();
    if (!body.scenario) {
      return NextResponse.json({ error: "缺少必填字段：scenario" }, { status: 400 });
    }

    const models = await listModels({ limit: 200 });
    if (models.length === 0) {
      return NextResponse.json({ error: "暂无模型数据" }, { status: 503 });
    }

    // 构建 ScorableModel 列表
    const scorable: ScorableModel[] = models.map((m) => ({
      modelId: m.model_id,
      modelName: m.model_name,
      providerName: m.provider_name_zh,
      slug: m.model_slug,
      inputUsd: m.input_per_1m_usd ?? 0,
      outputUsd: m.output_per_1m_usd ?? 0,
      cachedReadUsd: m.input_cached_read_per_1m_usd ?? undefined,
      contextLength: m.context_length ?? 131072,
      capabilities: m.capabilities ?? [],
      strengths: [],
      confidenceScore: m.confidence_score,
      hasPromotion: false,
    }));

    const result = generateRecommendations(body, scorable);
    return NextResponse.json(result);
  } catch (e) {
    console.error("recommend API error:", e);
    return NextResponse.json({ error: "推荐计算失败" }, { status: 500 });
  }
}
