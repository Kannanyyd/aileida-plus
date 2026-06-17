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
  TrendingUp,
} from "lucide-react";
import { HeroSearch } from "@/components/hero-search";
import { DataOverviewCards } from "@/components/data-overview-cards";
import { PriceChangeList } from "@/components/price-change-list";
import { ModelCard } from "@/components/model-card";
import { SiteDisclaimer } from "@/components/model-strengths";
import {
  dashboardOverview,
  dataFreshnessOverview,
  getRecentPriceChanges,
  listOfficialCurrentCatalog,
  listLatestModelCandidates,
  listModels,
  listProviders,
} from "@/lib/db/queries";
import { rank, RANKING_PRESETS } from "@/lib/rank/score";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "AI 模型价格雷达 | 国内 / 海外 API 价格与成本选型",
  description:
    "追踪 AI 模型 API 价格、官方价、聚合平台价、云平台价、国内价、按美元折算、最新模型发现和数据可信度。",
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

function familyKey(value: { model_family?: string | null; family?: string | null; model_slug?: string; model_name?: string }) {
  return (value.model_family ?? value.family ?? value.model_slug ?? value.model_name ?? "")
    .toLowerCase()
    .replace(/-(latest|preview|beta|instruct|thinking|reasoning|non-reasoning|fast|turbo|mini|nano|chat|online)$/g, "")
    .replace(/-\d{4,8}$/g, "");
}

function isObsoleteHomepageModel(value: { model_slug?: string | null; model_family?: string | null; official_name?: string | null; official_status?: string | null }) {
  const text = `${value.model_slug ?? ""} ${value.model_family ?? ""} ${value.official_name ?? ""}`.toLowerCase();
  if (value.official_status === "previous" || value.official_status === "deprecated") return true;
  return /\b(deepseek-r1|deepseek-reasoner|gpt-4o|gpt-4-turbo|gpt-4\b|claude-3(?:-|$)|gemini-2\.5|gemini-1\.5|llama-3(?:-|$)|qwen2(?:\.5)?|doubao-1\.5)\b/i.test(text);
}

function selectLatestHomepageCandidates<T extends {
  provider_slug: string;
  selling_platform_provider?: string | null;
  source_provider?: string | null;
  model_family?: string | null;
  family?: string | null;
  model_slug: string;
  lifecycle_tier: string;
  needs_alias_review?: boolean | null;
  data_quality_flags?: string[] | null;
}>(items: T[], limit = 6) {
  const providerCount = new Map<string, number>();
  const familyCount = new Map<string, number>();
  const selected: T[] = [];
  const candidates = [
    ...items.filter((item) => item.lifecycle_tier !== "unknown" && !item.needs_alias_review),
    ...items.filter((item) => item.lifecycle_tier === "unknown" && !item.needs_alias_review),
  ];
  for (const item of candidates) {
    const flags = new Set(item.data_quality_flags ?? []);
    if (flags.has("suspicious_name")) continue;
    const provider = item.selling_platform_provider || item.source_provider || item.provider_slug;
    const family = `${provider}/${familyKey(item)}`;
    if ((providerCount.get(provider) ?? 0) >= 2) continue;
    if ((familyCount.get(family) ?? 0) >= 1) continue;
    providerCount.set(provider, (providerCount.get(provider) ?? 0) + 1);
    familyCount.set(family, (familyCount.get(family) ?? 0) + 1);
    selected.push(item);
    if (selected.length >= limit) break;
  }
  return selected;
}

