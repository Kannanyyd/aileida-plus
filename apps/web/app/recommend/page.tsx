"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles, ChevronRight, Search, TrendingDown, Star, Shield,
  AlertTriangle, CheckCircle, ExternalLink, Info, Loader2,
} from "lucide-react";

// ---- 步骤定义 ----
type Step = "scenario" | "intensity" | "budget" | "tech" | "quality" | "results";

const STEPS: { key: Step; label: string }[] = [
  { key: "scenario", label: "使用场景" },
  { key: "intensity", label: "使用强度" },
  { key: "budget", label: "预算偏好" },
  { key: "tech", label: "技术要求" },
  { key: "quality", label: "质量要求" },
];

const SCENARIOS = [
  { id: "writing", label: "写文章 / 改写 / 总结", icon: "✍️" },
  { id: "code-generation", label: "代码生成 / 代码解释", icon: "💻" },
  { id: "customer-service", label: "客服机器人", icon: "🤖" },
  { id: "kb-qa", label: "知识库问答", icon: "📚" },
  { id: "long-doc", label: "长文档分析", icon: "📄" },
  { id: "image-understand", label: "图片理解", icon: "🖼️" },
  { id: "video-gen", label: "视频生成", icon: "🎬" },
  { id: "speech-recognition", label: "语音识别", icon: "🎙️" },
  { id: "tts", label: "语音合成", icon: "🔊" },
  { id: "data-analysis", label: "数据分析", icon: "📊" },
  { id: "agent", label: "Agent 自动化", icon: "⚡" },
  { id: "translation", label: "翻译", icon: "🌐" },
  { id: "education", label: "教育辅导", icon: "🎓" },
];

const INTENSITIES = [
  { id: "low", label: "低频", desc: "个人测试 / 偶尔使用" },
  { id: "medium", label: "中频", desc: "每天固定调用" },
  { id: "high", label: "高频", desc: "产品内大量调用" },
  { id: "enterprise", label: "企业级", desc: "高并发 / 高稳定性要求" },
];

const BUDGETS = [
  { id: "cheapest", label: "尽量便宜", icon: "💰" },
  { id: "balanced", label: "性价比优先", icon: "⚖️" },
  { id: "quality", label: "效果优先", icon: "🎯" },
  { id: "stability", label: "稳定性优先", icon: "🛡️" },
  { id: "cn-payment", label: "国内付款优先", icon: "🇨🇳" },
  { id: "free-tier", label: "免费额度优先", icon: "🎁" },
];

const TECH_OPTIONS = [
  { id: "api", label: "需要 API 调用" },
  { id: "cn-accessible", label: "需要国内可访问" },
  { id: "cn-payment", label: "需要国内付款" },
  { id: "function-call", label: "需要函数调用" },
  { id: "json-mode", label: "需要 JSON 模式" },
  { id: "long-context", label: "需要长上下文" },
  { id: "vision", label: "需要图片理解" },
  { id: "self-hosted", label: "需要私有化部署" },
  { id: "open-source", label: "需要开源模型" },
  { id: "low-latency", label: "需要低延迟" },
  { id: "high-concurrency", label: "需要高并发" },
];

const REGION_OPTIONS = [
  { id: "any", label: "不限地区" },
  { id: "domestic", label: "国内使用" },
  { id: "overseas", label: "海外使用" },
];

const CHANNEL_OPTIONS = [
  { id: "any", label: "不限渠道" },
  { id: "official_api", label: "官方 API" },
  { id: "aggregator", label: "聚合平台" },
  { id: "cloud_platform", label: "云平台" },
];

const CURRENCY_OPTIONS = [
  { id: "any", label: "不限币种" },
  { id: "CNY", label: "人民币计费" },
  { id: "USD", label: "美元计费" },
];

const QUALITIES = [
  { id: "basic", label: "普通任务即可" },
  { id: "good-chinese", label: "需要较好中文表达" },
  { id: "strong-reasoning", label: "需要较强推理能力" },
  { id: "strong-code", label: "需要较强代码能力" },
  { id: "stable-output", label: "需要稳定格式输出" },
  { id: "multimodal", label: "需要多模态能力" },
  { id: "enterprise-stability", label: "需要企业级稳定性" },
];

