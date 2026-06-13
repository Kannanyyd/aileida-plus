"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RANKING_PRESETS } from "@/lib/rank/score";
import { ChevronLeft, ChevronRight, SlidersHorizontal, ListFilter } from "lucide-react";

interface RankItem {
  rank: number; model_slug: string; model_name: string; family: string | null;
  provider: string; provider_name: string; provider_region: string;
  input_per_1m_usd: number | null; output_per_1m_usd: number | null;
  context_length: number | null; capabilities: string[]; status: string;
  score: { total: number }; reason: string;
}

export default function RankingTypePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = params.type as string;
  const preset = RANKING_PRESETS[type];

  const [items, setItems] = useState<RankItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(parseInt(searchParams.get("limit") ?? "20"));
  const [offset, setOffset] = useState(parseInt(searchParams.get("offset") ?? "0"));
  const [diversityMode, setDiversityMode] = useState(true);
  const [hideLegacy, setHideLegacy] = useState(true);
  const [expandedReasons, setExpandedReasons] = useState<Record<number, boolean>>({});

  const fetchRanking = (l: number, o: number, div: boolean) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(l), offset: String(o), diversity_mode: String(div), hide_legacy: String(hideLegacy), hide_deprecated: "true" });
    fetch(`/api/v1/rankings/${type}?${params}`)
      .then((r) => r.json())
      .then((d) => { setItems(d.items ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRanking(limit, offset, diversityMode); }, [type, limit, offset, diversityMode, hideLegacy]);

  if (!preset) return <div className="text-white p-6">未知榜单: {type}</div>;

  const pages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const toggleReason = (rank: number) => setExpandedReasons((p) => ({ ...p, [rank]: !p[rank] }));

  const formatUsd = (v: number | null) => v != null ? `$${v.toFixed(4)}` : "—";
  const formatCtx = (v: number | null) => {
    if (!v) return "—";
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return String(v);
  };

  const regionBadge = (r: string) => {
    if (r === "cn") return <span className="text-[10px] px-1 py-0.5 rounded bg-cyan/10 text-cyan">国内</span>;
    return <span className="text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary">海外</span>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Link href="/rankings" className="text-xs text-slate-500 hover:text-primary">← 所有榜单</Link>
          <h1 className="text-xl font-bold text-white">{preset.label}</h1>
          <p className="text-xs text-slate-400">共 {total} 个模型</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDiversityMode(!diversityMode)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              diversityMode ? "bg-primary/20 text-primary" : "bg-white/5 text-slate-400"
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            {diversityMode ? "精选榜" : "全量榜"}
          </button>
          <button
            onClick={() => setHideLegacy(!hideLegacy)}
            className={`px-2 py-1.5 rounded-lg text-xs ${hideLegacy ? "bg-white/5 text-slate-400" : "bg-orange-500/10 text-orange-400"}`}
          >
            {hideLegacy ? "隐藏旧模型" : "显示旧模型"}
          </button>
        </div>
      </div>

      {/* Limit selector */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <SlidersHorizontal className="w-3 h-3" />
        {[20, 50, 100].map((l) => (
          <button key={l} onClick={() => { setLimit(l); setOffset(0); }}
            className={`px-2 py-1 rounded ${limit === l ? "bg-primary/20 text-primary" : "hover:text-white"}`}>
            Top {l}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass p-8 text-center text-slate-500">加载中...</div>
      ) : items.length === 0 ? (
        <div className="glass p-8 text-center text-slate-500">暂无数据</div>
      ) : (
        <div className="overflow-x-auto glass">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-white/5">
                <th className="text-left py-2 px-3 font-normal w-10">#</th>
                <th className="text-left py-2 px-3 font-normal">模型</th>
                <th className="text-left py-2 px-3 font-normal">厂商</th>
                <th className="text-right py-2 px-3 font-normal">输入/1M</th>
                <th className="text-right py-2 px-3 font-normal">输出/1M</th>
                <th className="text-right py-2 px-3 font-normal">上下文</th>
                <th className="text-right py-2 px-3 font-normal">评分</th>
                <th className="text-left py-2 px-3 font-normal">理由</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.model_slug} className="border-b border-white/5 hover:bg-white/5 group">
                  <td className="py-2 px-3 font-mono text-slate-500">{item.rank}</td>
                  <td className="py-2 px-3">
                    <Link href={`/models/${encodeURIComponent(item.model_slug)}`} className="text-white hover:text-primary font-medium">
                      {item.model_name}
                    </Link>
                    {item.family && <span className="text-[10px] text-slate-600 ml-1">{item.family}</span>}
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-slate-300">{item.provider_name}</span>
                    <span className="ml-1">{regionBadge(item.provider_region)}</span>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-white">{formatUsd(item.input_per_1m_usd)}</td>
                  <td className="py-2 px-3 text-right font-mono text-white">{formatUsd(item.output_per_1m_usd)}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300">{formatCtx(item.context_length)}</td>
                  <td className="py-2 px-3 text-right font-mono">
                    <span className={item.score.total >= 80 ? "text-success" : item.score.total >= 60 ? "text-primary" : "text-slate-400"}>
                      {item.score.total.toFixed(0)}
                    </span>
                  </td>
                  <td className="py-2 px-3 max-w-[200px]">
                    <button onClick={() => toggleReason(item.rank)} className="text-[10px] text-slate-500 hover:text-slate-300 text-left leading-relaxed">
                      {expandedReasons[item.rank] ? item.reason : (item.reason.length > 30 ? item.reason.slice(0, 30) + "..." : item.reason)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-xs">
          <button disabled={currentPage <= 1} onClick={() => setOffset((currentPage - 2) * limit)}
            className="px-2 py-1 rounded bg-white/5 text-slate-400 disabled:opacity-30">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-slate-400">{currentPage} / {pages}</span>
          <button disabled={currentPage >= pages} onClick={() => setOffset(currentPage * limit)}
            className="px-2 py-1 rounded bg-white/5 text-slate-400 disabled:opacity-30">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <p className="text-[10px] text-slate-600">
        数据来源: LiteLLM / OpenRouter / llm-prices / genai-prices · 每小时自动更新
      </p>
    </div>
  );
}
