import { NextRequest, NextResponse } from "next/server";
import { approvePricingReview, setReviewStatus } from "@/lib/admin/review-queue";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const entityType = body.entity_type ?? body.entityType;
    const result = entityType === "model" ? await setReviewStatus(id, "approved", body.message) : await approvePricingReview(id, body);
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Approve failed" }, { status: 400 });
  }
}
