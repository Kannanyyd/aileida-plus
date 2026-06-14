import { NextRequest, NextResponse } from "next/server";
import { listReviewQueue, reviewFiltersFromUrl } from "@/lib/admin/review-queue";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const rows = await listReviewQueue(reviewFiltersFromUrl(new URL(req.url)));
    return NextResponse.json({ items: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to load review queue" }, { status: 500 });
  }
}
