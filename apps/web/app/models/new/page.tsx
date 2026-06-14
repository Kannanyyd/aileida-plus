import Link from "next/link";
import { listLatestModelCandidates, modelDiscoveryOverview } from "@/lib/db/queries";
import { relativeTime } from "@/lib/utils";

export const revalidate = 300;

export default async function NewModelsPage() {
  const [overview, candidates] = await Promise.all([
    modelDiscoveryOverview(),
    listLatestModelCandidates(100),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-slate-500 mb-1">官方源 / changelog / model list</p>
        <h1 className="text-2xl font-bold text-white">最新模型发现</h1>
        <p className="text-sm text-slate-400 mt-1">
          这里展示官方源中新发现或需要补价格的模型。没有价格的模型不会进入价格榜，但会进入发现列表和复核队列。
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ["7 天发现", overview.recent7],
          ["30 天发现", overview.recent30],
          ["已入库新模型", overview.inserted],
          ["价格待确认", overview.needsPricing],
          ["可能废弃", overview.possibleDeprecated],
        ].map(([label, value]) => (
          <div key={label} className="glass p-4">
            <p className="text-[11px] text-slate-500">{label}</p>
            <p className="font-mono text-2xl text-white mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="glass overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-white/5">
              <th className="text-left p-3 font-normal">模型</th>
              <th className="text-left p-3 font-normal">厂商</th>
              <th className="text-left p-3 font-normal">状态</th>
              <th className="text-left p-3 font-normal">分层</th>
              <th className="text-left p-3 font-normal">价格</th>
              <th className="text-left p-3 font-normal">来源</th>
              <th className="text-right p-3 font-normal">发现时间</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-3">
                  <Link href={`/models/${encodeURIComponent(c.model_slug)}`} className="text-white hover:text-primary font-medium">
                    {c.model_name}
                  </Link>
                  <p className="text-[10px] text-slate-600">{c.model_slug}</p>
                </td>
                <td className="p-3 text-slate-300">{c.provider_slug}</td>
                <td className="p-3 text-slate-300">{c.model_status}</td>
                <td className="p-3 text-slate-300">{c.lifecycle_tier}</td>
                <td className="p-3">
                  {c.has_pricing ? (
                    <span className="text-success">已确认</span>
                  ) : (
                    <span className="text-warning">待确认</span>
                  )}
                </td>
                <td className="p-3">
                  <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {c.source_id}
                  </a>
                </td>
                <td className="p-3 text-right text-slate-500">{relativeTime(c.last_seen_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
