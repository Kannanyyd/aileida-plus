"use client";

import { useState } from "react";
import { Star, Send, CheckCircle, AlertTriangle, Info } from "lucide-react";

const SCENARIOS = [
  "中文客服问答", "写作 / 改写", "代码生成", "长文档分析",
  "翻译", "知识库问答", "数据分析", "Agent 自动化", "其他",
];

const DIMENSIONS = [
  { key: "rating_overall", label: "综合体验", required: true },
  { key: "rating_price", label: "价格满意度" },
  { key: "rating_chinese", label: "中文效果" },
  { key: "rating_code", label: "代码能力" },
  { key: "rating_reasoning", label: "推理能力" },
  { key: "rating_speed", label: "响应速度" },
  { key: "rating_stability", label: "稳定性" },
  { key: "rating_api_ease", label: "API 易用性" },
  { key: "rating_docs_clarity", label: "文档清晰度" },
  { key: "rating_payment", label: "付款便利性" },
];

function StarRating({
  value, onChange, label, required,
}: {
  value: number; onChange: (v: number) => void; label: string; required?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className="p-0.5"
          >
            <Star
              className={`w-4 h-4 ${i <= value ? "text-warning fill-warning" : "text-slate-600"}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReviewForm({ modelSlug, onSubmitted }: { modelSlug: string; onSubmitted?: () => void }) {
  const [ratings, setRatings] = useState<Record<string, number>>({ rating_overall: 0 });
  const [scenario, setScenario] = useState("");
  const [usageIntensity, setUsageIntensity] = useState("medium");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [suitableFor, setSuitableFor] = useState("");
  const [notSuitableFor, setNotSuitableFor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!ratings.rating_overall) {
      setError("请至少给出综合评分");
      return;
    }
    if (!scenario) {
      setError("请选择使用场景");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/v1/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_slug: modelSlug,
          usage_scenario: scenario,
          usage_intensity: usageIntensity,
          ratings,
          pros,
          cons,
          suitable_for: suitableFor.split(",").map((s) => s.trim()).filter(Boolean),
          not_suitable_for: notSuitableFor.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "提交失败");
      }
      setSubmitted(true);
      onSubmitted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="glass p-6 text-center space-y-3">
        <CheckCircle className="w-10 h-10 text-success mx-auto" />
        <p className="font-semibold text-white">点评已提交</p>
        <p className="text-xs text-slate-400">
          你的点评将在审核后展示。感谢你的真实反馈！
        </p>
      </div>
    );
  }

  return (
    <div className="glass p-5 space-y-4">
      <h4 className="font-semibold text-sm text-white flex items-center gap-2">
        <Star className="w-4 h-4 text-warning" /> 撰写使用点评
      </h4>

      <div>
        <label className="text-[11px] text-slate-400 mb-1 block">使用场景 *</label>
        <div className="flex flex-wrap gap-1.5">
          {SCENARIOS.map((s) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`text-[10px] px-2 py-1 rounded border transition ${scenario === s ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-slate-400"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {DIMENSIONS.map((d) => (
          <StarRating
            key={d.key}
            label={d.label}
            required={d.required}
            value={ratings[d.key] ?? 0}
            onChange={(v) => setRatings({ ...ratings, [d.key]: v })}
          />
        ))}
      </div>

      <div>
        <label className="text-[11px] text-slate-400 mb-1 block">使用强度</label>
        <div className="flex gap-1.5">
          {(["low", "medium", "high", "enterprise"] as const).map((i) => (
            <button
              key={i}
              onClick={() => setUsageIntensity(i)}
              className={`text-[10px] px-2 py-1 rounded border transition ${usageIntensity === i ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-slate-400"}`}
            >
              {i === "low" ? "低频" : i === "medium" ? "中频" : i === "high" ? "高频" : "企业级"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] text-slate-400 mb-1 block">优点</label>
        <textarea value={pros} onChange={(e) => setPros(e.target.value)} rows={2} placeholder="例如：价格实惠、中文效果好、API 稳定..." className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50" />
      </div>

      <div>
        <label className="text-[11px] text-slate-400 mb-1 block">注意点</label>
        <textarea value={cons} onChange={(e) => setCons(e.target.value)} rows={2} placeholder="例如：复杂推理建议先测试、长时间调用偶有超时..." className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-slate-400 mb-1 block">比较适合（逗号分隔）</label>
          <input value={suitableFor} onChange={(e) => setSuitableFor(e.target.value)} placeholder="中文问答, 高频调用" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50" />
        </div>
        <div>
          <label className="text-[11px] text-slate-400 mb-1 block">用户反馈的注意点</label>
          <input value={notSuitableFor} onChange={(e) => setNotSuitableFor(e.target.value)} placeholder="复杂推理, 长文档" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50" />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-[11px] text-danger bg-danger/5 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3 h-3" /> {error}
        </div>
      )}

      <div className="text-[10px] text-slate-600 flex items-start gap-1.5">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        <span>点评提交后将进入审核。请保持客观、具体，避免攻击性和绝对化表述。用户点评仅代表个人体验，不代表平台结论。</span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full brand-glow py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "提交中..." : "提交点评"}
      </button>
    </div>
  );
}
