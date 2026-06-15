"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PriceSourceBadges, PriceValue, SourceLink } from "@/components/price-trust";
import { relativeTime } from "@/lib/utils";

interface ModelOption {
  model_id: string;
  model_slug: string;
  model_name: string;
  provider_name_zh: string;
}

interface PricingRow {
  id: string;
  input_per_1m_usd: number | null;
  output_per_1m_usd: number | null;
  input_cached_read_per_1m_usd: number | null;
  currency_native: string;
  region: string;
  channel: string;
  platform: string | null;
  is_official: boolean;
  is_aggregator: boolean;
  is_domestic: boolean;
  confidence_score: number;
  source_url: string;
  primary_source_id: string;
  tiered_rules: unknown;
  data_quality_flags: string[];
  updated_at: string;
}

type PricingWithModel = PricingRow & { modelSlug: string };

function nativeFromTieredRules(rules: unknown, key: "input_per_1m" | "output_per_1m" | "cached_input_per_1m") {
  if (!Array.isArray(rules)) return null;
  const value = (rules[0] as Record<string, unknown> | undefined)?.[key];
  return typeof value === "number" ? value : null;
}

export default function ComparePage() {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [pricingMap, setPricingMap] = useState<Record<string, PricingRow[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/v1/models?limit=200")
      .then((res) => res.json())
      .then((data) => setModels(data.models ?? []));
  }, []);

  const modelNames = Object.fromEntries(models.map((model) => [model.model_slug, `${model.model_name} (${model.provider_name_zh})`]));
  const allPricing: PricingWithModel[] = Object.entries(pricingMap).flatMap(([modelSlug, rows]) => rows.map((row) => ({ ...row, modelSlug })));

  const addModel = (slug: string) => {
    if (!slug || selected.includes(slug) || selected.length >= 4) return;
    setSelected((prev) => [...prev, slug]);
  };

  const removeModel = (slug: string) => {
    setSelected((prev) => prev.filter((item) => item !== slug));
    setPricingMap((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  };

  const compare = async () => {
    setLoading(true);
    const next: Record<string, PricingRow[]> = {};
    for (const slug of selected) {
      try {
        const res = await fetch(`/api/v1/models/${encodeURIComponent(slug)}/pricing`);
        const data = await res.json();
        next[slug] = data.pricing ?? [];
      } catch {
        next[slug] = [];
      }
    }
    setPricingMap(next);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <section className="glass p-5">
        <h1 className="text-xl font-bold text-white">模型价格对比</h1>
        <p className="text-sm text-slate-400 mt-1">
          横向比较官方 API、云平台、聚合平台的输入价、输出价、缓存价，以及原生人民币价、海外美元价和美元折算人民币估算价。
        </p>
      </section>

      <section className="glass p-5">
        <h2 className="text-sm font-semibold text-white mb-3">选择模型</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {selected.map((slug) => (
            <span key={slug} className="inline-flex items-center gap-1 rounded-lg bg-primary/20 px-2 py-1 text-xs text-primary">
              {modelNames[slug] ?? slug}
              <button onClick={() => removeModel(slug)} className="text-slate-400 hover:text-white" aria-label={`移除 ${slug}`}>x</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <select className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" onChange={(event) => addModel(event.target.value)} value="">
            <option value="">添加模型...</option>
            {models.filter((model) => !selected.includes(model.model_slug)).map((model) => (
              <option key={model.model_id} value={model.model_slug}>{model.model_name} ({model.provider_name_zh})</option>
            ))}
          </select>
          <button onClick={compare} disabled={selected.length < 2 || loading} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? "对比中..." : "开始对比"}
          </button>
        </div>
      </section>

      {allPricing.length > 0 && (
        <section className="glass p-5">
          <h2 className="text-sm font-semibold text-white mb-3">多渠道价格记录（{allPricing.length} 条）</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-500">
                  <th className="py-2 text-left font-normal">模型</th>
                  <th className="py-2 text-left font-normal">渠道 / 平台</th>
                  <th className="py-2 text-left font-normal">区域</th>
                  <th className="py-2 text-right font-normal">输入价 / 1M</th>
                  <th className="py-2 text-right font-normal">输出价 / 1M</th>
                  <th className="py-2 text-right font-normal">缓存读 / 1M</th>
                  <th className="py-2 text-left font-normal">来源与可信度</th>
                  <th className="py-2 text-right font-normal">更新时间</th>
                </tr>
              </thead>
              <tbody>
                {[...allPricing].sort((a, b) => (a.input_per_1m_usd ?? 999) - (b.input_per_1m_usd ?? 999)).map((price) => {
                  const preferCny = price.currency_native === "CNY" || price.is_domestic || price.region === "china_mainland";
                  const estimated = preferCny && price.currency_native !== "CNY";
                  return (
                    <tr key={`${price.modelSlug}-${price.id}`} className="border-b border-white/5 align-top hover:bg-white/5">
                      <td className="py-3 text-white">
                        <Link href={`/models/${encodeURIComponent(price.modelSlug)}`} className="hover:text-primary">{modelNames[price.modelSlug] ?? price.modelSlug}</Link>
                      </td>
                      <td className="py-3 text-slate-300">
                        <p>{price.platform || price.primary_source_id}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">{price.channel}</p>
                      </td>
                      <td className="py-3"><span className={`rounded px-1.5 py-0.5 text-[10px] ${preferCny ? "bg-cyan/10 text-cyan" : "bg-primary/10 text-primary"}`}>{price.region}</span></td>
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
        </section>
      )}

      <section className="glass p-5">
        <p className="text-xs text-slate-400 leading-relaxed">
          原生人民币价格会显示为 ¥；美元折算人民币会标记为“估算”，不能当作国内官方人民币价。价格仅用于选型参考，最终以来源页面为准。
          <Link href="/models" className="text-primary hover:underline ml-1">查看模型库</Link>
        </p>
      </section>
    </div>
  );
}
