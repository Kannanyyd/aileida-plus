import { and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { userReviews, models } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { filterReview } from "@/lib/review-filter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model_slug, usage_scenario, usage_intensity, ratings, pros, cons, suitable_for, not_suitable_for } = body;

    if (!model_slug || !usage_scenario || !ratings?.rating_overall) {
      return NextResponse.json({ error: "缺少必填字段：model_slug, usage_scenario, rating_overall" }, { status: 400 });
    }

    // 查找模型
    const [model] = await db.select().from(models).where(eq(models.slug, model_slug)).limit(1);
    if (!model) {
      return NextResponse.json({ error: "模型不存在" }, { status: 404 });
    }

    // 内容过滤
    const filterResult = filterReview(pros ?? "", cons ?? "");
    const isFlagged = !filterResult.allowed;

    const [inserted] = await db
      .insert(userReviews)
      .values({
        user_id: "anonymous",
        model_id: model.id,
        usage_scenario,
        usage_intensity: usage_intensity ?? "medium",
        rating_overall: ratings.rating_overall?.toString() ?? "0",
        rating_price: ratings.rating_price?.toString() ?? null,
        rating_chinese: ratings.rating_chinese?.toString() ?? null,
        rating_code: ratings.rating_code?.toString() ?? null,
        rating_reasoning: ratings.rating_reasoning?.toString() ?? null,
        rating_speed: ratings.rating_speed?.toString() ?? null,
        rating_stability: ratings.rating_stability?.toString() ?? null,
        rating_api_ease: ratings.rating_api_ease?.toString() ?? null,
        rating_docs_clarity: ratings.rating_docs_clarity?.toString() ?? null,
        rating_payment: ratings.rating_payment?.toString() ?? null,
        pros: pros ?? null,
        cons: cons ?? null,
        suitable_for: suitable_for ?? [],
        not_suitable_for: not_suitable_for ?? [],
        verified_use: false,
        is_approved: !isFlagged,
        is_flagged: isFlagged,
        flag_reason: isFlagged ? filterResult.reason : null,
      })
      .returning({ id: userReviews.id });

    return NextResponse.json({ id: inserted.id, flagged: isFlagged });
  } catch (e) {
    console.error("review POST error:", e);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("model_slug");

  if (!slug) {
    return NextResponse.json({ error: "需要 model_slug" }, { status: 400 });
  }

  const [model] = await db.select().from(models).where(eq(models.slug, slug)).limit(1);
  if (!model) {
    return NextResponse.json({ reviews: [], summary: { count: 0, avgOverall: 0, dims: {} } });
  }

  const rows = await db
    .select()
    .from(userReviews)
    .where(and(eq(userReviews.model_id, model.id), eq(userReviews.is_approved, true)))
    .orderBy(userReviews.created_at);

  const reviews = rows.map((r) => ({
    ...r,
    created_at: r.created_at?.toISOString() ?? "",
  }));

  const summary = {
    count: rows.length,
    avgOverall: rows.length > 0
      ? Math.round((rows.reduce((a, r) => a + Number(r.rating_overall ?? 0), 0) / rows.length) * 10) / 10
      : 0,
    dims: {} as Record<string, number>,
  };

  return NextResponse.json({ reviews, summary });
}
