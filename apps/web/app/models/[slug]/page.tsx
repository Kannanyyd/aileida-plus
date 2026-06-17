import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Database, ExternalLink, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db/client";
import { modelStrengths } from "@/lib/db/schema";
import { getModelBySlug, getModelPricingList, listModels } from "@/lib/db/queries";
import { getModelTier, scoreModel } from "@/lib/rank/score";
import { formatContext, relativeTime } from "@/lib/utils";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Tag } from "@/components/tag";
import { ModelCard } from "@/components/model-card";
import { ModelStrengthsSection, SiteDisclaimer } from "@/components/model-strengths";
import { PriceTrendChart } from "@/components/price-trend-chart";
import { ReviewSection } from "@/components/review-section";
import { ReviewForm } from "@/components/review-form";
import { PriceSourceBadges, PriceValue, SourceLink } from "@/components/price-trust";

export const revalidate = 300;

const tierLabels: Record<string, string> = {
  current_frontier: "当前前沿模型",
  current_mainstream: "当前主流模型",
  previous_generation: "上一代模型",
  legacy: "旧模型",
  deprecated: "已废弃",
  unknown: "待确认",
};

function nativeFromTieredRules(rules: unknown, key: "input_per_1m" | "output_per_1m" | "cached_input_per_1m") {
  if (!Array.isArray(rules)) return null;
  const value = (rules[0] as Record<string, unknown> | undefined)?.[key];
  return typeof value === "number" ? value : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const model = await getModelBySlug(decoded);
  if (!model) return { title: "模型未收录", description: "AI 模型价格雷达暂未收录该模型。" };
  return {
    title: `${model.model_name} API 价格与多渠道价格表`,
    description: `${model.model_name} 的官方 API 价格、聚合平台价、云平台价、国内价、海外价、价格来源、更新时间和数据质量标记。`,
    alternates: { canonical: `/models/${encodeURIComponent(decoded)}` },
    openGraph: {
      title: `${model.model_name} API 价格`,
      description: `${model.provider_name_zh} ${model.model_name} 多渠道价格与来源信息。`,
      type: "article",
    },
  };
}

