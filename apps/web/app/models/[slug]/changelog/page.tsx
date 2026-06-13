import Link from "next/link";
import { getModelBySlug, getModelChangelog } from "@/lib/db/queries";
import { ExternalLink, TrendingDown, AlertTriangle, FileClock } from "lucide-react";

export const revalidate = 300;

const FIELD_LABELS: Record<string, string> = {
  input_per_1m_usd: "输入价格",
  output_per_1m_usd: "输出价格",
  input_cached_read_per_1m_usd: "缓存读取价格",
  context_length: "上下文长度",
  max_output_tokens: "最大输出",
};

export default async function ModelChangelogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const model = await getModelBySlug(decoded);
  if (!model) {
    return (
      <div className="glass p-8 text-center">
        <p className="text-sm text-slate-500">模型不存在</p>
        <Link href="/models" className="text-xs text-primary mt-2 block hover:underline">← 返回模型库</Link>
      </div>
    );
  }

  const rows = await getModelChangelog(model.model_id, 30);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs text-slate-500 mb-1">
          <Link href={`/models/${decoded}`} className="hover:text-primary">{model.model_name}</Link> / 更新日志
        </p>
        <h1 className="text-2xl font-bold text-white">{model.model_name} · 更新日志</h1>
        <p className="text-sm text-slate-400 mt-1">价格调整和能力变更记录</p>
      </header>

      {rows.length === 0 ? (
        <div className="glass p-12 text-center space-y-2">
          <FileClock className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-500">暂无价格变更记录</p>
          <p className="text-[11px] text-slate-600">当价格发生变动时，变更会自动记录在此</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className="glass p-5">
              <div className="flex items-start gap-4">
                <div className="text-right shrink-0 w-28">
                  <p className="text-[11px] font-medium text-slate-400">
                    {r.detected_at ? new Date(r.detected_at).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }) : "—"}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {r.detected_at ? new Date(r.detected_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </p>
                </div>
                <div className="flex-1 border-l border-white/5 pl-4">
                  <p className="font-semibold text-sm text-white">
                    {FIELD_LABELS[r.field] ?? r.field}
                    {r.change_pct != null && (
                      <span className={`ml-2 text-xs ${Number(r.change_pct) > 0 ? "text-danger" : Number(r.change_pct) < 0 ? "text-success" : "text-slate-400"}`}>
                        {Number(r.change_pct) > 0 ? "+" : ""}{Number(r.change_pct).toFixed(1)}%
                      </span>
                    )}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] font-mono">
                    {r.old_value != null && <span className="text-slate-500 line-through">{Number(r.old_value).toFixed(6)}</span>}
                    {r.new_value != null && <span className="text-white">→ {Number(r.new_value).toFixed(6)}</span>}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {r.source_id}
                    </span>
                    {r.source_url && (
                      <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-500 hover:text-primary flex items-center gap-0.5">
                        来源 <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass p-4 text-[10px] text-slate-500 leading-relaxed">
        <AlertTriangle className="w-3 h-3 inline mr-1" />
        更新日志基于公开信息整理，仅供参考。实际功能、价格和版本以各模型服务商官方文档为准。
      </div>
    </div>
  );
}
