import { domesticPricingGapAudit } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function PricingGapsPage() {
  const rows = await domesticPricingGapAudit();
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
              <th className="text-right py-2">Source URL rows</th>
              <th className="text-right py-2">Official rows</th>
              <th className="text-right py-2">Aggregator rows</th>
              <th className="text-right py-2">Needs review</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.provider} className="border-t border-white/5">
                <td className="py-2 text-white">{r.provider}</td>
                <td className="py-2 text-right font-mono">{r.models_count}</td>
                <td className="py-2 text-right font-mono text-success">{r.cny_pricing_count}</td>
                <td className="py-2 text-right font-mono text-warning">{r.missing_price_model_count}</td>
                <td className="py-2 text-right font-mono">{r.source_url_count}</td>
                <td className="py-2 text-right font-mono">{r.official_count}</td>
                <td className="py-2 text-right font-mono">{r.aggregator_count}</td>
                <td className="py-2 text-right font-mono">{r.needs_pricing_review_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
