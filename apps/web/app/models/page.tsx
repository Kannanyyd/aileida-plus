import type { Metadata } from "next";
import Link from "next/link";
import { Database, Filter } from "lucide-react";
import { listModels, listProviders } from "@/lib/db/queries";
import { ModelCard } from "@/components/model-card";
import { getModelTier } from "@/lib/rank/score";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "AI 模型库与 API 价格",
  description:
    "浏览 AI 模型库，查看厂商、能力、生命周期、价格来源、更新时间、国内价和按美元折算。",
  alternates: { canonical: "/models" },
};

const capabilityFilters = [
  { key: "vision", label: "视觉" },
  { key: "function-call", label: "函数调用" },
  { key: "long-context", label: "长上下文" },
  { key: "cache", label: "缓存" },
  { key: "audio", label: "音频" },
  { key: "reasoning", label: "推理" },
];

function isObsoletePublicModel(model: Awaited<ReturnType<typeof listModels>>[number]) {
  const tier = getModelTier(model);
  if (tier === "previous_generation" || tier === "legacy" || tier === "deprecated") return true;
  const text = `${model.provider_slug} ${model.model_slug} ${model.model_name} ${model.family ?? ""} ${model.model_family ?? ""}`.toLowerCase();
  return /\b(deepseek-r1|deepseek-reasoner|gpt-4o|gpt-4-turbo|gpt-4\b|claude-3(?:-|$)|gemini-2\.5|gemini-1\.5|llama-3(?:-|$)|qwen2(?:\.5)?|doubao-1\.5)\b/i.test(text);
}

export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; provider?: string; cap?: string }>;
}) {
  const sp = await searchParams;
  const [models, providers] = await Promise.all([listModels({ limit: 300 }), listProviders()]);
  let filtered = models.filter((model) => !isObsoletePublicModel(model));

  if (sp.q) {
    const q = sp.q.toLowerCase();
    filtered = filtered.filter(
      (model) =>
        model.model_name.toLowerCase().includes(q) ||
        model.model_slug.toLowerCase().includes(q) ||
        model.provider_name_zh.toLowerCase().includes(q) ||
        model.provider_slug.toLowerCase().includes(q),
    );
  }
  if (sp.provider) filtered = filtered.filter((model) => model.provider_slug === sp.provider || model.canonical_provider_slug === sp.provider);
  if (sp.cap) filtered = filtered.filter((model) => model.capabilities?.includes(sp.cap!));

  return (
    <div className="space-y-6">
      <header className="glass flex flex-wrap items-end justify-between gap-4 p-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" /> AI 模型库
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            共 {filtered.length} 个模型。卡片展示价格来源、更新时间、数据质量标记，以及国内价或按美元折算。
          </p>
        </div>
        <form className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="搜索模型名 / 厂商"
            className="h-9 min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20 sm:w-56 sm:flex-none"
          />
          <button type="submit" className="h-9 rounded-md brand-gradient px-4 text-sm font-semibold text-white">
            搜索
          </button>
        </form>
      </header>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="glass min-w-0 space-y-4 overflow-hidden p-4 lg:sticky lg:top-24 lg:self-start">
          <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> 筛选
          </h2>

          <div>
            <p className="text-[11px] text-slate-500 mb-1.5">厂商</p>
            <ul className="space-y-1">
              <li>
                <Link href="/models" className={`block rounded px-2 py-1 text-xs ${!sp.provider ? "bg-primary-soft text-white" : "text-slate-400 hover:text-white"}`}>
                  全部
                </Link>
              </li>
              {providers.map((provider) => (
                <li key={provider.slug}>
                  <Link
                    href={`/models?provider=${provider.slug}`}
                    className={`block truncate rounded px-2 py-1 text-xs ${sp.provider === provider.slug ? "bg-primary-soft text-white" : "text-slate-400 hover:text-white"}`}
                  >
                    {provider.name_zh} <span className="text-[10px] text-slate-600">({provider.model_count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] text-slate-500 mb-1.5">能力</p>
            <ul className="space-y-1">
              {capabilityFilters.map((capability) => (
                <li key={capability.key}>
                  <Link
                    href={`/models?cap=${capability.key}`}
                    className={`block rounded px-2 py-1 text-xs ${sp.cap === capability.key ? "bg-primary-soft text-white" : "text-slate-400 hover:text-white"}`}
                  >
                    {capability.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.length > 0 ? (
            filtered.map((model) => <ModelCard key={model.model_id} m={model} />)
          ) : (
            <div className="col-span-full glass p-10 text-center text-sm text-slate-500">
              没有匹配的模型。请调整搜索词或筛选条件。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
