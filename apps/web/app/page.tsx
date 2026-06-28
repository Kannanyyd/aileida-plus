import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Layers,
  Radar,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { HeroSearch } from "@/components/hero-search";
import { ModelCard } from "@/components/model-card";
import { SiteDisclaimer } from "@/components/model-strengths";
import {
  listModels,
  listPlatformComparison,
  listProviders,
  type PlatformPriceRow,
} from "@/lib/db/queries";
import { rank } from "@/lib/rank/score";
import { config } from "@/lib/env";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "AI 模型价格雷达 | 国内 / 海外 API 价格与平台比价",
  description:
    "国内 AI 模型 API 价格对比平台：一眼看清 DeepSeek、通义千问、Kimi、豆包、Claude、GPT 等模型在哪个平台最便宜，国内价、海外价、官方价、聚合平台价横向对比。",
  alternates: { canonical: "/" },
};

/** 热门模型关键词——只展示用户关心的模型 */
const POPULAR_MODEL_KEYWORDS = [
  "gpt-4o", "gpt-5", "o1", "o3",
  "claude-sonnet", "claude-opus", "claude-3-5",
  "gemini-2", "gemini-1.5",
  "deepseek", "qwen", "glm-4", "kimi", "moonshot",
  "doubao", "ernie", "llama-4", "mistral-large", "minimax",
];

function isPopularModel(row: PlatformPriceRow): boolean {
  const slug = (row.model_slug ?? "").toLowerCase();
  const name = (row.model_name ?? "").toLowerCase();
  return POPULAR_MODEL_KEYWORDS.some((kw) => slug.includes(kw) || name.includes(kw));
}

function formatPrice(usd: number | null, isDomestic: boolean): string {
  if (usd == null) return "-";
  if (isDomestic) {
    return `¥${(usd * config.fx.usdCny).toFixed(2)}`;
  }
  return `$${usd.toFixed(2)}`;
}

const PLATFORM_LABEL: Record<string, string> = {
  openrouter: "OpenRouter",
  siliconflow: "硅基流动",
  "aliyun-bailian": "阿里百炼",
  "volcengine-ark": "火山方舟",
  "tencent-cloud": "腾讯云",
  "huawei-cloud": "华为云",
  "baidu-qianfan": "百度千帆",
  minimax: "MiniMax",
  deepseek: "DeepSeek",
  moonshot: "Moonshot",
  zhipu: "智谱",
};

function platformLabel(row: PlatformPriceRow): string {
  if (row.platform && PLATFORM_LABEL[row.platform]) return PLATFORM_LABEL[row.platform];
  if (row.selling_platform_provider) return row.selling_platform_provider;
  if (row.platform) return row.platform;
  if (row.is_official) return "官方 API";
  if (row.channel === "aggregator") return "聚合平台";
  return row.channel;
}

