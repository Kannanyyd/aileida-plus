"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle, ChevronRight, ExternalLink, Loader2, Search, Shield, Sparkles, Star, TrendingDown } from "lucide-react";
import { formatContext, formatUsd } from "@/lib/utils";
import { PriceSourceBadges, PriceValue } from "@/components/price-trust";

type Step = "scenario" | "budget" | "tech" | "quality" | "results";

const STEPS: { key: Step; label: string }[] = [
  { key: "scenario", label: "Scenario" },
  { key: "budget", label: "Budget" },
  { key: "tech", label: "Filters" },
  { key: "quality", label: "Quality" },
];

const SCENARIOS = [
  { id: "writing", label: "Chinese writing and summarization" },
  { id: "code-generation", label: "Coding" },
  { id: "long-doc", label: "Long context summary" },
  { id: "reasoning", label: "Complex reasoning" },
  { id: "customer-service", label: "Customer support" },
  { id: "data-analysis", label: "Data analysis" },
  { id: "agent", label: "Agent workflow" },
  { id: "translation", label: "Translation" },
];

const BUDGETS = [
  { id: "balanced", label: "Balanced value" },
  { id: "quality", label: "Quality first" },
  { id: "stability", label: "Stability first" },
  { id: "cn-payment", label: "Mainland payment first" },
  { id: "cheapest", label: "Lowest price" },
  { id: "free-tier", label: "Free tier first" },
];

const REGION_OPTIONS = [
  { id: "any", label: "Any region" },
  { id: "domestic", label: "Mainland use" },
  { id: "overseas", label: "Overseas use" },
];

const CHANNEL_OPTIONS = [
  { id: "any", label: "Any channel" },
  { id: "official_api", label: "Official API" },
  { id: "aggregator", label: "Aggregator" },
  { id: "cloud_platform", label: "Cloud platform" },
];

const CURRENCY_OPTIONS = [
  { id: "any", label: "Any currency" },
  { id: "CNY", label: "CNY billing" },
  { id: "USD", label: "USD billing" },
];

const TECH_OPTIONS = [
  { id: "api", label: "API access" },
  { id: "cn-accessible", label: "Mainland accessible" },
  { id: "cn-payment", label: "Mainland payment" },
  { id: "function-call", label: "Function calling" },
  { id: "json-mode", label: "JSON mode" },
  { id: "long-context", label: "Long context" },
  { id: "vision", label: "Vision" },
  { id: "low-latency", label: "Low latency" },
];

const QUALITIES = [
  { id: "basic", label: "Basic task" },
  { id: "good-chinese", label: "Good Chinese output" },
  { id: "strong-reasoning", label: "Strong reasoning" },
  { id: "strong-code", label: "Strong coding" },
  { id: "stable-output", label: "Stable structured output" },
  { id: "enterprise-stability", label: "Enterprise stability" },
];

