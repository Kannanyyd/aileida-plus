import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Database, Radar, Search, Sparkles, Tag as TagIcon, TrendingUp } from "lucide-react";
import { HeroSearch } from "@/components/hero-search";
import { DataOverviewCards } from "@/components/data-overview-cards";
import { PriceChangeList } from "@/components/price-change-list";
import { PromotionCard } from "@/components/promotion-card";
import { RankingTable } from "@/components/ranking-table";
import { ModelCard } from "@/components/model-card";
import { SiteDisclaimer } from "@/components/model-strengths";
import {
  dashboardOverview,
  getRecentPriceChanges,
  listActivePromotions,
  listLatestModelCandidates,
  listModels,
  listProviders,
} from "@/lib/db/queries";
import { rank, RANKING_PRESETS } from "@/lib/rank/score";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "AI模型价格雷达",
  description: "追踪 AI API 国内人民币价格、海外美元价格、官方价、聚合价、云平台价、最新模型发现和价格待确认提醒。",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [overview, models, domesticModels, changes, promotions, providers, latestCandidates] = await Promise.all([
    dashboardOverview(),
    listModels({ limit: 120 }),
    listModels({ limit: 60, region: "china_mainland" }),
    getRecentPriceChanges(8),
    listActivePromotions(6),
    listProviders(),
    listLatestModelCandidates(6),
  ]);

  const globalValue = rank(models, "frontier-value", { limit: 8, diversityMode: true }).items.map((item) => ({
    rank: item.rank,
    model_name: item.model_name,
    model_slug: item.model_slug,
    provider_name_zh: item.provider_name,
    provider_slug: item.provider,
    input_per_1m_usd: item.input_per_1m_usd,
    output_per_1m_usd: item.output_per_1m_usd,
    context_length: item.context_length,
    score: item.score.total,
  }));
  const domesticValue = rank(domesticModels.length ? domesticModels : models, "domestic", { limit: 6, diversityMode: true }).items;

  return (
    <div className="space-y-10">
      <section className="max-w-3xl mx-auto pt-8 pb-4 text-center">
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs text-primary">
          <Radar className="w-3 h-3" /> 官方价 · 聚合价 · 云平台价 · 原生人民币价
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          AI 模型价格雷达
          <br />
          <span className="gradient-text">对比国内 / 海外 API 成本</span>
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-sm md:text-base text-slate-400">
          这里不是 AI 工具导航站。本站追踪模型、价格、来源、更新时间和数据质量，帮助你判断 DeepSeek、通义千问、Kimi、豆包、OpenAI、Claude、Gemini 等模型的真实调用成本。
        </p>
        <div className="mt-8 flex justify-center">
          <HeroSearch />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link href="/rankings/domestic" className="inline-flex h-10 items-center gap-1.5 rounded-xl brand-gradient px-4 text-sm font-semibold text-white hover:shadow-glow transition">
            <TrendingUp className="w-3.5 h-3.5" /> 国内人民币价格榜
          </Link>
          <Link href="/rankings/frontier-value" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10 transition">
            <Database className="w-3.5 h-3.5" /> 全球性价比榜
          </Link>
        </div>

        <div className="mt-8 glass p-4 max-w-xl mx-auto text-left">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium text-slate-300">不知道该选哪个模型？</p>
          </div>
          <Link href="/recommend" className="group flex items-center justify-between rounded-lg bg-white/3 px-3 py-2.5 hover:bg-white/5 transition">
            <span className="text-xs text-slate-400">
              输入场景、预算、国内/海外、官方/聚合和币种偏好，获取带理由与替代方案的选型建议。
            </span>
            <Search className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      <DataOverviewCards data={overview} />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> 最新模型发现
          </h2>
          <Link href="/models/new" className="text-xs text-primary hover:text-primary-hover flex items-center gap-1">
            查看发现列表 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {latestCandidates.length > 0 ? latestCandidates.map((candidate) => (
            <Link key={candidate.id} href={`/models/${encodeURIComponent(candidate.model_slug)}`} className="glass p-4 hover:border-primary/40 transition">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white truncate">{candidate.model_name}</p>
                <span className={candidate.needs_pricing_review ? "text-[10px] text-warning" : "text-[10px] text-success"}>
                  {candidate.needs_pricing_review ? "价格待确认" : "已收录价格"}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{candidate.provider_slug} · {candidate.lifecycle_tier}</p>
              {candidate.source_url && <p className="mt-2 text-[10px] text-primary truncate">来源：{candidate.source_url}</p>}
            </Link>
          )) : (
            <div className="col-span-full glass p-5 text-center text-sm text-slate-500">
              暂无最近官方模型发现。下一次 discovery 任务完成后会自动更新。
            </div>
          )}
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="glass p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">国内人民币价格榜</h2>
              <p className="text-xs text-slate-500 mt-1">优先展示原生 CNY；美元换算会在榜单页标记为估算。</p>
            </div>
            <Link href="/rankings/domestic" className="text-xs text-primary hover:underline">Top 50</Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {domesticValue.slice(0, 4).map((item) => {
              const model = domesticModels.find((candidate) => candidate.model_slug === item.model_slug) ?? models.find((candidate) => candidate.model_slug === item.model_slug);
              return model ? <ModelCard key={`${item.provider}-${item.model_slug}`} m={model} /> : null;
            })}
          </div>
        </div>

        <div className="glass p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">全球模型性价比榜</h2>
              <p className="text-xs text-slate-500 mt-1">综合价格、能力、新鲜度、来源可信度和同厂商去重。</p>
            </div>
            <Link href="/rankings/frontier-value" className="text-xs text-primary hover:underline">Top 100</Link>
          </div>
          <RankingTable items={globalValue as any} title="精选 Top 8" subtitle="默认隐藏旧模型和待确认模型" />
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="glass p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">价格变化 / 新增价格</h2>
            <Link href="/admin/changelog" className="text-xs text-primary hover:text-primary-hover">全部</Link>
          </div>
          <PriceChangeList changes={changes} />
        </div>

        <div className="glass p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <TagIcon className="w-4 h-4 text-warning" /> 活动价与优惠
            </h2>
            <Link href="/promotions" className="text-xs text-primary hover:text-primary-hover">全部</Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.keys(RANKING_PRESETS).slice(0, 12).map((key) => (
            <Link key={key} href={`/rankings/${key}`} className="glass p-4 text-center hover:border-primary/40 transition">
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {providers.slice(0, 12).map((provider) => (
            <Link key={provider.slug} href={`/providers/${provider.slug}`} className="glass p-3 text-center hover:border-primary/40 transition">
              <p className="text-sm font-medium text-white truncate">{provider.name_zh}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">{provider.region === "cn" ? "国内" : "海外"} · {provider.model_count} 模型</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        {[
          { title: "DeepSeek API价格", href: "/models/deepseek-chat", desc: "查看官方价、国内渠道价和多渠道来源。" },
          { title: "Kimi API价格", href: "/models/kimi-k2.6", desc: "查看 Moonshot / Kimi 模型人民币价格覆盖。" },
          { title: "通义千问 API价格", href: "/rankings/domestic", desc: "从国内榜单对比 Qwen、百炼和其他平台价。" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="glass p-5 hover:border-primary/40 transition">
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