export default async function HomePage() {
  const [overview, models, domesticModels, changes, providers, latestCandidatesRaw, officialCatalog, freshness] = await Promise.all([
    dashboardOverview(),
    listModels({ limit: 600 }),
    listModels({ limit: 300, region: "china_mainland" }),
    getRecentPriceChanges(8),
    listProviders(),
    listLatestModelCandidates(120),
    listOfficialCurrentCatalog(80),
    dataFreshnessOverview(),
  ]);

  const officialModels = officialCatalog
    .filter((row) => row.homepage_eligible && row.official_source_url && !row.aliases_need_review && !isObsoleteHomepageModel(row))
    .sort((a, b) => Number(b.has_pricing) - Number(a.has_pricing) || Number(b.confidence) - Number(a.confidence))
    .slice(0, 8);

  const domesticValue = rank(domesticModels.length ? domesticModels : models, "domestic", {
    limit: 8,
    diversityMode: true,
    homepageStrict: false,
    hideStale: false,
    hideSuperseded: true,
    hideLegacy: true,
    hideDeprecated: true,
    hideUnknown: true,
    requireOfficialCurrent: false,
    maxPerProvider: 2,
    maxPerFamily: 1,
  }).items;
  const latestCandidates = selectLatestHomepageCandidates(latestCandidatesRaw, 6);

  const sourceStale = (freshness.source_age_hours ?? 999) > 12 || (freshness.pricing_age_hours ?? 999) > 12;

  return (
    <div className="space-y-8">
      <section className="glass mx-auto max-w-6xl p-5 text-center sm:p-7 lg:p-8">
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs text-primary">
          <Radar className="h-3 w-3" /> 官方 API · 云平台 · 聚合平台 · 国内价
        </div>
        <h1 className="mx-auto max-w-4xl text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl">
          AI 模型价格雷达
          <br />
          <span className="gradient-text">看清国内 / 海外 API 调用成本</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
          这里不是 AI 工具导航。本站追踪模型、价格、来源、更新时间和数据质量，帮助你判断 DeepSeek、通义千问、Kimi、豆包、OpenAI、Claude、Gemini 等模型的真实调用成本。
        </p>
        <div className="mt-7 flex justify-center">
          <HeroSearch />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link href="/rankings/domestic" className="inline-flex h-10 items-center gap-1.5 rounded-md brand-gradient px-4 text-sm font-semibold text-white transition hover:shadow-glow">
            <TrendingUp className="h-3.5 w-3.5" /> 国内人民币价格榜
          </Link>
          <Link href="/rankings/frontier-value" className="inline-flex h-10 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10">
            <Database className="h-3.5 w-3.5" /> 官方当前主力榜
          </Link>
        </div>

        <div className="mx-auto mt-7 grid max-w-4xl gap-2 sm:grid-cols-3">
          {[
            { label: "模型发现检查", date: freshness.latest_model_discovery_checked_at, age: freshness.source_age_hours },
            { label: "价格来源检查", date: freshness.latest_pricing_checked_at, age: freshness.pricing_age_hours },
            { label: "国内价更新", date: freshness.latest_cny_pricing_checked_at, age: freshness.cny_pricing_age_hours },
          ].map((item) => (
            <div key={item.label} className={`rounded-md border bg-white/[0.03] px-3 py-2 text-left ${freshnessTone(item.age)}`}>
              <div className="flex items-center gap-1.5 text-[11px]">
                <Clock3 className="h-3 w-3" />
                <span>{item.label}</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-white">{relativeTime(item.date)}</p>
            </div>
          ))}
        </div>

        {sourceStale && (
          <div className="mx-auto mt-3 flex max-w-2xl items-center justify-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            <AlertTriangle className="h-3.5 w-3.5" />
            部分数据源超过 12 小时未完成检查，首页精选已自动降低来源过期数据权重。
          </div>
        )}

        <div className="surface mx-auto mt-5 max-w-2xl p-4 text-left">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-slate-300">不知道该选哪个模型？</p>
          </div>
          <Link href="/recommend" className="group flex items-center justify-between rounded-md bg-white/[0.03] px-3 py-2.5 transition hover:bg-white/5">
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-home-section="latest-models">
          {latestCandidates.length > 0 ? latestCandidates.map((candidate) => (
            <Link
              key={candidate.id}
              href={`/models/${encodeURIComponent(candidate.model_slug)}`}
              className="glass p-4 transition hover:border-primary/40"
              data-home-card="latest-model"
              data-home-provider={candidate.selling_platform_provider || candidate.source_provider || candidate.provider_slug}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-white">{candidate.model_name}</p>
                <span className={candidate.needs_pricing_review ? "text-[10px] text-warning" : "text-[10px] text-success"}>
                  {candidate.needs_pricing_review ? "价格待确认" : "已收录价格"}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {candidate.provider_slug} / {candidate.lifecycle_tier === "unknown" ? "待确认" : candidate.lifecycle_tier} / {relativeTime(candidate.last_seen_at)}
              </p>
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
              <p className="mt-1 text-xs text-slate-500">优先展示国内价，隐藏来源过期、旧模型和待人工确认数据。</p>
            </div>
            <Link href="/rankings/domestic" className="text-xs text-primary hover:underline">Top 50</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2" data-home-section="domestic-ranking">
            {domesticValue.slice(0, 6).map((item) => {
              const model = domesticModels.find((candidate) => candidate.model_id === item.model_id) ?? models.find((candidate) => candidate.model_id === item.model_id);
              return model ? <div key={`${item.provider}-${item.model_slug}`} data-home-card="domestic-model"><ModelCard m={model} /></div> : null;
            })}
          </div>
        </div>

        <div className="glass p-5" data-home-section="official-current">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">官方当前主力模型</h2>
              <p className="mt-0.5 text-xs text-slate-500">来自 official-current catalog；价格未确认的模型会明确标记，不参与性价比排序。</p>
            </div>
            <Link href="/models/new" className="text-xs text-primary hover:text-primary-hover">查看发现列表 →</Link>
          </div>
          <ul className="space-y-1.5">
            {officialModels.map((item, index) => {
              const priced = models.find((model) =>
                model.official_current_model_slug === item.model_slug ||
                model.model_slug === item.model_slug ||
                model.canonical_model_slug?.endsWith(`/${item.model_slug}`),
              );
              return (
                <li key={`${item.provider_slug}-${item.model_slug}`} className="flex items-center gap-3 rounded-md border border-white/10 px-3 py-2.5 hover:bg-white/5" data-home-card="official-model">
                  <span className="w-6 shrink-0 font-mono text-sm text-slate-500">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/models/${encodeURIComponent(priced?.model_slug ?? item.model_slug)}`} className="block truncate text-sm font-medium text-white hover:text-primary">
                      {priced?.model_name ?? item.official_name}
                    </Link>
                    <p className="truncate text-[11px] text-slate-500">{item.provider_slug} · {item.model_family}</p>
                  </div>
                  {priced ? (
                    <span className="rounded bg-success/10 px-2 py-0.5 text-[10px] text-success">已收录价格</span>
                  ) : (
                    <span className="rounded bg-warning/10 px-2 py-0.5 text-[10px] text-warning">价格待确认</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section>
        <div className="glass p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">价格变化 / 新增价格</h2>
          </div>
          <PriceChangeList changes={changes} />
        </div>
      </section>

      <section data-home-section="ranking-links">
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

      <section data-home-section="providers">
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

      <section className="grid gap-4 md:grid-cols-3" data-home-section="seo-links">
        {[
          { title: "DeepSeek API 价格", href: "/models/deepseek-chat", desc: "查看官方价、国内渠道价和多渠道价格来源。" },
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
