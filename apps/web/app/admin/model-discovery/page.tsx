import { listLatestModelCandidates, listModelDiscoveryLogs, modelDiscoveryOverview } from "@/lib/db/queries";
import { relativeTime } from "@/lib/utils";

export const revalidate = 120;

export default async function AdminModelDiscoveryPage() {
  const [overview, candidates, logs] = await Promise.all([
    modelDiscoveryOverview(),
    listLatestModelCandidates(80),
    listModelDiscoveryLogs(30),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">模型发现审计</h1>
        <p className="text-sm text-slate-400 mt-1">官方源发现、缺价格模型、可能废弃模型和最近抓取日志。</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ["7 天发现", overview.recent7],
          ["30 天发现", overview.recent30],
          ["已入库", overview.inserted],
          ["价格待确认", overview.needsPricing],
          ["可能废弃", overview.possibleDeprecated],
        ].map(([label, value]) => (
          <div key={label} className="glass p-4">
            <p className="text-[11px] text-slate-500">{label}</p>
            <p className="font-mono text-2xl text-white mt-1">{value}</p>
          </div>
        ))}
      </div>

      <section className="glass p-4">
        <h2 className="text-sm font-semibold text-white mb-3">最近发现候选</h2>
        <div className="grid md:grid-cols-2 gap-2">
          {candidates.slice(0, 20).map((c) => (
            <div key={c.id} className="bg-white/3 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-white truncate">{c.model_name}</p>
                <span className={c.needs_pricing_review ? "text-warning text-[10px]" : "text-success text-[10px]"}>
                  {c.needs_pricing_review ? "价格待确认" : "有价格"}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {c.provider_slug} · {c.lifecycle_tier} · {c.model_status} · {relativeTime(c.last_seen_at)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass p-4">
        <h2 className="text-sm font-semibold text-white mb-3">发现任务日志</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-white/5">
                <th className="text-left py-2 font-normal">源</th>
                <th className="text-left py-2 font-normal">厂商</th>
                <th className="text-right py-2 font-normal">候选</th>
                <th className="text-right py-2 font-normal">入库</th>
                <th className="text-right py-2 font-normal">缺价格</th>
                <th className="text-left py-2 font-normal">状态</th>
                <th className="text-right py-2 font-normal">时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-white/5">
                  <td className="py-2 text-slate-300">{log.source_id}</td>
                  <td className="py-2 text-slate-300">{log.provider_slug}</td>
                  <td className="py-2 text-right font-mono text-white">{log.candidates_found}</td>
                  <td className="py-2 text-right font-mono text-white">{log.models_inserted}</td>
                  <td className="py-2 text-right font-mono text-warning">{log.missing_pricing}</td>
                  <td className="py-2 text-slate-300">{log.status}</td>
                  <td className="py-2 text-right text-slate-500">{relativeTime(log.fetched_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
