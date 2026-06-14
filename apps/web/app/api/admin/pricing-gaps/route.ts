import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { domesticPricingGapAudit } from "@/lib/db/queries";
import { db } from "@/lib/db/client";
import { reviewQueue, sourceFetchLogs } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await domesticPricingGapAudit();
    const pending = await db
      .select({
        provider: sql<string>`coalesce(${reviewQueue.payload}->>'provider_slug', ${reviewQueue.payload}->>'provider', ${reviewQueue.payload}->>'model_owner_provider', ${reviewQueue.payload}->>'source_provider', 'unknown')`,
        count: sql<number>`count(*)::int`,
      })
      .from(reviewQueue)
      .where(sql`${reviewQueue.status} = 'pending'`)
      .groupBy(sql`coalesce(${reviewQueue.payload}->>'provider_slug', ${reviewQueue.payload}->>'provider', ${reviewQueue.payload}->>'model_owner_provider', ${reviewQueue.payload}->>'source_provider', 'unknown')`);
    const logs = await db
      .select({
        source_id: sourceFetchLogs.source_id,
        status: sourceFetchLogs.status,
        fetched_at: sourceFetchLogs.fetched_at,
        error_message: sourceFetchLogs.error_message,
      })
      .from(sourceFetchLogs)
      .orderBy(desc(sourceFetchLogs.fetched_at))
      .limit(80);
    const withMeta = rows.map((row) => {
      const pendingCount = pending
        .filter((p) => row.provider.includes(p.provider) || p.provider.includes(row.provider))
        .reduce((sum, p) => sum + Number(p.count), 0);
      const source = logs.find((log) => log.source_id.includes(row.provider) || row.provider.includes(log.source_id.replace(/^cn-cny-/, "")));
      return {
        ...row,
        review_pending: pendingCount,
        source_status: source?.status ?? "unknown",
        source_last_fetched_at: source?.fetched_at ?? null,
        source_error_message: source?.error_message ?? null,
        next_action: row.missing_price_model_count > 0 ? "补官方 CNY parser 或人工确认 review_queue" : "保持监控",
      };
    });
    return NextResponse.json({ items: withMeta });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Failed to load pricing gaps" }, { status: 500 });
  }
}
