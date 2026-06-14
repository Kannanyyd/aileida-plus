import { domesticPricingGapAudit } from "@/lib/db/queries";
import { db } from "@/lib/db/client";
import { reviewQueue, sourceFetchLogs } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PricingGapsPage() {
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

  const enriched = rows.map((row) => {
    const review_pending = pending
      .filter((p) => row.provider.includes(p.provider) || p.provider.includes(row.provider))
      .reduce((sum, p) => sum + Number(p.count), 0);
    const source = logs.find((log) => log.source_id.includes(row.provider) || row.provider.includes(log.source_id.replace(/^cn-cny-/, "")));
    return {
      ...row,
      review_pending,
      source_status: source?.status ?? "unknown",
      source_last_fetched_at: source?.fetched_at ?? null,
      source_error_message: source?.error_message ?? null,
      next_action: row.missing_price_model_count > 0 ? "补官方 CNY parser 或人工确认 review_queue" : "保持监控",
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-slate-500">Admin / pricing gaps</p>
        <h1 className="text-2xl font-bold text-white">Domestic CNY pricing gaps</h1>
      </div>
      <div className="glass p-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left py-2">Provider</th>
               <th className="text-right py-2">Models</th>
               <th className="text-right py-2">Native CNY prices</th>
               <th className="text-right py-2">Missing price models</th>
               <th className="text-right py-2">Review pending</th>
               <th className="text-right py-2">Source URL rows</th>
               <th className="text-right py-2">Needs review</th>
               <th className="text-right py-2">Source status</th>
               <th className="text-left py-2">Next action</th>
            </tr>
          </thead>
          <tbody>
            {enriched.map((r) => (
              <tr key={r.provider} className="border-t border-white/5">
                <td className="py-2 text-white">
                  <Link href={`/admin/review-queue?provider=${encodeURIComponent(r.provider)}&status=pending`} className="text-primary hover:underline">
                    {r.provider}
                  </Link>
                </td>
                <td className="py-2 text-right font-mono">{r.models_count}</td>
                <td className="py-2 text-right font-mono text-success">{r.cny_pricing_count}</td>
                <td className="py-2 text-right font-mono text-warning">{r.missing_price_model_count}</td>
                <td className="py-2 text-right font-mono">{r.review_pending}</td>
                <td className="py-2 text-right font-mono">{r.source_url_count}</td>
                <td className="py-2 text-right font-mono">{r.needs_pricing_review_count}</td>
                <td className="py-2 text-right">
                  <span className={r.source_status === "failed" ? "text-danger" : r.source_status === "unknown" ? "text-slate-500" : "text-success"}>{r.source_status}</span>
                  {r.source_last_fetched_at && <div className="font-mono text-[10px] text-slate-500">{r.source_last_fetched_at.toISOString().slice(0, 16)}</div>}
                </td>
                <td className="py-2 text-slate-300">{r.next_action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