interface RecommendEntry {
  model: {
    modelName: string;
    providerName: string;
    slug: string;
    inputUsd: number | null;
    outputUsd: number | null;
    contextLength: number | null;
    score: number;
    tier: string;
    tierLabel: string;
    isLegacy: boolean;
    priceSourceCount: number;
    isOfficialPrice?: boolean;
    isAggregatorPrice?: boolean;
    isDomestic?: boolean;
    currencyNative?: string;
    estimatedCurrency?: boolean;
    nativeInputPer1mCny?: number | null;
    nativeOutputPer1mCny?: number | null;
    dataQualityFlags?: string[];
    sourceConfidence?: number;
    dataConfidenceIssue?: boolean;
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
  latestModelAlerts?: Array<{ model_slug: string; model_name: string; provider_slug: string; lifecycle_tier: string; source_url: string }>;
  pricingGapAlerts?: Array<{ provider: string; missingCnyPricing: number; message: string }>;
  relaxedFilters?: string[];
}

function plans(result: RecommendResult) {
  return [
    { key: "budget" as const, title: "Low cost", icon: <TrendingDown className="w-5 h-5 text-success" /> },
    { key: "balanced" as const, title: "Balanced", icon: <Star className="w-5 h-5 text-warning" /> },
    { key: "premium" as const, title: "Premium", icon: <Shield className="w-5 h-5 text-cyan" /> },
  ].map((plan) => ({ ...plan, entries: (result[plan.key] ?? []) as RecommendEntry[] }));
}

export default function RecommendPage() {
  const [step, setStep] = useState<Step>("scenario");
  const [scenario, setScenario] = useState("writing");
  const [budget, setBudget] = useState("balanced");
  const [techReqs, setTechReqs] = useState<string[]>(["api"]);
  const [quality, setQuality] = useState("good-chinese");
  const [monthlyInput, setMonthlyInput] = useState("1000000");
  const [monthlyOutput, setMonthlyOutput] = useState("500000");
  const [regionPreference, setRegionPreference] = useState("domestic");
  const [channelPreference, setChannelPreference] = useState("any");
  const [currencyPreference, setCurrencyPreference] = useState("CNY");
  const [requireDomesticPayment, setRequireDomesticPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [error, setError] = useState("");

  const toggleTech = (id: string) => setTechReqs((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const getResults = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          intensity: "medium",
          budget,
          techRequirements: techReqs,
          quality,
          monthlyInputTokens: parseInt(monthlyInput, 10) || 1000000,
          monthlyOutputTokens: parseInt(monthlyOutput, 10) || 500000,
          regionPreference,
          channelPreference,
          currencyPreference,
          requireDomesticPayment,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? `Server error ${res.status}`);
      setResult(data);
      setStep("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    const index = STEPS.findIndex((item) => item.key === step);
    if (index < STEPS.length - 1) setStep(STEPS[index + 1].key);
  };
  const prevStep = () => {
    const index = STEPS.findIndex((item) => item.key === step);
    if (index > 0) setStep(STEPS[index - 1].key);
  };

  if (step === "results" && result) {
    return (
      <div className="min-h-screen bg-main py-10 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <header className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-white">Model selection advisor</h1>
            <p className="text-sm text-slate-400">Default price weight stays around 10%-15%; only lowest-price modes raise it.</p>
            <button onClick={() => { setStep("scenario"); setResult(null); }} className="text-xs text-primary hover:underline">Start over</button>
          </header>

          {(result.relaxedFilters?.length ?? 0) > 0 && (
            <div className="glass p-4 text-xs text-warning">Relaxed filters: {result.relaxedFilters?.join(", ")}.</div>
          )}

          {result.pricingGapAlerts && result.pricingGapAlerts.length > 0 && (
            <section className="glass p-4">
              <h2 className="text-sm font-semibold text-white mb-2">Pricing gap alerts</h2>
              <div className="grid md:grid-cols-3 gap-2">
                {result.pricingGapAlerts.slice(0, 6).map((alert) => (
                  <div key={alert.provider} className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-xs">
                    <p className="text-warning font-medium">{alert.provider}</p>
                    <p className="text-slate-400 mt-1">{alert.message}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {plans(result).map((plan) => (
            plan.entries.length > 0 && (
              <section key={plan.key} className="glass p-6 space-y-4">
                <div className="flex items-center gap-3">
                  {plan.icon}
                  <h2 className="text-lg font-bold text-white">{plan.title}</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {plan.entries.map((entry) => {
                    const preferCny = entry.model.currencyNative === "CNY" || entry.model.isDomestic || currencyPreference === "CNY";
                    return (
                      <article key={entry.model.slug} className="rounded-xl border border-white/10 bg-white/3 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-sm text-white">{entry.model.modelName}</p>
                            <p className="text-[10px] text-slate-500">
                              {entry.model.providerName} · {entry.model.tierLabel} · {entry.model.priceSourceCount} sources
                              {entry.model.contextLength ? ` · ${formatContext(entry.model.contextLength)}` : ""}
                            </p>
                          </div>
                          <span className="font-mono text-sm font-bold text-success">{formatUsd(entry.monthlyCost)}/mo</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-black/15 p-2">
                            <p className="text-[10px] text-slate-500">Input / 1M</p>
                            <PriceValue usd={entry.model.inputUsd} nativeCny={entry.model.nativeInputPer1mCny} currencyNative={entry.model.currencyNative} estimatedCurrency={entry.model.estimatedCurrency} preferCny={preferCny} compact />
                          </div>
                          <div className="rounded-lg bg-black/15 p-2">
                            <p className="text-[10px] text-slate-500">Output / 1M</p>
                            <PriceValue usd={entry.model.outputUsd} nativeCny={entry.model.nativeOutputPer1mCny} currencyNative={entry.model.currencyNative} estimatedCurrency={entry.model.estimatedCurrency} preferCny={preferCny} compact />
                          </div>
                        </div>
                        <PriceSourceBadges isOfficial={entry.model.isOfficialPrice} isAggregator={entry.model.isAggregatorPrice} isDomestic={entry.model.isDomestic} currencyNative={entry.model.currencyNative} estimatedCurrency={entry.model.estimatedCurrency} confidence={entry.model.sourceConfidence} flags={entry.model.dataQualityFlags} />
                        <div className="flex flex-wrap gap-1">
                          {entry.reasons.slice(0, 5).map((reason) => <span key={reason} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{reason}</span>)}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="rounded-lg border border-success/10 bg-success/5 p-2">
                            <p className="text-success mb-1">Good for</p>
                            <p className="text-slate-400">{entry.suitableFor.slice(0, 3).join(" / ") || "general tasks"}</p>
                          </div>
                          <div className="rounded-lg border border-warning/10 bg-warning/5 p-2">
                            <p className="text-warning mb-1">Not ideal for</p>
                            <p className="text-slate-400">{entry.notSuitableFor.slice(0, 3).join(" / ") || "no clear gap"}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-[10px] text-slate-500">
                          <p>Stronger option: {entry.strongerAlternative ? <Link className="text-primary hover:underline" href={`/models/${entry.strongerAlternative.slug}`}>{entry.strongerAlternative.name}</Link> : "none"}</p>
                          <p>Cheaper option: {entry.cheaperAlternative ? <Link className="text-primary hover:underline" href={`/models/${entry.cheaperAlternative.slug}`}>{entry.cheaperAlternative.name}</Link> : "none"}</p>
                          {entry.model.estimatedCurrency && <p className="text-warning">This is a USD-to-CNY estimate, not a native mainland CNY price.</p>}
                          {entry.model.dataConfidenceIssue && <p className="text-warning">Data confidence needs attention.</p>}
                        </div>
                        <Link href={`/models/${entry.model.slug}`} className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">Details <ExternalLink className="h-2.5 w-2.5" /></Link>
                      </article>
                    );
                  })}
                </div>
              </section>
            )
          ))}

          {result.latestModelAlerts && result.latestModelAlerts.length > 0 && (
            <section className="glass p-5">
              <h2 className="text-sm font-semibold text-white mb-2">Newer models with pending price review</h2>
              <div className="grid md:grid-cols-3 gap-2">
                {result.latestModelAlerts.slice(0, 6).map((model) => (
                  <a key={`${model.provider_slug}-${model.model_slug}`} href={model.source_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/3 p-3 hover:bg-white/5">
                    <p className="text-xs text-white truncate">{model.model_name}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{model.provider_slug} · {model.lifecycle_tier}</p>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-main py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center space-y-3 mb-8">
          <Sparkles className="w-10 h-10 text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-white">AI model advisor</h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">Choose scenario, budget, region, channel, currency, and quality needs. Results include reasons and alternatives.</p>
        </header>

        <div className="flex items-center justify-center gap-1 mb-8">
          {STEPS.map((item, index) => (
            <div key={item.key} className="flex items-center gap-1">
              <span className={`rounded-full border px-2.5 py-1 text-[10px] transition ${step === item.key ? "border-primary/40 bg-primary/20 text-primary" : "border-white/10 text-slate-500"} ${STEPS.findIndex((x) => x.key === step) > index ? "border-success/30 bg-success/10 text-success" : ""}`}>
                {STEPS.findIndex((x) => x.key === step) > index ? <CheckCircle className="w-3 h-3 inline mr-0.5" /> : null}{item.label}
              </span>
              {index < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-slate-700" />}
            </div>
          ))}
        </div>

        <section className="glass p-6">
          {step === "scenario" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">Scenario</h2>
              <div className="grid grid-cols-2 gap-2">
                {SCENARIOS.map((item) => <button key={item.id} onClick={() => setScenario(item.id)} className={`rounded-xl border p-3 text-left text-xs transition ${scenario === item.id ? "border-primary/50 bg-primary/10 text-white" : "border-white/10 text-slate-400 hover:border-white/20"}`}>{item.label}</button>)}
              </div>
            </div>
          )}

          {step === "budget" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">Budget</h2>
              <div className="grid grid-cols-2 gap-2">
                {BUDGETS.map((item) => <button key={item.id} onClick={() => setBudget(item.id)} className={`rounded-xl border p-3 text-left text-xs transition ${budget === item.id ? "border-primary/50 bg-primary/10 text-white" : "border-white/10 text-slate-400"}`}>{item.label}</button>)}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-[11px] text-slate-400">Monthly input tokens<input type="number" value={monthlyInput} onChange={(event) => setMonthlyInput(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-2.5 font-mono text-sm text-white focus:border-primary/50 focus:outline-none" /></label>
                <label className="text-[11px] text-slate-400">Monthly output tokens<input type="number" value={monthlyOutput} onChange={(event) => setMonthlyOutput(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-2.5 font-mono text-sm text-white focus:border-primary/50 focus:outline-none" /></label>
              </div>
            </div>
          )}

          {step === "tech" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">Filters</h2>
              <div className="grid grid-cols-3 gap-2">{REGION_OPTIONS.map((item) => <button key={item.id} onClick={() => setRegionPreference(item.id)} className={`rounded-lg border px-2.5 py-1.5 text-[11px] transition ${regionPreference === item.id ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-slate-400"}`}>{item.label}</button>)}</div>
              <div className="grid grid-cols-4 gap-2">{CHANNEL_OPTIONS.map((item) => <button key={item.id} onClick={() => setChannelPreference(item.id)} className={`rounded-lg border px-2.5 py-1.5 text-[11px] transition ${channelPreference === item.id ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-slate-400"}`}>{item.label}</button>)}</div>
              <div className="grid grid-cols-3 gap-2">{CURRENCY_OPTIONS.map((item) => <button key={item.id} onClick={() => setCurrencyPreference(item.id)} className={`rounded-lg border px-2.5 py-1.5 text-[11px] transition ${currencyPreference === item.id ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-slate-400"}`}>{item.label}</button>)}</div>
              <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={requireDomesticPayment} onChange={(event) => setRequireDomesticPayment(event.target.checked)} className="accent-primary" />Need mainland payment</label>
              <div className="flex flex-wrap gap-1.5">{TECH_OPTIONS.map((item) => <button key={item.id} onClick={() => toggleTech(item.id)} className={`rounded-lg border px-2.5 py-1.5 text-[11px] transition ${techReqs.includes(item.id) ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-slate-400 hover:border-white/20"}`}>{item.label}</button>)}</div>
            </div>
          )}

          {step === "quality" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">Quality</h2>
              <div className="grid gap-2">{QUALITIES.map((item) => <button key={item.id} onClick={() => setQuality(item.id)} className={`rounded-xl border p-3 text-left text-xs transition ${quality === item.id ? "border-primary/50 bg-primary/10 text-white" : "border-white/10 text-slate-400"}`}>{item.label}</button>)}</div>
            </div>
          )}

          {error && <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-danger/5 px-3 py-2 text-[11px] text-danger"><AlertTriangle className="h-3 w-3" /> {error}</div>}

          <div className="flex justify-between pt-6">
            {step !== "scenario" ? <button onClick={prevStep} className="px-3 py-2 text-xs text-slate-400 hover:text-white">Back</button> : <div />}
            {step === "quality" ? (
              <button onClick={getResults} disabled={loading} className={`rounded-xl px-6 py-2.5 text-sm font-semibold text-white brand-glow ${loading ? "opacity-50" : ""}`}>
                {loading ? <><Loader2 className="w-4 h-4 inline mr-1 animate-spin" />Loading...</> : <><Search className="w-4 h-4 inline mr-1" />Get recommendations</>}
              </button>
            ) : (
              <button onClick={nextStep} className="rounded-xl px-4 py-2 text-sm font-semibold text-white brand-glow">Next <ChevronRight className="w-4 h-4 inline" /></button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
