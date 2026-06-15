import { listProviders } from "@/lib/db/queries";
import { Building2, MapPin, CreditCard, ChevronRight } from "lucide-react";
import Link from "next/link";

export const revalidate = 300;

const CATEGORY_ORDER = ["model-vendor", "api-aggregator", "cloud-vendor", "open-source-platform", "app-platform"];
const CATEGORY_LABELS: Record<string, string> = {
  "model-vendor": "模型厂商",
  "cloud-vendor": "云平台",
  "api-aggregator": "API 聚合平台",
  "open-source-platform": "开源模型平台",
  "app-platform": "AI 应用平台",
};

export default async function ProvidersPage() {
  const providers = await listProviders();
  const cn = providers.filter((provider) => provider.region === "cn");
  const global = providers.filter((provider) => provider.region !== "cn");

  function groupByCategory(items: typeof providers) {
    const groups: Record<string, typeof providers> = {};
    for (const provider of items) {
      const category = provider.provider_category ?? "other";
      (groups[category] ??= []).push(provider);
    }
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
          <Building2 className="w-5 h-5 text-primary" /> 厂商与平台
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          已收录 {providers.length} 家模型厂商、云平台和聚合平台，用于区分模型所有者、销售平台与采集来源。
        </p>
      </header>

      {[
        { label: "国内厂商与平台", items: cn },
        { label: "海外厂商与平台", items: global },
      ].map((section) => {
        if (section.items.length === 0) return null;
        const groups = groupByCategory(section.items);

        return (
          <section key={section.label}>
            <h2 className="text-sm font-semibold text-white mb-4">{section.label}</h2>
            {Object.entries(groups).map(([category, items]) => (
              <div key={category} className="mb-5">
                {category !== "other" && (
                  <p className="text-[10px] text-slate-500 mb-2 ml-1">{CATEGORY_LABELS[category] ?? category}</p>
                )}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((provider) => (
                    <Link
                      key={provider.slug}
                      href={`/providers/${provider.slug}`}
                      className="glass p-4 hover:border-primary/40 transition group"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{provider.name_zh}</p>
                          {provider.short_description && (
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{provider.short_description}</p>
                          )}
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-primary transition shrink-0 mt-0.5" />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
                        {provider.headquarters && (
                          <span className="flex items-center gap-0.5 text-slate-500">
                            <MapPin className="w-2.5 h-2.5" /> {provider.headquarters}
                          </span>
                        )}
                        <span className="text-slate-600">
                          模型 <span className="font-mono text-slate-400">{provider.model_count}</span>
                        </span>
                        {provider.supports_domestic_payment && (
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

      <div className="glass p-4 text-[10px] text-slate-500 leading-relaxed">
        厂商页用于解释模型所有者、销售平台和采集来源的关系。Azure、OpenRouter、硅基流动、火山方舟等销售平台不会被直接合并成模型原厂。
      </div>
    </div>
  );
}
