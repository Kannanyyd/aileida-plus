"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  region: string;
  channel: string;
  platform: string | null;
  is_official: boolean;
  is_aggregator: boolean;
  currency_native: string;
  primary_source_id: string;
}

export default function ComparePage() {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [pricingMap, setPricingMap] = useState<Record<string, PricingRow[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/v1/models?limit=200")
      .then((r) => r.json())
      .then((data) => setModels(data.models ?? []));
  }, []);

  const addModel = (slug: string) => {
    if (selected.length >= 4 || selected.includes(slug)) return;
    setSelected([...selected, slug]);
  };

  const removeModel = (slug: string) => {
    setSelected(selected.filter((s) => s !== slug));
    const next = { ...pricingMap };
    delete next[slug];
    setPricingMap(next);
  };

  const compare = async () => {
    setLoading(true);
    const map: Record<string, PricingRow[]> = {};
    for (const slug of selected) {
      try {
        const res = await fetch(`/api/v1/models/${encodeURIComponent(slug)}/pricing`);
        const data = await res.json();
        map[slug] = data.pricing ?? [];
      } catch { map[slug] = []; }
    }
    setPricingMap(map);
    setLoading(false);
  };

  const allPricing = Object.values(pricingMap).flat();
  const modelNames: Record<string, string> = {};
  for (const m of models) modelNames[m.model_slug] = `${m.model_name} (${m.provider_name_zh})`;

  return (
    <div className="space-y-6">
      <div className="glass p-5">
        <h1 className="text-xl font-bold text-white">模型价格对比</h1>
        <p className="text-sm text-slate-400 mt-1">选择 2-4 个模型，对比不同渠道的价格</p>
      </div>

      <div className="glass p-5">
        <h2 className="text-sm font-semibold text-white mb-3">选择模型</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/20 text-primary text-xs">
              {modelNames[s] ?? s}
              <button onClick={() => removeModel(s)} className="text-slate-400 hover:text-white">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white flex-1"
            onChange={(e) => addModel(e.target.value)}
            value=""
          >
            <option value="">添加模型...</option>
            {models.filter((m) => !selected.includes(m.model_slug)).map((m) => (
              <option key={m.model_id} value={m.model_slug}>
                {m.model_name} ({m.provider_name_zh})
              </option>
            ))}
          </select>
          <button
            onClick={compare}
            disabled={selected.length < 2 || loading}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "对比中..." : "开始对比"}
          </button>
        </div>
      </div>

      {allPricing.length > 0 && (
        <div className="glass p-5">
          <h2 className="text-sm font-semibold text-white mb-3">
            价格对比 ({allPricing.length} 条)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-white/10">
                  <th className="text-left py-2 font-normal">模型</th>
                  <th className="text-left py-2 font-normal">渠道</th>
                  <th className="text-left py-2 font-normal">区域</th>
                  <th className="text-right py-2 font-normal">输入/1M</th>
                  <th className="text-right py-2 font-normal">输出/1M</th>
                  <th className="text-center py-2 font-normal">官方</th>
                  <th className="text-right py-2 font-normal">币种</th>
                </tr>
              </thead>
              <tbody>
                {allPricing.sort((a, b) => (a.input_per_1m_usd ?? 999) - (b.input_per_1m_usd ?? 999)).map((p) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 text-white truncate max-w-[150px]">
                      {modelNames[p.primary_source_id] || p.primary_source_id}
                    </td>
                    <td className="py-2 text-slate-300">{p.platform || p.primary_source_id}</td>
                    <td className="py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        p.region === "china_mainland" ? "bg-cyan/10 text-cyan" : 
                        p.region === "overseas" ? "bg-orange-500/10 text-orange-400" : "bg-primary/10 text-primary"
                      }`}>
                        {p.region === "china_mainland" ? "国内" : p.region === "overseas" ? "海外" : "全球"}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono text-white">
                      {p.input_per_1m_usd != null ? `$${p.input_per_1m_usd.toFixed(4)}` : "—"}
                    </td>
                    <td className="py-2 text-right font-mono text-white">
                      {p.output_per_1m_usd != null ? `$${p.output_per_1m_usd.toFixed(4)}` : "—"}
                    </td>
                    <td className="py-2 text-center">
                      {p.is_official ? "✅" : p.is_aggregator ? "🔗" : "—"}
                    </td>
                    <td className="py-2 text-right text-slate-400">{p.currency_native}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="glass p-5">
        <p className="text-xs text-slate-400">
          提示：选择同一模型可查看不同渠道/区域的价格差异。国内平台价格通常以 CNY 计价，海外平台以 USD 计价。
          <Link href="/models" className="text-primary hover:underline ml-1">浏览全部模型</Link>
        </p>
      </div>
    </div>
  );
}
