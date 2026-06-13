import { listProviders } from "@/lib/db/queries";
import { Building2, MapPin, CreditCard, ChevronRight } from "lucide-react";
import Link from "next/link";

export const revalidate = 300;

const CATEGORY_ORDER = ["model-vendor", "api-aggregator", "cloud-vendor", "open-source-platform", "app-platform"];
const CATEGORY_LABELS: Record<string, string> = {
  "model-vendor": "模型厂商",
  "cloud-vendor": "云厂商",
  "api-aggregator": "API 聚合平台",
  "open-source-platform": "开源模型平台",
  "app-platform": "AI 应用平台",
};

export default async function ProvidersPage() {
  const providers = await listProviders();

  // 按 provider_category 分组（优先国内，再按分类）
  const cn = providers.filter((p) => p.region === "cn");
  const gl = providers.filter((p) => p.region !== "cn");

  function groupByCategory(items: typeof providers) {
    const groups: Record<string, typeof providers> = {};
    for (const p of items) {
      const cat = p.provider_category ?? "other";
      (groups[cat] ??= []).push(p);
    }
    // 按预设顺序排列
    return Object.fromEntries(
      Object.entries(groups).sort(([a], [b]) => {
        const ai = CATEGORY_ORDER.indexOf(a);
        const bi = CATEGORY_ORDER.indexOf(b);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      }),
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" /> 厂商一览
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          已收录 {providers.length} 家 AI 厂商和平台，持续扩展中。
        </p>
      </header>

      {[
        { label: "国内厂商与平台", items: cn },
        { label: "国际厂商与平台", items: gl },
      ].map((section) => {
        if (section.items.length === 0) return null;
        const groups = groupByCategory(section.items);

        return (
          <section key={section.label}>
            <h2 className="text-sm font-semibold text-white mb-4">{section.label}</h2>
            {Object.entries(groups).map(([cat, items]) => (
              <div key={cat} className="mb-5">
                {cat !== "other" && (
                  <p className="text-[10px] text-slate-500 mb-2 ml-1">{CATEGORY_LABELS[cat] ?? cat}</p>
                )}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/providers/${p.slug}`}
                      className="glass p-4 hover:border-primary/40 transition group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{p.name_zh}</p>
                          {p.short_description && (
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{p.short_description}</p>
                          )}
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-primary transition shrink-0 mt-0.5" />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
                        {p.headquarters && (
                          <span className="flex items-center gap-0.5 text-slate-500">
                            <MapPin className="w-2.5 h-2.5" /> {p.headquarters}
                          </span>
                        )}
                        <span className="text-slate-600">
                          模型 <span className="font-mono text-slate-400">{p.model_count}</span>
                        </span>
                        {p.supports_domestic_payment && (
                          <span className="text-success bg-success/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <CreditCard className="w-2.5 h-2.5" /> 国内付款
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {/* 持续扩展说明 */}
      <div className="glass p-4 text-[10px] text-slate-500 leading-relaxed">
        以上列表会随数据源的扩展持续更新。如果你关注的厂商未在列表中，可以通过
        <Link href="/admin/sources" className="text-primary hover:underline mx-1">数据源管理</Link>
        提交添加申请。新厂商经人工核实后会在此展示。
      </div>
    </div>
  );
}
