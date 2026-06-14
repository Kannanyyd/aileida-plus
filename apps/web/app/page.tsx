import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  Database,
  Radar,
  Search,
  Sparkles,
  Tag as TagIcon,
  TrendingUp,
} from "lucide-react";
import { HeroSearch } from "@/components/hero-search";
import { DataOverviewCards } from "@/components/data-overview-cards";
import { PriceChangeList } from "@/components/price-change-list";
import { PromotionCard } from "@/components/promotion-card";
import { RankingTable } from "@/components/ranking-table";
import { ModelCard } from "@/components/model-card";
import { SiteDisclaimer } from "@/components/model-strengths";
import {
  dashboardOverview,
  dataFreshnessOverview,
  getRecentPriceChanges,
  listActivePromotions,
  listLatestModelCandidates,
  listModels,
  listProviders,
} from "@/lib/db/queries";
import { rank, RANKING_PRESETS } from "@/lib/rank/score";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "AI模型价格雷达 | 国内/海外 API 价格与模型选型情报",
  description: "追踪 AI 模型 API 价格、官方价、聚合平台价、云平台价、原生人民币价格、最新模型发现和数据可信度。",
  alternates: { canonical: "/" },
};

function relativeTime(date: Date | string | null | undefined) {
  if (!date) return "待确认";
  const time = new Date(date).getTime();
  if (!Number.isFinite(time)) return "待确认";
  const hours = Math.max(0, Math.round((Date.now() - time) / (1000 * 60 * 60)));
  if (hours < 1) return "1 小时内";
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.round(hours / 24)} 天前`;
}

function freshnessTone(age: number | null) {
  if (age == null) return "border-slate-700 text-slate-400";
  if (age <= 12) return "border-success/30 text-success";
  if (age <= 24) return "border-warning/40 text-warning";
  return "border-danger/40 text-danger";
}

function rankItemForTable(item: any) {
  return {
    rank: item.rank,
    model_name: item.model_name,
    model_slug: item.model_slug,
    provider_name_zh: item.provider_name,
    provider_slug: item.provider,
    input_per_1m_usd: item.input_per_1m_usd,
    output_per_1m_usd: item.output_per_1m_usd,
    context_length: item.context_length,
    score: item.score.total,
  };
}

export default async function HomePage() {
  const [overview, models, domesticModels, changes, promotions, providers, latestCandidates, freshness] = await Promise.all([
    dashboardOverview(),
    listModels({ limit: 160 }),
    listModels({ limit: 80, region: "china_mainland" }),
    getRecentPriceChanges(8),
    listActivePromotions(6),
    listProviders(),
    listLatestModelCandidates(6),
    dataFreshnessOverview(),
  ]);

  const curatedValue = rank(models, "frontier-value", {
    limit: 8,
    diversityMode: true,
    homepageStrict: true,
    maxSourceAgeHours: 12,
    hideStale: true,
    hideSuperseded: true,
    hideLegacy: true,
    hideDeprecated: true,
    hideUnknown: true,
    requireOfficialCurrent: true,
    maxPerProvider: 2,
    maxPerFamily: 1,
  }).items;

  const domesticValue = rank(domesticModels.length ? domesticModels : models, "domestic", {
    limit: 6,
    diversityMode: true,
    homepageStrict: true,
    maxSourceAgeHours: 12,
    hideStale: true,
    hideSuperseded: true,
    hideLegacy: true,
    hideDeprecated: true,
    hideUnknown: true,
    requireOfficialCurrent: true,
    maxPerProvider: 2,
    maxPerFamily: 1,
  }).items;

  const sourceStale = (freshness.source_age_hours ?? 999) > 12 || (freshness.pricing_age_hours ?? 999) > 12;

  return (
    <div className="space-y-10">
      <section className="mx-auto max-w-4xl pt-8 pb-4 text-center">
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs text-primary">
          <Radar className="h-3 w-3" /> 官方价 / 聚合价 / 云平台价 / 原生人民币价
        </div>
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          面向 API 选型的
          <br />
          <span className="gradient-text">模型价格情报台</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
          持续核对国内与海外模型 API 成本、来源、更新时间和数据质量。用一张雷达图景判断 DeepSeek、通义千问、Kimi、豆包、OpenAI、Claude、Gemini 等模型的真实调用成本。
        </p>
        <div className="mt-8 flex justify-center">
          <HeroSearch />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link href="/rankings/domestic" className="inline-flex h-10 items-center gap-1.5 rounded-xl brand-gradient px-4 text-sm font-semibold text-white transition hover:shadow-glow">
            <TrendingUp className="h-3.5 w-3.5" /> 国内人民币价格榜
          </Link>
          <Link href="/rankings/frontier-value" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10">
            <Database className="h-3.5 w-3.5" /> 当前主力精选榜
          </Link>
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl gap-2 sm:grid-cols-3">
          {[
            { label: "模型发现检查", date: freshness.latest_model_discovery_checked_at, age: freshness.source_age_hours },
            { label: "价格源检查", date: freshness.latest_pricing_checked_at, age: freshness.pricing_age_hours },
            { label: "国内 CNY 更新", date: freshness.latest_cny_pricing_checked_at, age: freshness.cny_pricing_age_hours },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl border bg-white/3 px-3 py-2 text-left ${freshnessTone(item.age)}`}>
              <div className="flex items-center gap-1.5 text-[11px]">
                <Clock3 className="h-3 w-3" />
                <span>{item.label}</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-white">{relativeTime(item.date)}</p>
            </div>
          ))}
        </div>

        {sourceStale && (
          <div className="mx-auto mt-3 flex max-w-2xl items-center justify-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            <AlertTriangle className="h-3.5 w-3.5" />
            部分数据源超过 12 小时未完成检查，首页精选已自动降低 stale 数据权重。
          </div>
        )}

        <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-slate-300">不知道该选哪个模型？</p>
          </div>
          <Link href="/recommend" className="group flex items-center justify-between rounded-lg bg-white/3 px-3 py-2.5 transition hover:bg-white/5">
            <span className="text-xs text-slate-400">
              输入场景、预算、国内/海外、官方/聚合和币种偏好，获取带理由与替代方案的选型建议。
            </span>
            <Search className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <DataOverviewCards data={overview} />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Sparkles className="h-4 w-4 text-primary" /> 最新模型发现
          </h2>
          <Link href="/models/new" className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover">
            查看发现列表 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {latestCandidates.length > 0 ? latestCandidates.map((candidate) => (
            <Link key={candidate.id} href={`/models/${encodeURIComponent(candidate.model_slug)}`} className="glass p-4 transition hover:border-primary/40">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-white">{candidate.model_name}</p>
                <span className={candidate.needs_pricing_review ? "text-[10px] text-warning" : "text-[10px] text-success"}>
                  {candidate.needs_pricing_review ? "价格待确认" : "已收录价格"}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{candidate.provider_slug} / {candidate.lifecycle_tier} / {relativeTime(candidate.last_seen_at)}</p>
              {candidate.source_url && <p className="mt-2 truncate text-[10px] text-primary">来源：{candidate.source_url}</p>}
            </Link>
          )) : (
            <div className="glass col-span-full p-5 text-center text-sm text-slate-500">
              暂无最近官方模型发现。下一次 discovery 任务完成后会自动更新。
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">国内人民币价格榜</h2>
              <p className="mt-1 text-xs text-slate-500">优先原生 CNY，隐藏 stale、旧模型和待人工确认数据。</p>
            </div>
            <Link href="/rankings/domestic" className="text-xs text-primary hover:underline">Top 50</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {domesticValue.slice(0, 4).map((item) => {
              const model = domesticModels.find((candidate) => candidate.model_id === item.model_id) ?? models.find((candidate) => candidate.model_id === item.model_id);
              return model ? <ModelCard key={`${item.provider}-${item.model_slug}`} m={model} /> : null;
            })}
          </div>
        </div>

        <div>
          <RankingTable
            items={curatedValue.map(rankItemForTable)}
            title="当前主力精选 Top 8"
            subtitle="12 小时 freshness 优先，隐藏旧模型、unknown、stale 和同系列重复。"
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">价格变化 / 新增价格</h2>
            <Link href="/admin/changelog" className="text-xs text-primary hover:text-primary-hover">全部</Link>
          </div>
          <PriceChangeList changes={changes} />
        </div>

        <div className="glass p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <TagIcon className="h-4 w-4 text-warning" /> 活动价与优惠
            </h2>
            <Link href="/promotions" className="text-xs text-primary hover:text-primary-hover">全部</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {promotions.length > 0 ? promotions.slice(0, 4).map((promotion) => (
              <PromotionCard key={promotion.id} p={promotion as never} />
            )) : (
              <div className="col-span-full rounded-lg border border-white/10 bg-white/3 p-5 text-center text-sm text-slate-500">
                暂无活动价数据。
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">排行榜入口</h2>
          <Link href="/rankings" className="text-xs text-primary hover:text-primary-hover">全部榜单</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {Object.keys(RANKING_PRESETS).slice(0, 12).map((key) => (
            <Link key={key} href={`/rankings/${key}`} className="glass p-4 text-center transition hover:border-primary/40">
              <p className="text-sm font-semibold text-white">{key}</p>
              <p className="mt-1 text-[10px] text-slate-500">查看 Top 20 / 50 / 100</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">已监控厂商</h2>
          <Link href="/providers" className="text-xs text-primary hover:text-primary-hover">全部厂商</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {providers.slice(0, 12).map((provider) => (
            <Link key={provider.slug} href={`/providers/${provider.slug}`} className="glass p-3 text-center transition hover:border-primary/40">
              <p className="truncate text-sm font-medium text-white">{provider.name_zh}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">{provider.region === "cn" ? "国内" : "海外"} / {provider.model_count} 模型</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { title: "DeepSeek API 价格", href: "/models/deepseek-chat", desc: "查看官方价、国内渠道价和多渠道来源。" },
          { title: "Kimi API 价格", href: "/models/kimi-k2.6", desc: "查看 Moonshot / Kimi 模型人民币价格覆盖。" },
          { title: "通义千问 API 价格", href: "/rankings/domestic", desc: "从国内榜单对比 Qwen、百炼和其他平台价。" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="glass p-5 transition hover:border-primary/40">
            <h3 className="text-sm font-semibold text-white">{item.title}</h3>
            <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
            <p className="mt-2 text-[11px] text-primary">查看价格 <ArrowRight className="inline h-3 w-3" /></p>
          </Link>
        ))}
      </section>

      <SiteDisclaimer />
    </div>
  );
}
