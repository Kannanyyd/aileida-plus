import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { models, providers, pricing } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { formatCny, formatContext, formatUsd } from "@/lib/utils";
import { estimateCost, type Pricing as CalcPricing } from "@pricing/core";
import { ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>;
}): Promise<Metadata> {
  const { pair } = await params;
  const [a, b] = decodeURIComponent(pair).split("-vs-");
  return {
    title: `${a} vs ${b} 对比 | AI 模型价格雷达`,
    description: `${a} 与 ${b} 的价格、上下文、适用场景对比。`,
  };
}

async function fetchBySlugOrExternalId(slug: string) {
  const rows = await db
    .select({
      model_id: models.id,
      model_slug: models.slug,
      model_name: models.name,
      provider_slug: providers.slug,
      provider_name_zh: providers.name_zh,
      context_length: models.context_length,
      capabilities: models.capabilities,
      modality: models.modality,
      input_per_1m_usd: pricing.input_per_1m_usd,
      output_per_1m_usd: pricing.output_per_1m_usd,
      cached_read: pricing.input_cached_read_per_1m_usd,
      source_url: pricing.source_url,
      primary_source_id: pricing.primary_source_id,
      confidence_score: pricing.confidence_score,
    })
    .from(models)
    .innerJoin(providers, eq(providers.id, models.provider_id))
    .innerJoin(pricing, eq(pricing.model_id, models.id))
    .where(eq(models.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ pair: string }>;
}) {
  const { pair } = await params;
  const parts = decodeURIComponent(pair).split("-vs-");
  if (parts.length !== 2) return notFound();
  const [a, b] = parts;
  const [mA, mB] = await Promise.all([fetchBySlugOrExternalId(a), fetchBySlugOrExternalId(b)]);
  if (!mA || !mB) {
    return (
      <div className="glass p-8 text-sm text-slate-400">
        对比的模型 <code className="text-primary">{a}</code> 或 <code className="text-primary">{b}</code> 暂未收录。
        请先在 <Link className="text-primary" href="/models">模型库</Link> 中查看。
      </div>
    );
  }

  const usage = { input_tokens: 1_000_000, output_tokens: 500_000 };
  const toCalcPricing = (m: typeof mA): CalcPricing => ({
    model_id: m.model_slug,
    input_per_1m_usd: Number(m.input_per_1m_usd),
    output_per_1m_usd: Number(m.output_per_1m_usd),
    input_cached_read_per_1m_usd: m.cached_read != null ? Number(m.cached_read) : undefined,
    currency_native: "USD",
    source_id: m.primary_source_id,
    source_url: m.source_url,
    confidence_score: Number(m.confidence_score),
    need_manual_review: false,
  });
  const cA = estimateCost(toCalcPricing(mA), usage);
  const cB = estimateCost(toCalcPricing(mB), usage);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> {mA.model_name} vs {mB.model_name}
        </h1>
        <p className="text-sm text-slate-400 mt-1">实时对比 · 数据来源透明 · 多源验证</p>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        {[mA, mB].map((m, i) => (
          <div key={m.model_id} className={`glass p-5 ${i === 0 ? "" : "md:order-2"}`}>
            <p className="text-xs text-slate-500">{m.provider_name_zh}</p>
            <h2 className="text-lg font-semibold text-white">{m.model_name}</h2>
            <p className="text-[11px] text-slate-500 mt-1">上下文 {formatContext(m.context_length)}</p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[520px] w-full text-sm">
                <tbody>
                  <tr className="border-b border-white/5">
                    <td className="py-1.5 text-slate-400">输入 / 1M</td>
                    <td className="py-1.5 text-right font-mono">{formatUsd(Number(m.input_per_1m_usd))}</td>
                    <td className="py-1.5 text-right text-slate-500 font-mono">{formatCny(Number(m.input_per_1m_usd))}</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-1.5 text-slate-400">输出 / 1M</td>
                    <td className="py-1.5 text-right font-mono">{formatUsd(Number(m.output_per_1m_usd))}</td>
                    <td className="py-1.5 text-right text-slate-500 font-mono">{formatCny(Number(m.output_per_1m_usd))}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-slate-400">百万 token 估算</td>
                    <td colSpan={2} className="py-1.5 text-right font-mono text-white">
                      {formatUsd(i === 0 ? cA.total_usd : cB.total_usd)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
              <span>来源：{m.primary_source_id}</span>
              <a href={m.source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                详情 <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="glass p-5">
        <h2 className="text-sm font-semibold text-white mb-3">成本对比（1M 输入 + 500K 输出）</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-slate-500">{mA.model_name}</p>
            <p className="font-mono text-2xl text-white">{formatUsd(cA.total_usd)}</p>
            <p className="font-mono text-[11px] text-slate-500">{formatCny(cA.total_usd)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500">{mB.model_name}</p>
            <p className="font-mono text-2xl text-white">{formatUsd(cB.total_usd)}</p>
            <p className="font-mono text-[11px] text-slate-500">{formatCny(cB.total_usd)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
