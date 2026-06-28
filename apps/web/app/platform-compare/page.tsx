import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Crown, Layers, TrendingDown } from "lucide-react";
import { listPlatformComparison, type PlatformPriceRow } from "@/lib/db/queries";
import { config } from "@/lib/env";
import { SiteDisclaimer } from "@/components/model-strengths";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "平台比价 | 同一模型在不同平台的价格对比",
  description: "对比同一 AI 模型在官方 API、云平台、聚合平台上的价格差异，一眼看出哪个平台最便宜。",
  alternates: { canonical: "/platform-compare" },
};

interface ModelGroup {
  model_id: string;
  model_slug: string;
  model_name: string;
  provider_slug: string;
  provider_name_zh: string;
  provider_region: string | null;
  model_lifecycle_tier: string | null;
  context_length: number | null;
  prices: PlatformPriceRow[];
  cheapest: PlatformPriceRow | null;
  officialPrice: PlatformPriceRow | null;
  domesticCheapest: PlatformPriceRow | null;
  overseasCheapest: PlatformPriceRow | null;
}

function groupByModel(rows: PlatformPriceRow[]): ModelGroup[] {
  const map = new Map<string, ModelGroup>();
  for (const row of rows) {
    if (!map.has(row.model_id)) {
      map.set(row.model_id, {
        model_id: row.model_id,
        model_slug: row.model_slug,
        model_name: row.model_name,
        provider_slug: row.provider_slug,
        provider_name_zh: row.provider_name_zh,
        provider_region: row.provider_region,
        model_lifecycle_tier: row.model_lifecycle_tier,
        context_length: row.context_length,
        prices: [],
        cheapest: null,
        officialPrice: null,
        domesticCheapest: null,
        overseasCheapest: null,
      });
    }
    const group = map.get(row.model_id)!;
    group.prices.push(row);
  }

  for (const group of map.values()) {
    const sorted = group.prices.filter((p) => p.input_per_1m_usd != null);
    if (sorted.length === 0) continue;
    sorted.sort((a, b) => (a.input_per_1m_usd! - b.input_per_1m_usd!));
    group.cheapest = sorted[0];
    group.officialPrice = sorted.find((p) => p.is_official) ?? null;
    group.domesticCheapest = sorted.find((p) => p.is_domestic || p.region === "china_mainland" || p.provider_region === "cn") ?? null;
    group.overseasCheapest = sorted.find((p) => !p.is_domestic && p.region !== "china_mainland" && p.provider_region !== "cn") ?? null;
  }

  return Array.from(map.values()).filter((g) => g.cheapest).sort((a, b) => {
    // 先按是否有国内价格排序（有国内价的靠前），再按最低价升序
    const aHasDomestic = a.domesticCheapest ? 0 : 1;
    const bHasDomestic = b.domesticCheapest ? 0 : 1;
    if (aHasDomestic !== bHasDomestic) return aHasDomestic - bHasDomestic;
    return (a.cheapest!.input_per_1m_usd! - b.cheapest!.input_per_1m_usd!);
  });
}

function formatPrice(usd: number | null, currency: string, isDomestic: boolean): string {
  if (usd == null) return "-";
  if (currency === "CNY" || isDomestic) {
    const cny = Math.round(usd * config.fx.usdCny * 100) / 100;
    return `¥${cny}`;
  }
  return `$${usd}`;
}

function savingsPct(cheapest: number, compare: number): number {
  if (compare <= 0 || cheapest <= 0) return 0;
  return Math.round((1 - cheapest / compare) * 100);
}

const CHANNEL_LABEL: Record<string, string> = {
  official_api: "官方 API",
  cloud_platform: "云平台",
  aggregator: "聚合平台",
  reseller: "代理商",
};

const PLATFORM_LABEL: Record<string, string> = {
  openrouter: "OpenRouter",
  siliconflow: "硅基流动",
  "aliyun-bailian": "阿里百炼",
  "volcengine-ark": "火山方舟",
  "tencent-cloud": "腾讯云",
  "huawei-cloud": "华为云",
  "baidu-qianfan": "百度千帆",
  "minimax": "MiniMax",
  "deepseek": "DeepSeek",
  "moonshot": "Moonshot",
  "zhipu": "智谱",
};

function platformLabel(row: PlatformPriceRow): string {
  if (row.platform && PLATFORM_LABEL[row.platform]) return PLATFORM_LABEL[row.platform];
  if (row.selling_platform_provider) return row.selling_platform_provider;
  if (row.platform) return row.platform;
  return CHANNEL_LABEL[row.channel] ?? row.channel;
}

