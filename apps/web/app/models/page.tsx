import { listModels, listProviders } from "@/lib/db/queries";
import { ModelCard } from "@/components/model-card";
import { Filter, Database } from "lucide-react";
import Link from "next/link";

export const revalidate = 120;

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
      (m) =>
        m.model_name.toLowerCase().includes(q) ||
        m.model_slug.toLowerCase().includes(q) ||
        m.provider_name_zh.toLowerCase().includes(q) ||
        m.provider_slug.toLowerCase().includes(q),
    );
  }
  if (sp.provider) filtered = filtered.filter((m) => m.provider_slug === sp.provider);
  if (sp.cap) filtered = filtered.filter((m) => m.capabilities?.includes(sp.cap!));

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" /> 模型库
          </h1>
          <p className="text-sm text-slate-400 mt-1">共 {filtered.length} 个模型</p>
        </div>
        <form className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="搜索模型名 / 厂商"
            className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white w-56"
          />
          <button
            type="submit"
            className="h-9 px-4 rounded-lg brand-gradient text-white text-sm font-semibold"
          >
            搜索
          </button>
        </form>
      </header>

      <div className="grid lg:grid-cols-[200px_1fr] gap-6">
        <aside className="glass p-4 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> 筛选
          </h2>

          <div>
            <p className="text-[11px] text-slate-500 mb-1.5">厂商</p>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/models"
                  className={`block text-xs px-2 py-1 rounded ${!sp.provider ? "bg-primary-soft text-white" : "text-slate-400 hover:text-white"}`}
                >
                  全部
                </Link>
              </li>
              {providers.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/models?provider=${p.slug}`}
                    className={`block text-xs px-2 py-1 rounded ${sp.provider === p.slug ? "bg-primary-soft text-white" : "text-slate-400 hover:text-white"}`}
                  >
                    {p.name_zh}{" "}
                    <span className="text-[10px] text-slate-600">({p.model_count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] text-slate-500 mb-1.5">能力</p>
            <ul className="space-y-1">
              {[
                { key: "vision", label: "视觉" },
                { key: "function-call", label: "函数调用" },
                { key: "long-context", label: "长上下文" },
                { key: "cache", label: "缓存" },
                { key: "audio", label: "音频" },
                { key: "reasoning", label: "推理" },
              ].map((c) => (
                <li key={c.key}>
                  <Link
                    href={`/models?cap=${c.key}`}
                    className={`block text-xs px-2 py-1 rounded ${sp.cap === c.key ? "bg-primary-soft text-white" : "text-slate-400 hover:text-white"}`}
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.length > 0 ? (
            filtered.map((m) => <ModelCard key={m.model_id} m={m} />)
          ) : (
            <div className="col-span-full glass p-10 text-center text-sm text-slate-500">
              没有匹配的模型。请先抓取数据，或调整筛选条件。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
