"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ListFilter, SlidersHorizontal } from "lucide-react";
import { RANKING_PRESETS } from "@/lib/rank/score";
import { formatContext } from "@/lib/utils";
import { PriceSourceBadges, PriceValue } from "@/components/price-trust";

interface RankItem {
  rank: number;
  model_slug: string;
  model_name: string;
  family: string | null;
  provider: string;
  provider_name: string;
  provider_region: string;
  input_per_1m_usd: number | null;
  output_per_1m_usd: number | null;
  currency_native?: string;
  estimated_currency?: boolean;
  native_input_per_1m_cny?: number | null;
  native_output_per_1m_cny?: number | null;
  exchange_rate?: number | null;
  exchange_rate_updated_at?: string | null;
  pricing_region?: string;
  channel?: string;
  is_official?: boolean;
  is_aggregator?: boolean;
  is_domestic?: boolean;
  data_quality_flags?: string[];
  context_length: number | null;
  tier: string;
  price_source_count: number;
  official_min_input_usd: number | null;
  aggregator_min_input_usd: number | null;
  score: { total: number };
  reason: string;
}

const tierLabels: Record<string, string> = {
  current_frontier: "前沿",
  current_mainstream: "主流",
  previous_generation: "上一代",
  legacy: "旧模型",
  deprecated: "废弃",
  unknown: "待确认",
};

function tierClass(tier: string) {
  if (tier === "current_frontier") return "bg-success/10 text-success";
  if (tier === "current_mainstream") return "bg-primary/10 text-primary";
  if (tier === "previous_generation") return "bg-warning/10 text-warning";
  if (tier === "legacy") return "bg-orange-500/10 text-orange-300";
  if (tier === "deprecated") return "bg-danger/10 text-danger";
  return "bg-slate-500/10 text-slate-400";
}

