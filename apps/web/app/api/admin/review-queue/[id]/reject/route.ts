import { NextRequest, NextResponse } from "next/server";
import { setReviewStatus } from "@/lib/admin/review-queue";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await setReviewStatus(id, "rejected", body.message);
    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Reject failed" }, { status: 400 });
  }
}
