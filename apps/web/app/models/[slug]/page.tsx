import { notFound } from "next/navigation";
import { getModelBySlug, listModels, getModelPricingList } from "@/lib/db/queries";
import { db } from "@/lib/db/client";
import { modelStrengths } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PriceTrendChart } from "@/components/price-trend-chart";
import { CapabilityRadar } from "@/components/capability-radar";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Tag } from "@/components/tag";
import { ModelStrengthsSection, SiteDisclaimer } from "@/components/model-strengths";
import { ReviewSection } from "@/components/review-section";
import { ReviewForm } from "@/components/review-form";
import { formatCny, formatContext, formatUsd, relativeTime } from "@/lib/utils";
import { ModelCard } from "@/components/model-card";
import { ExternalLink, Calendar, Database } from "lucide-react";
import Link from "next/link";
import { getModelTier, scoreModel } from "@/lib/rank/score";

export const revalidate = 300;

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const m = await getModelBySlug(decoded);
  if (!m) return notFound();

  // 查询擅长方向
  const strengthRows = await db
    .select()
    .from(modelStrengths)
    .where(eq(modelStrengths.model_id, m.model_id))
    .orderBy(modelStrengths.sort_order);

  const strengths = strengthRows.map((s) => ({
    name_zh: s.name_zh,
    category: s.category,
  }));

  // 同厂商/同 family 的相似模型
  const all = await listModels({ limit: 200 });
  const similar = all
    .filter(
      (x) =>
        x.model_id !== m.model_id &&
        (x.provider_id === m.provider_id || x.family === m.family) &&
        (x.capabilities?.some((c) => m.capabilities?.includes(c)) ?? false),
    )
    .slice(0, 4);

  const caps = m.capabilities ?? [];
  const conf = m.confidence_score;
  const variant = m.need_manual_review ? "review" : conf >= 0.85 ? "official" : conf >= 0.7 ? "multi-source" : "third-party";
  const tier = getModelTier(m);
  const tierLabels: Record<string, string> = {
    current_frontier: "current_frontier / 当前前沿",
    current_mainstream: "current_mainstream / 当前主流",
    previous_generation: "previous_generation / 上一代",
    legacy: "legacy / 旧模型",
    deprecated: "deprecated / 已废弃",
    unknown: "unknown / 新旧待判断",
  };
  const recommendForNewProject = tier === "current_frontier" || tier === "current_mainstream";

  // 多渠道价格
  const pricingList = await getModelPricingList(m.model_id);
  const domesticMin = pricingList.filter((p) => p.is_domestic).sort((a, b) => (a.input_per_1m_usd ?? 999) - (b.input_per_1m_usd ?? 999))[0];
  const globalMin = pricingList.filter((p) => !p.is_domestic).sort((a, b) => (a.input_per_1m_usd ?? 999) - (b.input_per_1m_usd ?? 999))[0];
  const isCnyPricing = (p: (typeof pricingList)[number]) =>
    p.currency_native === "CNY" || p.region === "china_mainland" || p.is_domestic;
  const nativeTier = (p: (typeof pricingList)[number]) =>
    Array.isArray(p.tiered_rules) ? (p.tiered_rules[0] as Record<string, unknown> | undefined) : undefined;
  const formatPricingAmount = (
    p: (typeof pricingList)[number],
    usdValue: number | null | undefined,
    nativeKey: "input_per_1m" | "output_per_1m",
  ) => {
    if (isCnyPricing(p)) {
      const native = nativeTier(p)?.[nativeKey];
      if (typeof native === "number") return `¥${native.toFixed(native < 1 ? 3 : 2)}`;
      return formatCny(usdValue);
    }
    return formatUsd(usdValue);
  };
  const stronger = all
    .filter((x) => x.model_id !== m.model_id && ["current_frontier", "current_mainstream"].includes(getModelTier(x)))
    .map((x) => ({ m: x, s: scoreModel(x, all).total }))
    .filter((x) => x.s > scoreModel(m, all).total)
    .sort((a, b) => b.s - a.s)
    .slice(0, 2)
    .map((x) => x.m);
  const cheaper = all
    .filter((x) => x.model_id !== m.model_id && (x.input_per_1m_usd ?? 999) < (m.input_per_1m_usd ?? 999) && !["legacy", "deprecated"].includes(getModelTier(x)))
    .slice(0, 2);
  const sameProviderNewer = all
    .filter((x) => x.model_id !== m.model_id && x.provider_id === m.provider_id && ["current_frontier", "current_mainstream"].includes(getModelTier(x)))
    .slice(0, 2);
  const domesticAlt = all
    .filter((x) => x.model_id !== m.model_id && (x.provider_region === "cn" || x.is_domestic))
    .slice(0, 2);
  const overseasOfficialAlt = all
    .filter((x) => x.model_id !== m.model_id && x.provider_region !== "cn" && x.is_official)
    .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-slate-500 mb-1">
              <Link href="/models" className="hover:text-primary">模型库</Link> / {m.provider_name_zh}
            </p>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
              {m.model_name}
              <ConfidenceBadge variant={variant as never} />
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {m.provider_name_zh} · {m.provider_region === "cn" ? "国内" : "国际"}
              {m.context_length ? ` · 上下文 ${formatContext(m.context_length)}` : ""}
            </p>
            <div className="mt-3 flex gap-1.5 flex-wrap">
              <Tag variant={recommendForNewProject ? "primary" : "warning"}>{tierLabels[tier]}</Tag>
              <Tag variant={recommendForNewProject ? "success" : "danger"}>{recommendForNewProject ? "建议新项目优先评估" : "不建议新项目默认首选"}</Tag>
              {caps.map((c) => <Tag key={c} variant="primary">{c}</Tag>)}
              {m.modality?.map((mo) => <Tag key={mo} variant="cyan">{mo}</Tag>)}
              {m.data_quality_flags?.map((flag) => <Tag key={flag} variant="warning">{flag}</Tag>)}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-500">综合性价比</p>
            <p className="font-mono text-3xl font-bold gradient-text">—</p>
            <p className="text-[11px] text-slate-500 mt-2">更新时间 {relativeTime(m.updated_at)}</p>
          </div>
        </div>
      </div>

      {/* 擅长方向 */}
      {strengths.length > 0 && (
        <ModelStrengthsSection strengths={strengths} modelName={m.model_name} />
      )}

      {/* 多渠道价格 */}
      <div className="glass p-5">
        <h2 className="text-sm font-semibold text-white mb-3">
          多渠道价格对比
          <span className="text-[11px] text-slate-500 ml-2 font-normal">{pricingList.length} 条价格</span>
        </h2>
        {pricingList.length === 0 ? (
          <p className="text-sm text-slate-500">暂未收录价格数据</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-white/5">
                  <th className="text-left py-2 font-normal">区域</th>
                  <th className="text-left py-2 font-normal">渠道</th>
                  <th className="text-left py-2 font-normal">平台</th>
                  <th className="text-right py-2 font-normal">输入/1M</th>
                  <th className="text-right py-2 font-normal">输出/1M</th>
                  <th className="text-right py-2 font-normal">缓存读/1M</th>
                  <th className="text-right py-2 font-normal">更新时间</th>
                  <th className="text-left py-2 font-normal">来源</th>
                  <th className="text-center py-2 font-normal">类型</th>
                  <th className="text-right py-2 font-normal">币种</th>
                </tr>
              </thead>
              <tbody>
                {pricingList.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.is_domestic ? 'bg-cyan/10 text-cyan' : 'bg-primary/10 text-primary'}`}>
                        {p.region === 'china_mainland' ? '国内' : p.region === 'overseas' ? '海外' : '全球'}
                      </span>
                    </td>
                    <td className="py-2 text-slate-300">{p.channel}</td>
                    <td className="py-2 text-white">
                      <span className="font-medium">{p.platform || p.primary_source_id}</span>
                    </td>
                    <td className="py-2 text-right font-mono text-white">
                      {formatPricingAmount(p, p.input_per_1m_usd, "input_per_1m")}
                    </td>
                    <td className="py-2 text-right font-mono text-white">
                      {formatPricingAmount(p, p.output_per_1m_usd, "output_per_1m")}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-300">
                      {isCnyPricing(p) ? formatCny(p.input_cached_read_per_1m_usd) : formatUsd(p.input_cached_read_per_1m_usd)}
                    </td>
                    <td className="py-2 text-right text-slate-400">{relativeTime(p.updated_at)}</td>
                    <td className="py-2 text-left">
                      <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {p.primary_source_id}
                      </a>
                    </td>
                    <td className="py-2 text-center">
                      {p.is_official ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">官方</span>
                      ) : p.is_aggregator ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400">聚合</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400">第三方</span>
                      )}
                    </td>
                    <td className="py-2 text-right text-slate-400">{p.currency_native}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {domesticMin && globalMin && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-cyan/5 border border-cyan/20 rounded-lg p-2">
              <p className="text-slate-500">国内最低价</p>
              <p className="font-mono text-cyan text-sm">
                {domesticMin.platform} {formatPricingAmount(domesticMin, domesticMin.input_per_1m_usd, "input_per_1m")}
              </p>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-2">
              <p className="text-slate-500">海外/全球最低价</p>
              <p className="font-mono text-primary text-sm">
                {globalMin.platform} {formatUsd(globalMin.input_per_1m_usd)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 历史价格 */}
      <div className="glass p-5">
        <h2 className="text-sm font-semibold text-white mb-4">历史价格</h2>
        <PriceTrendChart data={[]} field="input" />
        <p className="text-[11px] text-slate-500 mt-2">历史数据由 llm-prices historical-v1.json 持续补充</p>
      </div>

      {/* 用户点评 */}
      <ReviewSection
        reviews={[]}
        summary={{ count: 0, avgOverall: 0, dims: {} }}
        modelSlug={decoded}
      />
      <ReviewForm modelSlug={decoded} />

      {/* 同类模型 */}
      {similar.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">同类模型</h2>
          <p className="text-[11px] text-slate-500 mb-3">
            以下是来自同厂商或同类别的模型，供你在不同预算和场景下对比参考
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {similar.map((s) => <ModelCard key={s.model_id} m={s} />)}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-white mb-3">推荐替代模型</h2>
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
                {group.items.length > 0 ? group.items.map((x) => (
                  <Link key={x.model_id} href={`/models/${encodeURIComponent(x.model_slug)}`} className="block text-[11px] text-slate-300 hover:text-primary truncate">
                    {x.model_name}
                    <span className="block text-[10px] text-slate-600">{x.provider_name_zh}</span>
                  </Link>
                )) : <p className="text-[11px] text-slate-500">暂无合适候选</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 替代模型提示 */}
      <div className="glass p-4">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          如果该模型在特定场景下不能完全满足你的需求，建议使用
          <Link href="/recommend" className="text-primary hover:underline mx-1">AI 模型推荐助手</Link>
          输入你的具体需求，系统会自动推荐更匹配的方案。
        </p>
      </div>

      {/* 数据来源与可信度 */}
      <div className="glass p-5">
        <h2 className="text-sm font-semibold text-white mb-3">数据来源与可信度</h2>
        <div className="space-y-2 text-xs text-slate-300">
          <p className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-primary" /> 主来源：
            <a className="text-primary hover:underline flex items-center gap-1" href={m.source_url} target="_blank" rel="noopener noreferrer">
              {m.primary_source_id} <ExternalLink className="w-3 h-3" />
            </a>
          </p>
          <p className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-cyan" /> 入库时间：{m.updated_at?.toString() ?? "—"}
          </p>
          <p className="text-slate-400">
            置信度 <span className="font-mono text-white">{(m.confidence_score * 100).toFixed(0)}%</span>。
            多源冲突时本数据可能被替换，请关注后台复核队列。
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2">
            {[
              ["Model owner", m.model_owner_provider],
              ["Canonical provider", m.canonical_provider_slug],
              ["Selling platform", m.selling_platform_provider || m.model_selling_platform_provider],
              ["Source provider", m.source_provider || m.model_source_provider],
              ["Canonical model", m.canonical_model_slug],
              ["Model family", m.model_family],
              ["Variant", m.model_variant],
              ["Source model id", m.source_model_id],
            ].map(([label, value]) => (
              <div key={label} className="rounded border border-white/10 bg-white/3 p-2">
                <p className="text-[10px] text-slate-500">{label}</p>
                <p className="mt-0.5 font-mono text-[11px] text-white break-all">{value || "unknown"}</p>
              </div>
            ))}
          </div>
          {(m.model_needs_alias_review || m.provider_needs_alias_review || (m.data_quality_flags?.length ?? 0) > 0) && (
            <p className="text-warning">
              Data quality review needed: {(m.data_quality_flags ?? []).join(", ") || "provider/model alias needs review"}.
            </p>
          )}
          {m.need_manual_review && (
            <p className="text-orange-300">
              ⚠ 本数据来源置信度较低或存在多源差异，已进入人工复核。
            </p>
          )}
        </div>
      </div>

      {/* 风险提示 */}
      <SiteDisclaimer />
    </div>
  );
}
