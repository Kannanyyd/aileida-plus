import Link from "next/link";
import { listReviewQueue } from "@/lib/admin/review-queue";
import { Tag } from "@/components/tag";
import { BulkActions } from "./bulk-actions";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const value = (key: string) => (Array.isArray(sp[key]) ? sp[key]?.[0] : sp[key]) as string | undefined;
  const rows = await listReviewQueue({
    reason: value("reason"),
    provider: value("provider"),
    canonical_provider: value("canonical_provider"),
    model_family: value("model_family"),
    currency: value("currency"),
    region: value("region"),
    source_provider: value("source_provider"),
    selling_platform_provider: value("selling_platform_provider"),
    status: value("status") ?? "pending",
    has_source_url: value("has_source_url"),
    has_snapshot: value("has_snapshot"),
    confidence_min: value("confidence_min") ? Number(value("confidence_min")) : undefined,
    created_from: value("created_from"),
    created_to: value("created_to"),
    q: value("q"),
    sort: value("sort"),
    limit: 200,
  });

  const filters = [
    "reason",
    "provider",
    "canonical_provider",
    "model_family",
    "currency",
    "region",
    "source_provider",
    "selling_platform_provider",
    "status",
    "confidence_min",
    "created_from",
    "created_to",
  ];
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs text-slate-500">Admin / review queue</p>
        <h1 className="text-2xl font-bold text-white">Review queue</h1>
      </header>

      <form className="glass p-3 grid gap-2 md:grid-cols-4 text-xs">
        {filters.map((key) => (
          <label key={key} className="space-y-1">
            <span className="text-slate-500">{key}</span>
            <input name={key} defaultValue={value(key) ?? ""} className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-white" />
          </label>
        ))}
        <label className="space-y-1">
          <span className="text-slate-500">has_source_url</span>
          <select name="has_source_url" defaultValue={value("has_source_url") ?? ""} className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-white">
            <option value="">any</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-slate-500">has_snapshot</span>
          <select name="has_snapshot" defaultValue={value("has_snapshot") ?? ""} className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-white">
            <option value="">any</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-slate-500">q</span>
          <input name="q" defaultValue={value("q") ?? ""} className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-white" />
        </label>
        <label className="space-y-1">
          <span className="text-slate-500">sort</span>
          <select name="sort" defaultValue={value("sort") ?? ""} className="w-full rounded border border-white/10 bg-black/20 px-2 py-1.5 text-white">
            <option value="">high impact</option>
            <option value="occurrence_desc">occurrence desc</option>
            <option value="confidence_desc">confidence desc</option>
            <option value="confidence_asc">confidence asc</option>
            <option value="created_desc">created desc</option>
            <option value="last_seen_desc">last seen desc</option>
          </select>
        </label>
        <div className="flex items-end">
          <button className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white">Filter</button>
        </div>
      </form>

      <BulkActions ids={rows.map((row) => row.id)} />

      <div className="glass overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-white/3 text-slate-500">
            <tr>
              <th className="text-left px-3 py-2">Pick</th>
              <th className="text-left px-3 py-2">Reason</th>
              <th className="text-left px-3 py-2">Provider</th>
              <th className="text-left px-3 py-2">Canonical</th>
              <th className="text-left px-3 py-2">Model</th>
              <th className="text-left px-3 py-2">Currency</th>
              <th className="text-left px-3 py-2">Region</th>
              <th className="text-right px-3 py-2">Confidence</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Seen</th>
              <th className="text-left px-3 py-2">Dedupe</th>
              <th className="text-left px-3 py-2">Source</th>
              <th className="text-left px-3 py-2">Last seen</th>
              <th className="text-left px-3 py-2">Created</th>
              <th className="text-right px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/5">
                <td className="px-3 py-2">
                  <input data-row-review-id={row.id} type="checkbox" className="h-3 w-3" />
                </td>
                <td className="px-3 py-2"><Tag variant="warning">{row.reason}</Tag></td>
                <td className="px-3 py-2 text-white">{row.provider || "-"}</td>
                <td className="px-3 py-2 text-slate-300">{row.canonical_provider || "-"}</td>
                <td className="px-3 py-2 max-w-[260px] truncate text-slate-300">{row.model || "-"}</td>
                <td className="px-3 py-2">{row.currency || "-"}</td>
                <td className="px-3 py-2">{row.region || "-"}</td>
                <td className="px-3 py-2 text-right font-mono">{Number(row.confidence ?? 0).toFixed(2)}</td>
                <td className="px-3 py-2"><Tag variant={row.status === "pending" ? "warning" : "success"}>{row.status}</Tag></td>
                <td className="px-3 py-2 text-right font-mono">{row.occurrence_count ?? 1}</td>
                <td className="px-3 py-2 max-w-[120px] truncate font-mono text-slate-500">{row.dedupe_key || "-"}</td>
                <td className="px-3 py-2 max-w-[180px] truncate text-slate-400">{row.source_url || "-"}</td>
                <td className="px-3 py-2 font-mono text-slate-500">{row.last_seen_at?.toISOString().slice(0, 16)}</td>
                <td className="px-3 py-2 font-mono text-slate-500">{row.created_at?.toISOString().slice(0, 16)}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/admin/review-queue/${row.id}`} className="text-primary hover:underline">Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
