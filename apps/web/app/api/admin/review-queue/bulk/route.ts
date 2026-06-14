import { NextRequest, NextResponse } from "next/server";
import { setReviewStatus } from "@/lib/admin/review-queue";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["ignored", "rejected", "needs_more_info", "resolved"]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    const status = String(body.status ?? "");
    if (!ids.length) return NextResponse.json({ error: "ids is required" }, { status: 400 });
    if (!ALLOWED.has(status)) return NextResponse.json({ error: "Unsupported bulk status" }, { status: 400 });
    const results = [];
    for (const id of ids.slice(0, 100)) {
      results.push(await setReviewStatus(id, status, body.message));
    }
    return NextResponse.json({ ok: true, count: results.length, results });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Bulk operation failed" }, { status: 400 });
  }
}