export default async function ModelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const model = await getModelBySlug(decoded);
  if (!model) return notFound();

  const [strengthRows, allModels, pricingList] = await Promise.all([
    db.select().from(modelStrengths).where(eq(modelStrengths.model_id, model.model_id)).orderBy(modelStrengths.sort_order),
    listModels({ limit: 220 }),
    getModelPricingList(model.model_id),
  ]);

  const strengths = strengthRows.map((row) => ({ name_zh: row.name_zh, category: row.category }));
  const tier = getModelTier(model);
  const recommendForNewProject = tier === "current_frontier" || tier === "current_mainstream";
  const variant = model.need_manual_review
    ? "review"
    : model.confidence_score >= 0.85
      ? "official"
      : model.confidence_score >= 0.7
        ? "multi-source"
        : "third-party";

  const currentScore = scoreModel(model, allModels).total;
  const stronger = allModels
    .filter((item) => item.model_id !== model.model_id && scoreModel(item, allModels).total > currentScore)
    .slice(0, 2);
  const cheaper = allModels
    .filter((item) => item.model_id !== model.model_id && (item.input_per_1m_usd ?? 999) < (model.input_per_1m_usd ?? 999) && !["legacy", "deprecated"].includes(getModelTier(item)))
    .slice(0, 2);
  const sameProviderNewer = allModels
    .filter((item) => item.model_id !== model.model_id && item.provider_id === model.provider_id && ["current_frontier", "current_mainstream"].includes(getModelTier(item)))
    .slice(0, 2);
  const domesticAlt = allModels
    .filter((item) => item.model_id !== model.model_id && (item.provider_region === "cn" || item.is_domestic || item.pricing_region === "china_mainland"))
    .slice(0, 2);
  const overseasOfficialAlt = allModels
    .filter((item) => item.model_id !== model.model_id && item.provider_region !== "cn" && item.is_official)
    .slice(0, 2);
  const similar = allModels
    .filter((item) => item.model_id !== model.model_id && (item.provider_id === model.provider_id || item.model_family === model.model_family || item.family === model.family))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="glass p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">
              <Link href="/models" className="hover:text-primary">模型库</Link> / {model.provider_name_zh}
            </p>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
              {model.model_name}
              <ConfidenceBadge variant={variant as never} />
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {model.provider_name_zh} · {model.provider_region === "cn" ? "国内厂商" : "海外厂商"}
              {model.context_length ? ` · 上下文 ${formatContext(model.context_length)}` : ""}
            </p>
            <div className="mt-3 flex gap-1.5 flex-wrap">
              <Tag variant={recommendForNewProject ? "primary" : "warning"}>{tierLabels[tier] ?? tier}</Tag>
              <Tag variant={recommendForNewProject ? "success" : "danger"}>{recommendForNewProject ? "建议新项目关注" : "不建议作为默认新项目首选"}</Tag>
              {(model.capabilities ?? []).map((capability) => <Tag key={capability} variant="primary">{capability}</Tag>)}
              {(model.modality ?? []).map((modality) => <Tag key={modality} variant="cyan">{modality}</Tag>)}
              {(model.data_quality_flags ?? []).map((flag) => <Tag key={flag} variant="warning">{flag}</Tag>)}
            </div>
          </div>
        </div>
      </section>

      {strengths.length > 0 && <ModelStrengthsSection strengths={strengths} modelName={model.model_name} />}

      <section className="glass p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-white">多渠道价格表</h2>
            <p className="text-[11px] text-slate-500 mt-1">展示模型所有者、销售平台、采集来源、国内价、海外价、参考价、来源链接、更新时间和质量标记。</p>
          </div>
          <span className="text-[11px] text-slate-500">{pricingList.length} 条价格</span>
        </div>
        {pricingList.length === 0 ? (
          <p className="text-sm text-warning">价格待确认。该模型可出现在最新模型发现中，但不会进入价格榜。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-slate-500">
                  <th className="py-2 text-left font-normal">区域</th>
                  <th className="py-2 text-left font-normal">渠道</th>
                  <th className="py-2 text-left font-normal">平台关系</th>
                  <th className="py-2 text-right font-normal">输入价 / 1M</th>
                  <th className="py-2 text-right font-normal">输出价 / 1M</th>
                  <th className="py-2 text-right font-normal">缓存价 / 1M</th>
                  <th className="py-2 text-left font-normal">来源与质量</th>
                  <th className="py-2 text-right font-normal">更新时间</th>
                </tr>
              </thead>
              <tbody>
                {pricingList.map((price) => {
                  const preferCny = price.currency_native === "CNY" || price.is_domestic || price.region === "china_mainland";
                  const estimated = preferCny && price.currency_native !== "CNY";
                  return (
                    <tr key={price.id} className="border-b border-white/5 align-top hover:bg-white/5">
                      <td className="py-3"><span className={`rounded px-1.5 py-0.5 text-[10px] ${preferCny ? "bg-cyan/10 text-cyan" : "bg-primary/10 text-primary"}`}>{price.region}</span></td>
                      <td className="py-3 text-slate-300">
                        <p>{price.channel}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-500">{price.platform || price.primary_source_id}</p>
                      </td>
                      <td className="py-3 text-[10px] text-slate-500">
                        <p>模型所有者：<span className="font-mono text-slate-300">{model.model_owner_provider}</span></p>
                        <p>销售平台：<span className="font-mono text-slate-300">{price.selling_platform_provider || model.model_selling_platform_provider || "-"}</span></p>
                        <p>采集来源：<span className="font-mono text-slate-300">{price.source_provider || price.primary_source_id}</span></p>
                      </td>
                      <td className="py-3 text-right"><PriceValue usd={price.input_per_1m_usd} nativeCny={nativeFromTieredRules(price.tiered_rules, "input_per_1m")} currencyNative={price.currency_native} estimatedCurrency={estimated} preferCny={preferCny} compact /></td>
                      <td className="py-3 text-right"><PriceValue usd={price.output_per_1m_usd} nativeCny={nativeFromTieredRules(price.tiered_rules, "output_per_1m")} currencyNative={price.currency_native} estimatedCurrency={estimated} preferCny={preferCny} compact /></td>
                      <td className="py-3 text-right"><PriceValue usd={price.input_cached_read_per_1m_usd} nativeCny={nativeFromTieredRules(price.tiered_rules, "cached_input_per_1m")} currencyNative={price.currency_native} estimatedCurrency={estimated} preferCny={preferCny} compact /></td>
                      <td className="py-3">
                        <PriceSourceBadges isOfficial={price.is_official} isAggregator={price.is_aggregator} channel={price.channel} isDomestic={preferCny} currencyNative={price.currency_native} estimatedCurrency={estimated} confidence={price.confidence_score} flags={price.data_quality_flags} />
                        <div className="mt-1"><SourceLink href={price.source_url} label={price.primary_source_id || "来源"} /></div>
                      </td>
                      <td className="py-3 text-right text-slate-400">{relativeTime(price.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="glass p-5">
        <h2 className="text-sm font-semibold text-white mb-4">价格历史</h2>
        <PriceTrendChart data={[]} field="input" />
      </section>

      <ReviewSection reviews={[]} summary={{ count: 0, avgOverall: 0, dims: {} }} modelSlug={decoded} />
      <ReviewForm modelSlug={decoded} />

      <section>
        <h2 className="text-sm font-semibold text-white mb-3">替代模型</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { title: "更强但更贵", items: stronger },
            { title: "更便宜但能力较弱", items: cheaper },
            { title: "同厂商新版", items: sameProviderNewer },
            { title: "国内可用替代", items: domesticAlt },
            { title: "海外官方替代", items: overseasOfficialAlt },
          ].map((group) => (
            <div key={group.title} className="glass p-3">
              <p className="text-xs font-semibold text-white mb-2">{group.title}</p>
              <div className="space-y-1.5">
                {group.items.length > 0 ? group.items.map((item) => (
                  <Link key={item.model_id} href={`/models/${encodeURIComponent(item.model_slug)}`} className="block text-[11px] text-slate-300 hover:text-primary truncate">
                    {item.model_name}
                    <span className="block text-[10px] text-slate-600">{item.provider_name_zh}</span>
                  </Link>
                )) : <p className="text-[11px] text-slate-500">暂无候选</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {similar.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-3">相似模型</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {similar.map((item) => <ModelCard key={item.model_id} m={item} />)}
          </div>
        </section>
      )}

      <section className="glass p-5">
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> 数据可信度</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          {[
            ["模型所有者", model.model_owner_provider],
            ["规范厂商", model.canonical_provider_slug],
            ["销售平台", model.model_selling_platform_provider || model.selling_platform_provider],
            ["采集来源", model.model_source_provider || model.source_provider],
            ["规范模型", model.canonical_model_slug],
            ["模型家族", model.model_family],
            ["模型变体", model.model_variant],
            ["来源模型 ID", model.source_model_id],
          ].map(([label, value]) => (
            <div key={label} className="rounded border border-white/10 bg-white/3 p-2">
              <p className="text-[10px] text-slate-500">{label}</p>
              <p className="mt-0.5 font-mono text-[11px] text-white break-all">{value || "待确认"}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <Database className="w-3.5 h-3.5 text-primary" />
          主要来源：
          <a href={model.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            {model.primary_source_id || "来源"} <ExternalLink className="w-3 h-3" />
          </a>
          · 更新于 {relativeTime(model.updated_at)}
        </p>
      </section>

      <SiteDisclaimer />
    </div>
  );
}
