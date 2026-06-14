import { NextResponse } from "next/server";
import { setReviewStatus } from "@/lib/admin/review-queue";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const item = await setReviewStatus(id, "needs_more_info", body.message);
    return NextResponse.json({ item });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to mark review item" }, { status: 400 });
  }
}
