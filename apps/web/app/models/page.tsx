import type { Metadata } from "next";
import Link from "next/link";
import { Database, Filter } from "lucide-react";
import { listModels, listProviders } from "@/lib/db/queries";
import { ModelCard } from "@/components/model-card";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "AI模型库与API价格",
  description: "浏览 AI 模型库，查看厂商、能力、生命周期、价格来源、更新时间、人民币原生价和美元估算价。",
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

export default async function ModelsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; provider?: string; cap?: string }>;
}) {
  const sp = await searchParams;
  const [models, providers] = await Promise.all([listModels({ limit: 300 }), listProviders()]);
  let filtered = models;

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
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" /> AI 模型库
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            共 {filtered.length} 个模型。卡片会显示价格来源、更新时间、质量标记，以及原生人民币价或美元估算价。
          </p>
        </div>
        <form className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="搜索模型名 / 厂商"
            className="h-9 w-56 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white"
          />
          <button type="submit" className="h-9 rounded-lg brand-gradient px-4 text-sm font-semibold text-white">
            搜索
          </button>
        </form>
      </header>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <aside className="glass p-4 space-y-4">
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
                    className={`block rounded px-2 py-1 text-xs ${sp.provider === provider.slug ? "bg-primary-soft text-white" : "text-slate-400 hover:text-white"}`}
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

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