export default async function HomePage() {
  const [models, domesticModels, providers, platformRows] = await Promise.all([
    listModels({ limit: 600 }),
    listModels({ limit: 300, region: "china_mainland" }),
    listProviders(),
    listPlatformComparison(60),
  ]);

  // 国内价格榜 Top 6
  const domesticTop = rank(domesticModels.length ? domesticModels : models, "domestic", {
    limit: 6,
    diversityMode: true,
    hideStale: false,
    hideSuperseded: true,
    hideLegacy: true,
    hideDeprecated: true,
    hideUnknown: true,
    requireOfficialCurrent: false,
    maxPerProvider: 2,
    maxPerFamily: 1,
  }).items;

  // 平台比价——只展示热门模型，按省钱比例排序
  const platformGroups = new Map<string, { model_name: string; model_slug: string; provider_name_zh: string; prices: PlatformPriceRow[]; cheapest: PlatformPriceRow; official: PlatformPriceRow | null }>();
  for (const row of platformRows) {
    if (!row.input_per_1m_usd) continue;
    if (!isPopularModel(row)) continue;
    if (!platformGroups.has(row.model_id)) {
      platformGroups.set(row.model_id, { model_name: row.model_name, model_slug: row.model_slug, provider_name_zh: row.provider_name_zh, prices: [], cheapest: row, official: null });
    }
    const g = platformGroups.get(row.model_id)!;
    g.prices.push(row);
    if (row.input_per_1m_usd < (g.cheapest.input_per_1m_usd ?? 999)) g.cheapest = row;
    if (row.is_official && !g.official) g.official = row;
  }
  const topPlatformSavings = Array.from(platformGroups.values())
    .filter((g) => g.prices.length >= 2) // 至少2个平台才有意义
    .map((g) => {
      const savings = g.official && g.official.input_per_1m_usd && g.cheapest.input_per_1m_usd
        ? Math.round((1 - g.cheapest.input_per_1m_usd / g.official.input_per_1m_usd) * 100)
        : 0;
      return { ...g, savings };
    })
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 6);

  // 国内/海外厂商分类
  const domesticProviders = providers.filter((p) => p.region === "cn").slice(0, 6);
  const overseasProviders = providers.filter((p) => p.region !== "cn").slice(0, 6);

  return (
    <div className="space-y-10">
      {/* Hero - 简洁直接 */}
      <section className="glass mx-auto max-w-4xl px-6 py-10 text-center sm:py-14">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs text-primary">
          <Radar className="h-3 w-3" /> 国内 / 海外 API 价格对比
        </div>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
          哪个平台买 API 最便宜？
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400">
          对比 DeepSeek、通义千问、Kimi、Claude、GPT 等模型在官方 API、云平台、聚合平台上的价格差异，一眼找到最划算的渠道。
        </p>
        <div className="mt-6 flex justify-center">
          <HeroSearch />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link href="/platform-compare" className="inline-flex h-10 items-center gap-1.5 rounded-md brand-gradient px-5 text-sm font-semibold text-white transition hover:shadow-glow">
            <Layers className="h-3.5 w-3.5" /> 平台比价
          </Link>
          <Link href="/rankings/domestic" className="inline-flex h-10 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10">
            <TrendingUp className="h-3.5 w-3.5" /> 国内价格榜
          </Link>
        </div>
      </section>

      {/* 板块1：国内 API 性价比榜 */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-white">
              <span className="text-cyan">国内</span> API 性价比榜
            </h2>
            <p className="mt-1 text-xs text-slate-500">国内可直接购买的平台，人民币价格排序</p>
          </div>
          <Link href="/rankings/domestic" className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover">
            完整榜单 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {domesticTop.map((item) => {
            const model = domesticModels.find((c) => c.model_id === item.model_id) ?? models.find((c) => c.model_id === item.model_id);
            return model ? <ModelCard key={item.model_id} m={model} /> : null;
          })}
        </div>
      </section>

      {/* 板块2：平台比价省钱 */}
      {topPlatformSavings.length > 0 && (
        <section>
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                <TrendingDown className="h-5 w-5 text-success" /> 平台比价省钱
              </h2>
              <p className="mt-1 text-xs text-slate-500">同一模型不同平台价格差异，绿色为最低价</p>
            </div>
            <Link href="/platform-compare" className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover">
              全部比价 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topPlatformSavings.map((item) => {
              const cheapest = item.cheapest;
              const official = item.official;
              const isDomestic = cheapest.is_domestic || cheapest.region === "china_mainland";
              return (
                <Link
                  key={item.model_slug}
                  href={`/models/${encodeURIComponent(item.model_slug)}`}
                  className="glass p-4 transition hover:border-success/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{item.model_name}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">{item.provider_name_zh}</p>
                    </div>
                    {item.savings > 0 && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                        <TrendingDown className="h-2.5 w-2.5" /> {item.savings}%
                      </span>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-success/30 bg-success/5 p-2">
                      <p className="text-[9px] text-slate-500">最低价</p>
                      <p className="text-sm font-bold text-success">{formatPrice(cheapest.input_per_1m_usd, isDomestic)}</p>
                      <p className="text-[9px] text-slate-500 truncate">{platformLabel(cheapest)}</p>
                    </div>
                    {official && official.pricing_id !== cheapest.pricing_id ? (
                      <div className="rounded-md border border-white/10 bg-white/[0.02] p-2">
                        <p className="text-[9px] text-slate-500">官方价</p>
                        <p className="text-sm font-semibold text-slate-400 line-through">{formatPrice(official.input_per_1m_usd, isDomestic)}</p>
                        <p className="text-[9px] text-slate-500 truncate">{platformLabel(official)}</p>
                      </div>
                    ) : (
                      <div className="rounded-md border border-white/10 bg-white/[0.02] p-2">
                        <p className="text-[9px] text-slate-500">平台数</p>
                        <p className="text-sm font-semibold text-slate-300">{item.prices.length} 个</p>
                        <p className="text-[9px] text-slate-500">渠道报价</p>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 板块3：国内/海外平台 */}
      <section>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
              <span className="text-cyan">国内</span>平台
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {domesticProviders.map((provider) => (
                <Link key={provider.slug} href={`/providers/${provider.slug}`} className="glass p-3 transition hover:border-cyan/40">
                  <p className="truncate text-sm font-medium text-white">{provider.name_zh}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{provider.model_count} 个模型</p>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
              <span className="text-primary">海外</span>平台
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {overseasProviders.map((provider) => (
                <Link key={provider.slug} href={`/providers/${provider.slug}`} className="glass p-3 transition hover:border-primary/40">
                  <p className="truncate text-sm font-medium text-white">{provider.name_zh}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{provider.model_count} 个模型</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SiteDisclaimer />
    </div>
  );
}
