import { notFound } from "next/navigation";
import { getModelBySlug, listModels } from "@/lib/db/queries";
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
              {caps.map((c) => <Tag key={c} variant="primary">{c}</Tag>)}
              {m.modality?.map((mo) => <Tag key={mo} variant="cyan">{mo}</Tag>)}
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

      {/* 价格表 + 能力雷达 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass p-5">
          <h2 className="text-sm font-semibold text-white mb-4">价格表</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-2 text-slate-400">输入 / 1M tokens</td>
                <td className="py-2 text-right font-mono text-white">{formatUsd(m.input_per_1m_usd)}</td>
                <td className="py-2 text-right font-mono text-slate-500">{formatCny(m.input_per_1m_usd)}</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 text-slate-400">输出 / 1M tokens</td>
                <td className="py-2 text-right font-mono text-white">{formatUsd(m.output_per_1m_usd)}</td>
                <td className="py-2 text-right font-mono text-slate-500">{formatCny(m.output_per_1m_usd)}</td>
              </tr>
              {m.input_cached_read_per_1m_usd != null && (
                <tr className="border-b border-white/5">
                  <td className="py-2 text-slate-400">缓存读取 / 1M</td>
                  <td className="py-2 text-right font-mono text-white">{formatUsd(m.input_cached_read_per_1m_usd)}</td>
                  <td className="py-2 text-right font-mono text-slate-500">{formatCny(m.input_cached_read_per_1m_usd)}</td>
                </tr>
              )}
              {m.batch_discount && (
                <tr className="border-b border-white/5">
                  <td className="py-2 text-slate-400">批量折扣</td>
                  <td colSpan={2} className="py-2 text-right font-mono text-success">×{m.batch_discount}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
            <div className="bg-white/3 rounded-lg p-2 text-center">
              <p className="text-slate-500">低频调用（测试）</p>
              <p className="font-mono text-success">≈¥{(((m.input_per_1m_usd ?? 0) * 0.1 + (m.output_per_1m_usd ?? 0) * 0.05) * 7.18).toFixed(2)}/月</p>
            </div>
            <div className="bg-white/3 rounded-lg p-2 text-center">
              <p className="text-slate-500">中频调用（日常）</p>
              <p className="font-mono text-success">≈¥{(((m.input_per_1m_usd ?? 0) * 1 + (m.output_per_1m_usd ?? 0) * 0.5) * 7.18).toFixed(0)}/月</p>
            </div>
            <div className="bg-white/3 rounded-lg p-2 text-center">
              <p className="text-slate-500">高频调用（产品）</p>
              <p className="font-mono text-success">≈¥{(((m.input_per_1m_usd ?? 0) * 10 + (m.output_per_1m_usd ?? 0) * 5) * 7.18).toFixed(0)}/月</p>
            </div>
          </div>
        </div>

        <div className="glass p-5">
          <h2 className="text-sm font-semibold text-white mb-4">能力雷达</h2>
          <CapabilityRadar
            values={{
              context: Math.min(100, ((m.context_length ?? 0) / 10000)),
              speed: 60,
              chinese: 80,
              code: caps.includes("function-call") ? 80 : 50,
              vision: caps.includes("vision") ? 100 : 20,
              stability: 70,
            }}
          />
        </div>
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
