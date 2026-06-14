import { listProviderAliasAudit } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function ProviderAliasesPage() {
  const rows = await listProviderAliasAudit(500);
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-slate-500">Admin / provider aliases</p>
        <h1 className="text-2xl font-bold text-white">Provider aliases</h1>
      </div>
      <div className="glass p-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left py-2">Source slug</th>
              <th className="text-left py-2">Canonical slug</th>
              <th className="text-left py-2">Type</th>
              <th className="text-right py-2">Confidence</th>
              <th className="text-right py-2">Models</th>
              <th className="text-left py-2">Review</th>
              <th className="text-left py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.source_slug} className="border-t border-white/5">
                <td className="py-2 font-mono text-white">{r.source_slug}</td>
                <td className="py-2 font-mono text-primary">{r.canonical_slug}</td>
                <td className="py-2 text-slate-300">{r.provider_type}</td>
                <td className="py-2 text-right font-mono">{(r.alias_confidence * 100).toFixed(0)}%</td>
                <td className="py-2 text-right font-mono">{r.model_count}</td>
                <td className="py-2">{r.needs_alias_review ? <span className="text-warning">needs review</span> : <span className="text-success">ok</span>}</td>
                <td className="py-2 text-slate-500">{r.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
