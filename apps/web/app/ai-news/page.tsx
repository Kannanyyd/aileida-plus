import Link from "next/link";
import { ExternalLink, Calendar, TrendingUp, AlertTriangle, Shield, Newspaper } from "lucide-react";
import { listNewsItems } from "@/lib/db/queries";
import { CATEGORY_LABELS } from "@/lib/news-constants";

export const revalidate = 60;

export default async function AINewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const cat = params.category ?? "all";
  const rows = await listNewsItems({ category: cat === "all" ? undefined : cat, limit: 30 });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">每日 AI 动态</h1>
        <p className="text-sm text-slate-400 mt-1">
          自动收集、分类和摘要 AI 行业动态。国内 AI 厂商动态优先展示。
        </p>
      </header>

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-1.5">
        <Link href="/ai-news" className={`text-[11px] px-2.5 py-1 rounded-full border transition ${cat === "all" ? "bg-primary/20 border-primary/40 text-primary font-medium" : "border-white/10 text-slate-400 hover:border-white/20"}`}>
          📋 全部
        </Link>
        {Object.entries(CATEGORY_LABELS).filter(([k]) => k !== "all").map(([key, val]) => (
          <Link key={key} href={`/ai-news?category=${key}`} className={`text-[11px] px-2.5 py-1 rounded-full border transition ${cat === key ? "bg-primary/20 border-primary/40 text-primary font-medium" : "border-white/10 text-slate-400 hover:border-white/20"}`}>
            {val.icon} {val.zh}
          </Link>
        ))}
      </div>

      {/* 动态列表 */}
      {rows.length === 0 ? (
        <div className="glass p-12 text-center space-y-2">
          <Newspaper className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-500">暂无 AI 动态数据</p>
          <p className="text-[11px] text-slate-600">新闻源正在初始化，worker 抓取运行后将自动更新</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((n) => (
            <div key={n.id} className="glass p-5 hover:border-primary/30 transition">
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5 shrink-0">{CATEGORY_LABELS[n.category]?.icon ?? "📋"}</span>
                <div className="flex-1 min-w-0">
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm text-white hover:text-primary transition flex items-start gap-1">
                    {n.title} <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 text-slate-600" />
                  </a>
                  {n.summary && <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{n.summary}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary`}>{CATEGORY_LABELS[n.category]?.zh ?? n.category}</span>
                    {n.published_at && (
                      <span className="text-[10px] text-slate-600 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />{new Date(n.published_at).toLocaleDateString("zh-CN")}
                      </span>
                    )}
                    {n.source_name && <span className="text-[10px] text-slate-600">来源：{n.source_name}</span>}
                    {n.affects_pricing && <span className="text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded flex items-center gap-0.5"><TrendingUp className="w-2.5 h-2.5" />影响价格</span>}
                  </div>
                </div>
                {n.importance >= 4 && <span className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-primary-soft text-primary border border-primary/30">🔥</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass p-4">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-slate-500 mt-px shrink-0" />
          <p className="text-[10px] text-slate-500 leading-relaxed">
            以上动态基于公开来源、官方公告和媒体报道整理，标题和摘要由系统自动生成或人工编辑，仅供参考。本站不全文转载原文内容，所有信息以原始来源为准。对于争议性或未核实内容，将进入人工复核流程。本站不隶属于任何 AI 厂商，不对动态的完整性或时效性作绝对保证。
          </p>
        </div>
      </div>
    </div>
  );
}