export default async function PlatformComparePage() {
  const rawRows = await listPlatformComparison(40);
  const groups = groupByModel(rawRows);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-success/6 via-transparent to-cyan/6" />
        <div className="absolute -top-20 left-1/2 h-40 w-[500px] -translate-x-1/2 rounded-full bg-success/8 blur-[70px] pulse-glow" />
        <div className="relative px-6 py-10 text-center">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">平台比价</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
            同一模型在不同平台价格可能差 <span className="gradient-text-success font-semibold">2-5 倍</span>。绿色高亮为最低价平台。
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-lg border border-success/20 bg-success/8 px-2.5 py-1 text-success">
              <Crown className="w-3 h-3" /> 最低价
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-cyan/20 bg-cyan/8 px-2.5 py-1 text-cyan">
              国内渠道
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary-soft px-2.5 py-1 text-primary">
              官方渠道
            </span>
          </div>
        </div>
      </section>

      {groups.length === 0 ? (
        <div className="glass p-8 text-center text-slate-500">
          暂无足够的多平台价格数据。需要先运行数据采集任务。
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const cheapest = group.cheapest!;
            const official = group.officialPrice;
            const savings = official ? savingsPct(cheapest.input_per_1m_usd!, official.input_per_1m_usd!) : 0;
            const platformCount = group.prices.length;
            const hasMultiplePlatforms = platformCount > 1;

            return (
              <div key={group.model_id} className="glass glass-hover p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <Link href={`/models/${encodeURIComponent(group.model_slug)}`} className="text-base font-semibold text-white hover:text-primary transition">
                      {group.model_name}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {group.provider_name_zh}
                      {group.provider_region === "cn" ? " · 国内" : " · 海外"}
                      {group.context_length ? ` · 上下文 ${Math.round(group.context_length / 1000)}K` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {savings > 0 && (
                      <div className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-1 text-[11px] text-success">
                        <TrendingDown className="w-3 h-3" />
                        比官方便宜 {savings}%
                      </div>
                    )}
                    <p className="mt-1 text-[10px] text-slate-500">{platformCount} 个平台报价</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {group.prices
                    .filter((p) => p.input_per_1m_usd != null)
                    .sort((a, b) => (a.input_per_1m_usd! - b.input_per_1m_usd!))
                    .map((price, idx) => {
                      const isCheapest = idx === 0;
                      const isOfficial = price.is_official;
                      const isDomestic = price.is_domestic || price.region === "china_mainland" || price.provider_region === "cn";
                      const borderClass = isCheapest
                        ? "border-success/40 bg-success/5"
                        : isDomestic
                          ? "border-cyan/20 bg-cyan/5"
                          : isOfficial
                            ? "border-primary/20 bg-primary-soft/30"
                            : "border-white/10 bg-white/[0.02]";

                      return (
                        <div key={price.pricing_id} className={`rounded-lg border ${borderClass} p-3 transition hover:border-white/20`}>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isCheapest && <Crown className="w-3.5 h-3.5 text-success shrink-0" />}
                              <span className="text-xs font-medium text-white truncate">{platformLabel(price)}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 shrink-0">{CHANNEL_LABEL[price.channel] ?? price.channel}</span>
                          </div>
                          <div className="flex items-end justify-between gap-2">
                            <div>
                              <p className="text-[10px] text-slate-500">输入 / 1M</p>
                              <p className={`text-sm font-bold ${isCheapest ? "text-success" : "text-white"}`}>
                                {formatPrice(price.input_per_1m_usd, price.currency_native, isDomestic)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-500">输出 / 1M</p>
                              <p className="text-sm font-semibold text-slate-300">
                                {formatPrice(price.output_per_1m_usd, price.currency_native, isDomestic)}
                              </p>
                            </div>
                          </div>
                          {isDomestic && (
                            <p className="mt-1.5 text-[10px] text-cyan">国内渠道</p>
                          )}
                          {!isDomestic && price.region === "overseas" && (
                            <p className="mt-1.5 text-[10px] text-slate-500">海外渠道</p>
                          )}
                        </div>
                      );
                    })}
                </div>

                {hasMultiplePlatforms && official && cheapest.pricing_id !== official.pricing_id && (
                  <div className="mt-3 flex items-center gap-2 rounded-md border border-success/20 bg-success/5 px-3 py-2 text-xs">
                    <TrendingDown className="w-3.5 h-3.5 text-success shrink-0" />
                    <span className="text-slate-300">
                      最低价在 <span className="font-semibold text-white">{platformLabel(cheapest)}</span>，
                      比官方价便宜 <span className="font-semibold text-success">{savings}%</span>
                      {cheapest.input_per_1m_usd != null && official.input_per_1m_usd != null && (
                        <span className="text-slate-500">（${cheapest.input_per_1m_usd.toFixed(2)} vs ${official.input_per_1m_usd.toFixed(2)}）</span>
                      )}
                    </span>
                  </div>
                )}

                <div className="mt-3 flex justify-end">
                  <Link
                    href={`/models/${encodeURIComponent(group.model_slug)}`}
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary-hover"
                  >
                    查看完整价格表 <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SiteDisclaimer />
    </div>
  );
}
