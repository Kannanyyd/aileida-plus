import { HeroSearch } from "@/components/hero-search";
import { DataOverviewCards } from "@/components/data-overview-cards";
import { PriceChangeList } from "@/components/price-change-list";
import { PromotionCard } from "@/components/promotion-card";
import { RankingTable } from "@/components/ranking-table";
import { ModelCard } from "@/components/model-card";
import { SiteDisclaimer } from "@/components/model-strengths";
import { Radar, Database, TrendingUp, Tag as TagIcon, Sparkles, Search, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  listModels,
  getRecentPriceChanges,
  listActivePromotions,
  dashboardOverview,
  listProviders,
  listLatestModelCandidates,
} from "@/lib/db/queries";
import { rank, RANKING_PRESETS } from "@/lib/rank/score";

export const revalidate = 60;

const SCENARIO_LINKS = [
  { label: "中文写作", href: "/rankings/writing", icon: "✍️" },
  { label: "代码开发", href: "/rankings/coding", icon: "💻" },
  { label: "客服问答", href: "/recommend?scenario=customer-service", icon: "🤖" },
  { label: "长文档分析", href: "/rankings/long-context", icon: "📄" },
  { label: "多模态任务", href: "/rankings/multimodal", icon: "🖼️" },
  { label: "翻译", href: "/recommend?scenario=translation", icon: "🌐" },
];

const SEO_LINKS = [
  { title: "DeepSeek 与 豆包 成本对比", href: "/compare/deepseek-v3-vs-doubao-pro", desc: "输入 / 输出价格、上下文与适用场景对比" },
  { title: "国内适合高频调用的模型", href: "/rankings/cheapest", desc: "按成本排序，附可用性与上下文信息" },
  { title: "Claude · GPT · Gemini 参考", href: "/rankings", desc: "国际三模型综合性价比与场景建议" },
];

