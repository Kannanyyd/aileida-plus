import Link from "next/link";
import { listOfficialCurrentCatalog } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function OfficialCurrentPage() {
  const rows = await listOfficialCurrentCatalog(500);
  const homepageEligible = rows.filter((r) => r.homepage_eligible).length;
  const pricePending = rows.filter((r) => r.needs_pricing_review || !r.has_pricing).length;
  const aliasReview = rows.reduce((sum, r) => sum + r.aliases_need_review, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">Admin / official current catalog</p>
          <h1 className="text-2xl font-bold text-white">Official-current catalog</h1>
          <p className="mt-1 text-xs text-slate-400">Read-only DB catalog. Code catalog is only a marked fallback.</p>
        </div>
        <Link href="/admin/model-aliases" className="text-xs text-primary hover:underline">View aliases</Link>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        {[
          ["Catalog models", rows.length],
          ["Homepage eligible", homepageEligible],
          ["Price pending", pricePending],
          ["Alias review", aliasReview],
        ].map(([label, value]) => (
          <div key={label} className="glass p-4">
            <p className="text-[11px] text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-mono font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="glass p-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left py-2">Provider</th>
              <th className="text-left py-2">Model</th>
              <th className="text-left py-2">Family</th>
              <th className="text-left py-2">Status</th>
              <th className="text-right py-2">Confidence</th>
              <th className="text-left py-2">Homepage</th>
              <th className="text-left py-2">Pricing</th>
              <th className="text-left py-2">Source</th>
              <th className="text-right py-2">Aliases</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.provider_slug}/${r.model_slug}`} className="border-t border-white/5">
                <td className="py-2 font-mono text-primary">{r.provider_slug}</td>
                <td className="py-2 font-mono text-white">{r.model_slug}</td>
                <td className="py-2 font-mono text-slate-300">{r.model_family}</td>
                <td className="py-2">{r.official_status}</td>
                <td className="py-2 text-right font-mono">{Math.round(r.confidence * 100)}%</td>
                <td className="py-2">{r.homepage_eligible ? <span className="text-success">eligible</span> : <span className="text-slate-500">excluded</span>}</td>
                <td className="py-2">{r.has_pricing ? <span className="text-success">priced</span> : <span className="text-warning">pending</span>}</td>
                <td className="py-2">
                  <a href={r.official_source_url} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                    {r.source_kind}
                  </a>
                </td>
                <td className="py-2 text-right font-mono">
                  {r.alias_count}
                  {r.aliases_need_review > 0 ? <span className="ml-1 text-warning">({r.aliases_need_review})</span> : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-slate-500">No DB catalog rows yet. Run npm run sync:official-current.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