interface RecommendEntry {
  model: {
    modelName: string; providerName: string; slug: string; inputUsd: number; outputUsd: number;
    contextLength: number; strengths: string[]; score: number; tier: string; tierLabel: string;
    isLegacy: boolean; priceSourceCount: number;
  };
  monthlyCost: number;
  score: number;
  reasons: string[];
  suitableFor: string[];
  notSuitableFor: string[];
  strongerAlternative: { name: string; slug: string; monthlyCost: number } | null;
  cheaperAlternative: { name: string; slug: string; monthlyCost: number } | null;
}

interface RecommendResult {
  budget?: RecommendEntry[];
  balanced?: RecommendEntry[];
  premium?: RecommendEntry[];
}

export default function RecommendPage() {
  const [step, setStep] = useState<Step>("scenario");
  const [scenario, setScenario] = useState("");
  const [intensity, setIntensity] = useState("medium");
  const [budget, setBudget] = useState("balanced");
  const [techReqs, setTechReqs] = useState<string[]>([]);
  const [quality, setQuality] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [error, setError] = useState("");
  const [monthlyInput, setMonthlyInput] = useState("1000000");
  const [monthlyOutput, setMonthlyOutput] = useState("500000");
  const [useCache, setUseCache] = useState(false);
  const [useBatch, setUseBatch] = useState(false);
  const [regionPreference, setRegionPreference] = useState("any");
  const [channelPreference, setChannelPreference] = useState("any");
  const [currencyPreference, setCurrencyPreference] = useState("any");
  const [requireDomesticPayment, setRequireDomesticPayment] = useState(false);

  const toggleTech = (id: string) => setTechReqs(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const getResults = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          intensity,
          budget,
          techRequirements: techReqs,
          quality,
          monthlyInputTokens: parseInt(monthlyInput) || 1000000,
          monthlyOutputTokens: parseInt(monthlyOutput) || 500000,
          needCache: useCache,
          needBatch: useBatch,
          regionPreference,
          channelPreference,
          currencyPreference,
          requireDomesticPayment,
        }),
      });
      if (!res.ok) throw new Error(`服务器错误: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setStep("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "请求失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === "scenario") return !!scenario;
    return true;
  };
  const nextStep = () => {
    const idx = STEPS.findIndex(s => s.key === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  };
  const prevStep = () => {
    const idx = STEPS.findIndex(s => s.key === step);
    if (idx > 0) setStep(STEPS[idx - 1].key);
  };

  if (step === "results" && result) {
    const plans = [
      { key: "budget", title: "方案 A：低成本优先", icon: <TrendingDown className="w-5 h-5 text-success" />, desc: "适合预算敏感、调用量大、任务难度中低的用户", color: "text-success" },
      { key: "balanced", title: "方案 B：综合性价比优先", icon: <Star className="w-5 h-5 text-warning" />, desc: "适合大多数用户，平衡价格、能力、稳定性和易用性", color: "text-warning" },
      { key: "premium", title: "方案 C：效果 / 稳定性优先", icon: <Shield className="w-5 h-5 text-cyan" />, desc: "适合对效果、推理、稳定性或企业级调用要求更高的用户", color: "text-cyan" },
    ];

    return (
      <div className="min-h-screen bg-main py-12 px-4">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-white">根据你的需求，推荐以下方案</h1>
            <p className="text-sm text-slate-400">推荐结果基于真实数据库中的模型价格和用户点评生成，以下仅供选型参考。</p>
            <button onClick={() => { setStep("scenario"); setResult(null); }} className="text-xs text-primary hover:underline mt-2">← 重新输入需求</button>
          </div>

          {plans.map(plan => {
            const entries = (result[plan.key as keyof RecommendResult] ?? []) as RecommendEntry[];
            if (entries.length === 0) return null;
            return (
              <div key={plan.key} className="glass p-6 space-y-5">
                <div className="flex items-center gap-3">
                  {plan.icon}
                  <div><h2 className="text-lg font-bold text-white">{plan.title}</h2><p className="text-xs text-slate-400">{plan.desc}</p></div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {entries.map(e => (
                    <div key={e.model.slug} className="bg-white/3 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm text-white">{e.model.modelName}</p>
                          <p className="text-[10px] text-slate-500">
                            {e.model.providerName} · {e.model.tierLabel} · {e.model.priceSourceCount} 个价格来源
                          </p>
                        </div>
                        <span className="text-sm font-mono font-bold text-success">¥{e.monthlyCost.toFixed(0)}/月</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {e.reasons.slice(0, 4).map(s => (
                          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{s}</span>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-success/5 border border-success/10 rounded-lg p-2">
                          <p className="text-success mb-1">适合</p>
                          <p className="text-slate-400">{e.suitableFor.slice(0, 3).join(" / ") || "通用任务"}</p>
                        </div>
                        <div className="bg-warning/5 border border-warning/10 rounded-lg p-2">
                          <p className="text-warning mb-1">不适合</p>
                          <p className="text-slate-400">{e.notSuitableFor.slice(0, 3).join(" / ") || "暂无明显短板"}</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-[10px] text-slate-500">
                        <p>
                          更强但更贵：
                          {e.strongerAlternative ? (
                            <Link className="text-primary hover:underline ml-1" href={`/models/${e.strongerAlternative.slug}`}>{e.strongerAlternative.name}</Link>
                          ) : <span className="ml-1">暂无合适替代</span>}
                        </p>
                        <p>
                          更便宜但能力较弱：
                          {e.cheaperAlternative ? (
                            <Link className="text-primary hover:underline ml-1" href={`/models/${e.cheaperAlternative.slug}`}>{e.cheaperAlternative.name}</Link>
                          ) : <span className="ml-1">暂无合适替代</span>}
                        </p>
                      </div>
                      <Link href={`/models/${e.model.slug}`} className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5">
                        查看详情 <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="glass p-4 text-[10px] text-slate-500 leading-relaxed space-y-2">
            <p className="flex items-start gap-1.5"><Info className="w-3 h-3 mt-px shrink-0" />推荐结果基于本站当前收录的公开价格、模型参数、用户点评和场景匹配规则生成，仅供选型参考。建议在正式接入前使用真实业务样本进行测试。</p>
            <p>本站展示的模型价格、优惠信息、能力标签和用户点评均基于公开资料整理，仅供参考。实际价格、功能和服务条款以各模型服务商官方页面为准。</p>
          </div>
        </div>
      </div>
    );
  }

  // 向导页
  return (
    <div className="min-h-screen bg-main py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center space-y-3 mb-8">
          <Sparkles className="w-10 h-10 text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-white">不知道选哪个 AI 模型？</h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">根据你的使用场景、调用量、预算和技术要求，自动对比模型价格、能力、优惠和用户反馈，给出可解释的推荐理由。</p>
        </div>

        <div className="flex items-center justify-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1">
              <span className={`text-[10px] px-2.5 py-1 rounded-full transition border ${step === s.key ? "bg-primary/20 border-primary/40 text-primary font-medium" : "border-white/10 text-slate-500"} ${STEPS.findIndex(x => x.key === step) > i ? "bg-success/10 border-success/30 text-success" : ""}`}>
                {STEPS.findIndex(x => x.key === step) > i ? <CheckCircle className="w-3 h-3 inline mr-0.5" /> : null}{s.label}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-700" />}
            </div>
          ))}
        </div>

        <div className="glass p-6">
          {step === "scenario" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">你想用 AI 做什么？</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SCENARIOS.map(s => (
                  <button key={s.id} onClick={() => setScenario(s.id)} className={`p-3 rounded-xl border text-xs transition text-left ${scenario === s.id ? "border-primary/50 bg-primary/10 text-white" : "border-white/10 text-slate-400 hover:border-white/20"}`}>
                    <span className="text-base mr-1.5">{s.icon}</span>{s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "intensity" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white mb-3">使用强度</h2>
                <div className="grid grid-cols-2 gap-2">
                  {INTENSITIES.map(i => (
                    <button key={i.id} onClick={() => setIntensity(i.id)} className={`p-3 rounded-xl border text-xs transition ${intensity === i.id ? "border-primary/50 bg-primary/10 text-white" : "border-white/10 text-slate-400"}`}>
                      <p className="font-medium">{i.label}</p><p className="text-[10px] text-slate-500 mt-0.5">{i.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] text-slate-400 mb-1 block">每月输入 tokens</label><input type="number" value={monthlyInput} onChange={e => setMonthlyInput(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm text-white font-mono focus:outline-none focus:border-primary/50" /></div>
                <div><label className="text-[11px] text-slate-400 mb-1 block">每月输出 tokens</label><input type="number" value={monthlyOutput} onChange={e => setMonthlyOutput(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm text-white font-mono focus:outline-none focus:border-primary/50" /></div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer"><input type="checkbox" checked={useCache} onChange={e => setUseCache(e.target.checked)} className="accent-primary" />使用缓存</label>
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer"><input type="checkbox" checked={useBatch} onChange={e => setUseBatch(e.target.checked)} className="accent-primary" />批量调用</label>
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer"><input type="checkbox" checked={requireDomesticPayment} onChange={e => setRequireDomesticPayment(e.target.checked)} className="accent-primary" />国内付款</label>
              </div>
            </div>
          )}

          {step === "budget" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">预算偏好</h2>
              <div className="grid grid-cols-2 gap-2">
                {BUDGETS.map(b => (
                  <button key={b.id} onClick={() => setBudget(b.id)} className={`p-3 rounded-xl border text-xs transition ${budget === b.id ? "border-primary/50 bg-primary/10 text-white" : "border-white/10 text-slate-400"}`}>
                    <p className="flex items-center gap-1.5 font-medium"><span>{b.icon}</span>{b.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "tech" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">技术要求（可多选，也可跳过）</h2>
              <div className="grid grid-cols-3 gap-2">
                {REGION_OPTIONS.map(o => (
                  <button key={o.id} onClick={() => setRegionPreference(o.id)} className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition ${regionPreference === o.id ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-slate-400"}`}>{o.label}</button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {CHANNEL_OPTIONS.map(o => (
                  <button key={o.id} onClick={() => setChannelPreference(o.id)} className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition ${channelPreference === o.id ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-slate-400"}`}>{o.label}</button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {CURRENCY_OPTIONS.map(o => (
                  <button key={o.id} onClick={() => setCurrencyPreference(o.id)} className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition ${currencyPreference === o.id ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-slate-400"}`}>{o.label}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TECH_OPTIONS.map(t => (
                  <button key={t.id} onClick={() => toggleTech(t.id)} className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition ${techReqs.includes(t.id) ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-slate-400 hover:border-white/20"}`}>{t.label}</button>
                ))}
              </div>
            </div>
          )}

          {step === "quality" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">质量要求</h2>
              <div className="grid grid-cols-1 gap-2">
                {QUALITIES.map(q => (
                  <button key={q.id} onClick={() => setQuality(q.id)} className={`p-3 rounded-xl border text-xs transition text-left ${quality === q.id ? "border-primary/50 bg-primary/10 text-white" : "border-white/10 text-slate-400"}`}>{q.label}</button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 text-[11px] text-danger bg-danger/5 rounded-lg px-3 py-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> {error}
            </div>
          )}

          <div className="flex justify-between pt-6">
            {step !== "scenario" ? <button onClick={prevStep} className="text-xs text-slate-400 hover:text-white px-3 py-2">← 上一步</button> : <div />}
            {step === "quality" ? (
              <button onClick={getResults} disabled={loading} className={`px-6 py-2.5 rounded-xl text-sm font-semibold text-white brand-glow ${loading ? "opacity-50" : ""}`}>
                {loading ? <><Loader2 className="w-4 h-4 inline mr-1 animate-spin" />分析中...</> : <><Search className="w-4 h-4 inline mr-1" />帮我推荐模型</>}
              </button>
            ) : (
              <button onClick={nextStep} disabled={!canProceed()} className="px-4 py-2 rounded-xl text-sm font-semibold brand-glow disabled:opacity-30 text-white">下一步 <ChevronRight className="w-4 h-4 inline" /></button>
            )}
          </div>
        </div>

        <p className="text-[10px] text-slate-600 text-center mt-6 max-w-md mx-auto leading-relaxed">
          推荐数据来自公开价格源、官方页面和用户点评，仅供选型参考。实际效果受提示词、数据、网络等因素影响。本站不隶属于任何模型服务商。
        </p>
      </div>
    </div>
  );
}
