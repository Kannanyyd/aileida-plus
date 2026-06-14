import { NextResponse } from "next/server";
import { getReviewDetail } from "@/lib/admin/review-queue";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const detail = await getReviewDetail(id);
    if (!detail) return NextResponse.json({ error: "Review item not found" }, { status: 404 });
    return NextResponse.json(detail);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to load review item" }, { status: 500 });
  }
}