export default async function HomePage() {
  const [overview, models, changes, promotions, providers, latestCandidates] = await Promise.all([
    dashboardOverview(),
    listModels({ limit: 100 }),
    getRecentPriceChanges(8),
    listActivePromotions(6),
    listProviders(),
    listLatestModelCandidates(6),
  ]);

  const ranked = (rank(models, "frontier-value", { limit: 8, diversityMode: true })).items.map((r) => ({
    rank: r.rank,
    model_name: r.model_name,
    model_slug: r.model_slug,
    provider_name_zh: r.provider_name,
    provider_slug: r.provider,
    input_per_1m_usd: r.input_per_1m_usd,
    output_per_1m_usd: r.output_per_1m_usd,
    context_length: r.context_length,
    score: r.score.total,
  }));

  const newModels = [...models]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto pt-8 pb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft border border-primary/30 text-xs text-primary mb-5">
          <Radar className="w-3 h-3" /> 自动监控 · 多源验证 · 不展示无来源价格
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          实时追踪 <span className="gradient-text">AI 模型价格</span>
          <br />
          找到最划算的 API
        </h1>
        <p className="mt-4 text-sm md:text-base text-slate-400 max-w-2xl mx-auto">
          自动监控国内外主流 AI 模型价格、免费额度、上下文长度和最新优惠，帮你快速比较成本、选择模型、控制预算。
        </p>
        <div className="mt-8 flex justify-center">
          <HeroSearch />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/calculator"
            className="px-4 h-10 inline-flex items-center gap-1.5 rounded-xl brand-gradient text-white text-sm font-semibold hover:shadow-glow transition"
          >
            <Database className="w-3.5 h-3.5" /> 计算我的成本
          </Link>
          <Link
            href="/rankings"
            className="px-4 h-10 inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition"
          >
            <TrendingUp className="w-3.5 h-3.5" /> 查看性价比排行
          </Link>
        </div>

        {/* 推荐助手入口 */}
        <div className="mt-8 glass p-4 max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-xs font-medium text-slate-300">不知道怎么选？</p>
          </div>
          <Link
            href="/recommend"
            className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2.5 hover:bg-white/5 transition group"
          >
            <span className="text-xs text-slate-400">
              输入你的使用场景、预算和技术要求，系统帮你筛选合适方案
            </span>
            <Search className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* 数据概览 */}
      <DataOverviewCards data={overview} />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> 最新模型发现
          </h2>
          <Link href="/models/new" className="text-xs text-primary hover:text-primary-hover flex items-center gap-1">
            查看发现列表 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {latestCandidates.length > 0 ? latestCandidates.map((c) => (
            <Link key={c.id} href={`/models/${encodeURIComponent(c.model_slug)}`} className="glass p-4 hover:border-primary/40 transition">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white truncate">{c.model_name}</p>
                <span className={c.needs_pricing_review ? "text-[10px] text-warning" : "text-[10px] text-success"}>
                  {c.needs_pricing_review ? "价格待确认" : "已定价"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{c.provider_slug} · {c.lifecycle_tier}</p>
            </Link>
          )) : (
            <div className="col-span-full glass p-5 text-sm text-slate-500 text-center">
              官方模型发现任务尚未运行。执行 discover:models 后会展示最近发现。
            </div>
          )}
        </div>
      </section>

      {/* 今日动态 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> 今日 AI 动态
          </h2>
          <Link href="/ai-news" className="text-xs text-primary hover:text-primary-hover flex items-center gap-1">
            全部动态 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { count: 2, label: "新模型", href: "/ai-news?category=new-model", color: "text-cyan bg-cyan/10 border-cyan/20" },
            { count: 3, label: "价格变化", href: "/ai-news?category=price-change", color: "text-danger bg-danger/10 border-danger/20" },
            { count: 4, label: "优惠活动", href: "/ai-news?category=promotion", color: "text-warning bg-warning/10 border-warning/20" },
            { count: 1, label: "会员/Plan", href: "/ai-news?category=plan-update", color: "text-[#A855F7] bg-[#A855F7]/10 border-[#A855F7]/20" },
            { count: 1, label: "政策监管", href: "/ai-news?category=policy", color: "text-slate-400 bg-white/5 border-white/10" },
            { count: 2, label: "能力/产品", href: "/ai-news?category=capability", color: "text-primary bg-primary/10 border-primary/20" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="glass p-3 text-center hover:border-primary/40 transition"
            >
              <p className={`text-2xl font-bold ${item.color.split(" ")[0]}`}>{item.count}</p>
              <p className="text-[11px] text-slate-500 mt-1">{item.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 排行榜入口 + 热门场景 */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.keys(RANKING_PRESETS).map((key) => (
            <Link
              key={key}
              href={`/rankings/${key}`}
              className="glass p-4 text-center hover:border-primary/40 transition"
            >
              <p className="text-sm font-semibold text-white">
                {key === "overall" ? "综合榜" :
                  key === "writing" ? "中文写作" :
                    key === "coding" ? "编程" :
                      key === "long-context" ? "长文本" :
                        key === "cheapest" ? "最便宜" :
                          key === "multimodal" ? "多模态" :
                            key === "free-tier" ? "免费额度" : key}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">→</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 热门使用场景推荐 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> 热门使用场景
          </h2>
          <Link href="/recommend" className="text-xs text-primary hover:text-primary-hover flex items-center gap-1">
            所有场景 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {SCENARIO_LINKS.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="glass p-4 flex items-center gap-3 hover:border-primary/40 transition"
            >
              <span className="text-xl">{s.icon}</span>
              <span className="text-sm text-white">{s.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 性价比总榜 + 最新变价 */}
      <section className="grid lg:grid-cols-2 gap-6">
        <RankingTable items={ranked as any} title="综合性价比榜" subtitle="基于价格/上下文/能力/稳定/可信度加权" />
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">最新价格变化</h2>
            <Link href="/admin/changelog" className="text-xs text-primary hover:text-primary-hover">
              全部 →
            </Link>
          </div>
          <PriceChangeList changes={changes} />
        </div>
      </section>

      {/* 最新模型 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">本周新增模型</h2>
          <Link href="/models" className="text-xs text-primary hover:text-primary-hover">
            查看全部 →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {newModels.map((m) => (
            <ModelCard key={m.model_id} m={m} />
          ))}
        </div>
      </section>

      {/* 优惠 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <TagIcon className="w-4 h-4 text-warning" /> 本周热门优惠
          </h2>
          <Link href="/promotions" className="text-xs text-primary hover:text-primary-hover">
            全部优惠 →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.length > 0 ? (
            promotions.map((p) => <PromotionCard key={p.id} p={p as never} />)
          ) : (
            <div className="col-span-full glass p-6 text-sm text-slate-500 text-center">
              暂未抓取到优惠数据。运行 worker 抓取后会自动展示。
            </div>
          )}
        </div>
      </section>

      {/* 厂商 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">已监控厂商</h2>
          <Link href="/providers" className="text-xs text-primary hover:text-primary-hover">
            全部厂商 →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {providers.slice(0, 12).map((p) => (
            <Link
              key={p.slug}
              href={`/providers/${p.slug}`}
              className="glass p-3 text-center hover:border-primary/40 transition"
            >
              <p className="text-sm font-medium text-white truncate">{p.name_zh}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{p.region === "cn" ? "国内" : "国际"}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* SEO 内容 */}
      <section className="grid md:grid-cols-3 gap-4">
        {SEO_LINKS.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="glass p-5 hover:border-primary/40 transition"
          >
            <h3 className="text-sm font-semibold text-white">{it.title}</h3>
            <p className="text-xs text-slate-500 mt-1">{it.desc}</p>
            <p className="text-[11px] text-primary mt-2">查看对比 →</p>
          </Link>
        ))}
      </section>

      {/* 免责声明 */}
      <SiteDisclaimer />
    </div>
  );
}
