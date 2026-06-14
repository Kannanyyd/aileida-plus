import Link from "next/link";
import { notFound } from "next/navigation";
import { getReviewDetail } from "@/lib/admin/review-queue";
import { Tag } from "@/components/tag";
import { ReviewActions } from "./actions";

export const dynamic = "force-dynamic";

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getReviewDetail(id);
  if (!detail) return notFound();
  const payload = (detail.item.latest_payload ?? detail.item.payload) as Record<string, any>;
  const sourceUrl = payload?.source_url;

  return (
    <div className="space-y-5">
      <header>
        <Link href="/admin/review-queue" className="text-xs text-primary hover:underline">Back to review queue</Link>
        <h1 className="mt-1 text-2xl font-bold text-white">Review item</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Tag variant="warning">{detail.item.reason}</Tag>
          <Tag variant={detail.item.status === "pending" ? "warning" : "success"}>{detail.item.status}</Tag>
          <span className="font-mono text-slate-500">{detail.item.id}</span>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-4">
          <div className="glass p-4">
            <p className="text-sm font-semibold text-white">Candidate payload</p>
            {sourceUrl && (
              <a href={sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-primary hover:underline">
                {sourceUrl}
              </a>
            )}
            <pre className="mt-3 max-h-[520px] overflow-auto rounded bg-black/30 p-3 text-xs text-slate-300">{pretty(payload)}</pre>
          </div>

          <div className="glass p-4">
            <p className="text-sm font-semibold text-white">Existing pricing for model</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-slate-500">
                  <tr>
                    <th className="text-left py-2">Currency</th>
                    <th className="text-left py-2">Region</th>
                    <th className="text-left py-2">Channel</th>
                    <th className="text-right py-2">Input USD</th>
                    <th className="text-right py-2">Output USD</th>
                    <th className="text-left py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.existingPricing.map((p) => (
                    <tr key={p.id} className="border-t border-white/5">
                      <td className="py-2">{p.currency_native}</td>
                      <td className="py-2">{p.region}</td>
                      <td className="py-2">{p.channel}</td>
                      <td className="py-2 text-right font-mono">{p.input_per_1m_usd ?? "-"}</td>
                      <td className="py-2 text-right font-mono">{p.output_per_1m_usd ?? "-"}</td>
                      <td className="py-2 max-w-[260px] truncate">{p.source_url}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <ReviewActions id={id} payload={payload} />
          <div className="glass p-4">
            <p className="text-sm font-semibold text-white">Source snapshots</p>
            <div className="mt-3 space-y-3">
              {detail.snapshots.length === 0 ? (
                <p className="text-xs text-slate-500">No matching snapshot found.</p>
              ) : detail.snapshots.map((s) => (
                <div key={s.id} className="rounded border border-white/10 bg-white/3 p-3">
                  <p className="font-mono text-[11px] text-slate-500">{s.source_id} · {s.fetched_at?.toISOString()}</p>
                  <pre className="mt-2 max-h-52 overflow-auto text-[11px] text-slate-300">{s.raw_content}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