export default function RankingTypePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const type = params.type as string;
  const preset = RANKING_PRESETS[type];

  const [items, setItems] = useState<RankItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(parseInt(searchParams.get("limit") ?? "20", 10));
  const [offset, setOffset] = useState(parseInt(searchParams.get("offset") ?? "0", 10));
  const [diversityMode, setDiversityMode] = useState(true);
  const [hideLegacy, setHideLegacy] = useState(true);
  const [expandedReasons, setExpandedReasons] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      diversity_mode: String(diversityMode),
      hide_legacy: String(hideLegacy),
      hide_deprecated: "true",
      hide_unknown: "true",
    });
    const region = searchParams.get("region");
    const channel = searchParams.get("channel");
    if (region) qs.set("region", region);
    if (channel) qs.set("channel", channel);
    fetch(`/api/v1/rankings/${type}?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [type, limit, offset, diversityMode, hideLegacy, searchParams]);

  if (!preset) return <div className="p-6 text-white">未知榜单：{type}</div>;

  const pages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  const isDomestic = type === "domestic" || type === "china-available" || searchParams.get("region") === "china_mainland";
  const isLegacyList = type === "legacy-low-cost" || type === "old-models";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link href="/rankings" className="text-xs text-slate-500 hover:text-primary">← 所有榜单</Link>
          <h1 className="text-xl font-bold text-white">{preset.label}</h1>
          <p className="text-xs text-slate-400 mt-1">
            共 {total} 个模型。默认隐藏 unknown、legacy、deprecated；低价旧模型只进入旧模型低价榜。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDiversityMode(!diversityMode)}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${diversityMode ? "bg-primary/20 text-primary" : "bg-white/5 text-slate-400"}`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            {diversityMode ? "精选榜" : "全量榜"}
          </button>
          <button
            onClick={() => setHideLegacy(!hideLegacy)}
            className={`rounded-lg px-2 py-1.5 text-xs ${hideLegacy ? "bg-white/5 text-slate-400" : "bg-orange-500/10 text-orange-300"}`}
          >
            {hideLegacy ? "隐藏旧模型" : "显示旧模型"}
          </button>
        </div>
      </div>

      <div className="glass p-4 text-xs text-slate-400 space-y-1">
        <p>排序逻辑：综合价格、能力、新鲜度、上下文、来源置信度和数据质量扣分；默认不是简单按低价排序。</p>
        <p>精选榜会限制同一 provider / model_family 刷榜；全量榜保留完整候选。</p>
        <p>{isDomestic ? "国内榜优先展示原生人民币 ¥ 价格；美元换算会明确标记为估算。" : "全球榜保留 USD 原生价；国内渠道会显示 ¥ 与来源。"} {isLegacyList ? "本榜专门用于旧模型/上一代模型低价参考。" : ""}</p>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <SlidersHorizontal className="h-3 w-3" />
        {[20, 50, 100].map((n) => (
          <button
            key={n}
            onClick={() => {
              setLimit(n);
              setOffset(0);
            }}
            className={`rounded px-2 py-1 ${limit === n ? "bg-primary/20 text-primary" : "hover:text-white"}`}
          >
            Top {n}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass p-8 text-center text-slate-500">加载中...</div>
      ) : items.length === 0 ? (
        <div className="glass p-8 text-center text-slate-500">暂无数据</div>
      ) : (
        <div className="glass overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-slate-500">
                <th className="w-10 px-3 py-2 text-left font-normal">#</th>
                <th className="px-3 py-2 text-left font-normal">模型</th>
                <th className="px-3 py-2 text-left font-normal">厂商</th>
                <th className="px-3 py-2 text-right font-normal">输入/1M</th>
                <th className="px-3 py-2 text-right font-normal">输出/1M</th>
                <th className="px-3 py-2 text-left font-normal">来源可信度</th>
                <th className="px-3 py-2 text-right font-normal">上下文</th>
                <th className="px-3 py-2 text-right font-normal">评分</th>
                <th className="px-3 py-2 text-left font-normal">排名说明</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const preferCny = item.currency_native === "CNY" || item.is_domestic || item.pricing_region === "china_mainland" || isDomestic;
                return (
                  <tr key={`${item.rank}-${item.provider}-${item.model_slug}`} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-3 py-2 font-mono text-slate-500">{item.rank}</td>
                    <td className="px-3 py-2">
                      <Link href={`/models/${encodeURIComponent(item.model_slug)}`} className="font-medium text-white hover:text-primary">
                        {item.model_name}
                      </Link>
                      <span className={`ml-1 rounded px-1 py-0.5 text-[10px] ${tierClass(item.tier)}`}>{tierLabels[item.tier] ?? item.tier}</span>
                      {item.family && <span className="ml-1 text-[10px] text-slate-600">{item.family}</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-300">{item.provider_name}</td>
                    <td className="px-3 py-2 text-right">
                      <PriceValue
                        compact
                        usd={item.input_per_1m_usd}
                        currencyNative={item.currency_native}
                        nativeCny={item.native_input_per_1m_cny}
                        estimatedCurrency={item.estimated_currency}
                        preferCny={preferCny}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <PriceValue
                        compact
                        usd={item.output_per_1m_usd}
                        currencyNative={item.currency_native}
                        nativeCny={item.native_output_per_1m_cny}
                        estimatedCurrency={item.estimated_currency}
                        preferCny={preferCny}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <PriceSourceBadges
                        channel={item.channel}
                        isOfficial={item.is_official}
                        isAggregator={item.is_aggregator}
                        isDomestic={item.is_domestic}
                        currencyNative={item.currency_native}
                        estimatedCurrency={item.estimated_currency}
                        flags={item.data_quality_flags}
                      />
                      <p className="mt-1 text-[10px] text-slate-500">{item.price_source_count} 个价格来源</p>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-300">{formatContext(item.context_length)}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      <span className={item.score.total >= 80 ? "text-success" : item.score.total >= 60 ? "text-primary" : "text-slate-400"}>
                        {item.score.total.toFixed(0)}
                      </span>
                    </td>
                    <td className="max-w-[240px] px-3 py-2">
                      <button
                        onClick={() => setExpandedReasons((prev) => ({ ...prev, [item.rank]: !prev[item.rank] }))}
                        className="text-left text-[10px] leading-relaxed text-slate-500 hover:text-slate-300"
                      >
                        {expandedReasons[item.rank] || item.reason.length <= 42 ? item.reason : `${item.reason.slice(0, 42)}...`}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-xs">
          <button
            disabled={currentPage <= 1}
            onClick={() => setOffset((currentPage - 2) * limit)}
            className="rounded bg-white/5 px-2 py-1 text-slate-400 disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-slate-400">{currentPage} / {pages}</span>
          <button
            disabled={currentPage >= pages}
            onClick={() => setOffset(currentPage * limit)}
            className="rounded bg-white/5 px-2 py-1 text-slate-400 disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <p className="text-[10px] text-slate-600">
        数据来源包含官方价格页、云平台价、聚合平台价与第三方价格源。价格仅供选型参考，最终以来源页面为准。
      </p>
    </div>
  );
}
