import { listModelAliasAudit } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function ModelAliasesPage() {
  const rows = await listModelAliasAudit(500);
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-slate-500">Admin / model aliases</p>
        <h1 className="text-2xl font-bold text-white">Model family candidates</h1>
      </div>
      <div className="glass p-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left py-2">Owner</th>
              <th className="text-left py-2">Family</th>
              <th className="text-right py-2">Variants</th>
              <th className="text-left py-2">Examples</th>
              <th className="text-left py-2">Review</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.canonical_provider}-${r.model_family}`} className="border-t border-white/5">
                <td className="py-2 font-mono text-primary">{r.canonical_provider}</td>
                <td className="py-2 font-mono text-white">{r.model_family}</td>
                <td className="py-2 text-right font-mono">{r.model_count}</td>
                <td className="py-2 text-slate-400">{(r.variants ?? []).slice(0, 8).join(", ")}</td>
                <td className="py-2">{r.needs_review ? <span className="text-warning">needs review</span> : <span className="text-success">ok</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
