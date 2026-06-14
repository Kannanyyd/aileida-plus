"use client";
import { useState, useMemo } from "react";
import { estimateCost, type Usage, type Pricing } from "@pricing/core";
import { Calculator, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import type { ModelWithPricing } from "@/lib/db/queries";
import { formatCny, formatUsd } from "@/lib/utils";

const SCENARIOS: Array<{ key: string; label: string; ratio: number; imageCount?: number; description: string }> = [
  { key: "writing", label: "写作", ratio: 0.3, description: "公众号、博客、文案" },
  { key: "coding", label: "编程", ratio: 0.7, description: "代码补全、debug" },
  { key: "customer-service", label: "客服", ratio: 0.5, description: "多轮对话、FAQ" },
  { key: "long-doc", label: "长文档", ratio: 0.2, imageCount: 0, description: "分析、总结" },
  { key: "vision", label: "图片理解", ratio: 0.6, imageCount: 50, description: "50 张图" },
  { key: "custom", label: "自定义", ratio: 0.5, description: "自由调整" },
];

const toPricing = (m: ModelWithPricing): Pricing => ({
  model_id: m.model_slug,
  input_per_1m_usd: m.input_per_1m_usd ?? 0,
  output_per_1m_usd: m.output_per_1m_usd ?? 0,
  input_cached_read_per_1m_usd: m.input_cached_read_per_1m_usd ?? undefined,
  currency_native: "USD",
  source_id: m.primary_source_id,
  source_url: m.source_url,
  confidence_score: m.confidence_score,
  need_manual_review: m.need_manual_review,
});

export function PriceCalculator({ models }: { models: ModelWithPricing[] }) {
  const [scenario, setScenario] = useState("writing");
  const [inputTokens, setInputTokens] = useState(2_000_000);
  const [outputTokens, setOutputTokens] = useState(800_000);
  const [cacheHit, setCacheHit] = useState(0);
  const [batch, setBatch] = useState(false);
  const [qualityPref, setQualityPref] = useState(50);

  const usage: Usage = useMemo(
    () => ({
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cached_input_tokens: Math.floor(inputTokens * (cacheHit / 100)),
    }),
    [inputTokens, outputTokens, cacheHit],
  );

  const ranked = useMemo(() => {
    return models
      .filter((m) => !m.need_manual_review && m.confidence_score >= 0.7 && (m.input_per_1m_usd != null || m.output_per_1m_usd != null))
      .map((m) => ({
        model: m,
        estimate: estimateCost(toPricing(m), usage, { useBatch: batch }),
      }))
      .sort((a, b) => a.estimate.total_usd - b.estimate.total_usd);
  }, [models, usage, batch]);

  if (ranked.length === 0) {
    return (
      <div className="glass p-6 text-sm text-slate-400">
        暂无可计算模型。先在后台跑一次数据抓取，让数据库有数据后再来计算。
      </div>
    );
  }

  // 三档推荐
  const cheapest = ranked[0];
  const balanced = ranked[Math.min(Math.floor(ranked.length * 0.2), ranked.length - 1)];
  const highQuality = ranked[ranked.length - 1];

  const scenarios = SCENARIOS;
  const cur = scenarios.find((s) => s.key === scenario) ?? scenarios[0];

  function applyScenario() {
    setInputTokens(2_000_000);
    setOutputTokens(Math.floor(2_000_000 * cur.ratio));
  }

  return (
    <div className="grid lg:grid-cols-[420px_1fr] gap-6">
      {/* 表单 */}
      <div className="glass p-5 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" /> 输入参数
          </h2>
          <p className="text-xs text-slate-500 mt-1">调整后右侧实时计算</p>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">使用场景</label>
          <div className="grid grid-cols-3 gap-2">
            {scenarios.map((s) => (
              <button
                key={s.key}
                onClick={() => {
                  setScenario(s.key);
                  applyScenario();
                }}
                className={`text-xs py-2 rounded-lg border transition ${
                  scenario === s.key
                    ? "bg-primary-soft border-primary/40 text-white"
                    : "bg-white/3 border-white/10 text-slate-400 hover:border-white/20"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">每月输入 tokens</label>
          <input
            type="number"
            value={inputTokens}
            onChange={(e) => setInputTokens(Number(e.target.value) || 0)}
            className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-sm font-mono text-white"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">每月输出 tokens</label>
          <input
            type="number"
            value={outputTokens}
            onChange={(e) => setOutputTokens(Number(e.target.value) || 0)}
            className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-sm font-mono text-white"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">缓存命中率 {cacheHit}%</label>
          <input
            type="range"
            min={0}
            max={90}
            value={cacheHit}
            onChange={(e) => setCacheHit(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <label className="flex items-center justify-between text-xs text-slate-300">
          批量调用（5 折）
          <input
            type="checkbox"
            checked={batch}
            onChange={(e) => setBatch(e.target.checked)}
            className="accent-primary"
          />
        </label>
        <div>
          <label className="text-xs text-slate-400 mb-1.5 block">质量偏好：便宜 ↔ 高质量</label>
          <input
            type="range"
            min={0}
            max={100}
            value={qualityPref}
            onChange={(e) => setQualityPref(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      </div>

      {/* 结果 */}
      <div className="space-y-4">
        {[
          { key: "A", title: "最省钱", rec: cheapest, accent: "border-success/40 bg-success/5", icon: TrendingDown, color: "text-success" },
          { key: "B", title: "综合最优", rec: balanced, accent: "border-primary/40 bg-primary/5", icon: Sparkles, color: "text-primary" },
          { key: "C", title: "高质量", rec: highQuality, accent: "border-purple/40 bg-purple/5", icon: TrendingUp, color: "text-purple" },
        ].map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.key} className={`glass p-5 border ${row.accent}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white/10">方案 {row.key}</span>
                  <span className="text-sm font-semibold text-white">{row.title}</span>
                </div>
                <Icon className={`w-4 h-4 ${row.color}`} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-slate-500">推荐模型</p>
                  <p className="text-base font-semibold text-white">{row.rec.model.model_name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{row.rec.model.provider_name_zh}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">预计月成本</p>
                  <p className={`font-mono text-2xl font-bold ${row.color}`}>
                    {formatUsd(row.rec.estimate.total_usd)}
                  </p>
                  <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                    {formatCny(row.rec.estimate.total_usd)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  上下文 {row.rec.model.context_length ? `${(row.rec.model.context_length / 1000).toFixed(0)}K` : "—"}
                </span>
                <a
                  href={row.rec.model.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary"
                >
                  数据来源：{row.rec.model.primary_source_id} →
                </a>
              </div>
            </div>
          );
        })}

        {/* 完整排行榜 */}
        <div className="glass p-5">
          <h3 className="text-sm font-semibold text-white mb-3">完整候选（按成本升序）</h3>
          <ul className="space-y-1 text-xs">
            {ranked.slice(0, 12).map((r, i) => (
              <li
                key={`${r.model.provider_slug}-${r.model.model_slug}`}
                className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-white/5"
              >
                <span className="font-mono text-slate-500 w-6">{i + 1}</span>
                <span className="flex-1 text-white truncate">{r.model.model_name}</span>
                <span className="text-slate-500 hidden md:inline">{r.model.provider_name_zh}</span>
                <span className="font-mono text-white">{formatUsd(r.estimate.total_usd)}</span>
                <span className="font-mono text-slate-500 w-20 text-right">{formatCny(r.estimate.total_usd)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
