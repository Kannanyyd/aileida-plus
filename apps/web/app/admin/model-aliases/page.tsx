import Link from "next/link";
import { listModelAliasAudit, listOfficialModelAliases } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function ModelAliasesPage() {
  const [rows, officialAliases] = await Promise.all([
    listModelAliasAudit(500),
    listOfficialModelAliases(800),
  ]);
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">Admin / model aliases</p>
          <h1 className="text-2xl font-bold text-white">Model aliases</h1>
          <p className="mt-1 text-xs text-slate-400">Official aliases are read-only; ambiguous latest/preview aliases are excluded from homepage.</p>
        </div>
        <Link href="/admin/official-current" className="text-xs text-primary hover:underline">Official catalog</Link>
      </div>

      <div className="glass p-4 overflow-x-auto">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Official-current aliases</h2>
          <p className="text-xs text-slate-500">{officialAliases.length} aliases</p>
        </div>
        <table className="w-full text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="text-left py-2">Provider</th>
              <th className="text-left py-2">Alias</th>
              <th className="text-left py-2">Canonical</th>
              <th className="text-left py-2">Type</th>
              <th className="text-left py-2">Homepage</th>
              <th className="text-left py-2">Review</th>
              <th className="text-right py-2">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {officialAliases.map((r) => (
              <tr key={`${r.provider_slug}/${r.alias_slug}`} className="border-t border-white/5">
                <td className="py-2 font-mono text-primary">{r.provider_slug}</td>
                <td className="py-2 font-mono text-white">{r.alias_slug}</td>
                <td className="py-2 font-mono text-slate-300">{r.canonical_model_slug}</td>
                <td className="py-2">{r.alias_type}</td>
                <td className="py-2">{r.homepage_eligible ? <span className="text-success">eligible</span> : <span className="text-slate-500">excluded</span>}</td>
                <td className="py-2">{r.needs_alias_review ? <span className="text-warning">needs review</span> : <span className="text-success">ok</span>}</td>
                <td className="py-2 text-right font-mono">{Math.round(r.confidence * 100)}%</td>
              </tr>
            ))}
            {officialAliases.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">No official alias rows yet. Run npm run sync:official-current.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="glass p-4 overflow-x-auto">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-white">Database family candidates</h2>
        </div>
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
