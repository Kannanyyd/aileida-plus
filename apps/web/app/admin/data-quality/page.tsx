import Link from "next/link";
import { dataQualityOverview, domesticPricingGapAudit, listModelAliasAudit, listProviderAliasAudit } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function DataQualityPage() {
  const [overview, providers, models, domesticGaps] = await Promise.all([
    dataQualityOverview(),
    listProviderAliasAudit(20),
    listModelAliasAudit(20),
    domesticPricingGapAudit(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-slate-500">Admin / data quality</p>
        <h1 className="text-2xl font-bold text-white">Data quality audit</h1>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          ["Provider alias rules", overview.providerAliasRules],
          ["Alias review", overview.providerAliasesNeedReview],
          ["Aggregator only", overview.aggregatorOnly],
          ["Missing source URL", overview.missingPriceSourceUrl],
          ["Domestic price missing", overview.domesticPriceMissing],
          ["Suspicious names", overview.suspiciousName],
        ].map(([label, value]) => (
          <div key={label} className="glass p-4">
            <p className="text-[11px] text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-mono font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="glass p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Provider aliases</h2>
            <Link href="/admin/provider-aliases" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {providers.map((p) => (
              <div key={p.source_slug} className="rounded border border-white/10 p-2 text-xs">
                <p className="text-white">{p.source_slug} {"->"} {p.canonical_slug}</p>
                <p className="text-slate-500">{p.provider_type} · confidence {(p.alias_confidence * 100).toFixed(0)}% · models {p.model_count}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glass p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Possible duplicate families</h2>
            <Link href="/admin/model-aliases" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {models.map((m) => (
              <div key={`${m.canonical_provider}-${m.model_family}`} className="rounded border border-white/10 p-2 text-xs">
                <p className="text-white">{m.canonical_provider} / {m.model_family}</p>
                <p className="text-slate-500">{m.model_count} variants · {(m.variants ?? []).slice(0, 3).join(", ")}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="glass p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Domestic pricing gaps</h2>
          <Link href="/admin/pricing-gaps" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-slate-500">
              <tr>
                <th className="text-left py-2">Provider</th>
                <th className="text-right py-2">Models</th>
                <th className="text-right py-2">CNY prices</th>
                <th className="text-right py-2">Missing</th>
                <th className="text-right py-2">Source URLs</th>
                <th className="text-right py-2">Needs review</th>
              </tr>
            </thead>
            <tbody>
              {domesticGaps.map((r) => (
                <tr key={r.provider} className="border-t border-white/5">
                  <td className="py-2 text-white">{r.provider}</td>
                  <td className="py-2 text-right font-mono">{r.models_count}</td>
                  <td className="py-2 text-right font-mono">{r.cny_pricing_count}</td>
                  <td className="py-2 text-right font-mono text-warning">{r.missing_price_model_count}</td>
                  <td className="py-2 text-right font-mono">{r.source_url_count}</td>
                  <td className="py-2 text-right font-mono">{r.needs_pricing_review_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
