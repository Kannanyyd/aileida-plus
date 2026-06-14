import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Database, ExternalLink, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db/client";
import { modelStrengths } from "@/lib/db/schema";
import { getModelBySlug, getModelPricingList, listModels } from "@/lib/db/queries";
import { getModelTier, scoreModel } from "@/lib/rank/score";
import { formatContext, relativeTime } from "@/lib/utils";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { Tag } from "@/components/tag";
import { ModelCard } from "@/components/model-card";
import { ModelStrengthsSection, SiteDisclaimer } from "@/components/model-strengths";
import { PriceTrendChart } from "@/components/price-trend-chart";
import { ReviewSection } from "@/components/review-section";
import { ReviewForm } from "@/components/review-form";
import { PriceSourceBadges, PriceValue, SourceLink } from "@/components/price-trust";

export const revalidate = 300;

const tierLabels: Record<string, string> = {
  current_frontier: "current_frontier",
  current_mainstream: "current_mainstream",
  previous_generation: "previous_generation",
  legacy: "legacy",
  deprecated: "deprecated",
  unknown: "unknown",
};

function nativeFromTieredRules(rules: unknown, key: "input_per_1m" | "output_per_1m" | "cached_input_per_1m") {
  if (!Array.isArray(rules)) return null;
  const value = (rules[0] as Record<string, unknown> | undefined)?.[key];
  return typeof value === "number" ? value : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const model = await getModelBySlug(decoded);
  if (!model) return { title: "Model not found", description: "ModelPrice Radar has not indexed this model." };
  return {
    title: `${model.model_name} API price and channels`,
    description: `${model.model_name} official API price, aggregator price, cloud price, native CNY price, USD price, source URL, update time, and data quality flags.`,
    alternates: { canonical: `/models/${encodeURIComponent(decoded)}` },
    openGraph: {
      title: `${model.model_name} API price`,
      description: `${model.provider_name_zh} ${model.model_name} multi-channel pricing and source metadata.`,
      type: "article",
    },
  };
}

export default async function ModelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const model = await getModelBySlug(decoded);
  if (!model) return notFound();

  const [strengthRows, allModels, pricingList] = await Promise.all([
    db.select().from(modelStrengths).where(eq(modelStrengths.model_id, model.model_id)).orderBy(modelStrengths.sort_order),
    listModels({ limit: 220 }),
    getModelPricingList(model.model_id),
  ]);

  const strengths = strengthRows.map((row) => ({ name_zh: row.name_zh, category: row.category }));
  const tier = getModelTier(model);
  const recommendForNewProject = tier === "current_frontier" || tier === "current_mainstream";
  const variant = model.need_manual_review
    ? "review"
    : model.confidence_score >= 0.85
      ? "official"
      : model.confidence_score >= 0.7
        ? "multi-source"
        : "third-party";

  const currentScore = scoreModel(model, allModels).total;
  const stronger = allModels
    .filter((item) => item.model_id !== model.model_id && scoreModel(item, allModels).total > currentScore)
    .slice(0, 2);
  const cheaper = allModels
    .filter((item) => item.model_id !== model.model_id && (item.input_per_1m_usd ?? 999) < (model.input_per_1m_usd ?? 999) && !["legacy", "deprecated"].includes(getModelTier(item)))
    .slice(0, 2);
  const sameProviderNewer = allModels
    .filter((item) => item.model_id !== model.model_id && item.provider_id === model.provider_id && ["current_frontier", "current_mainstream"].includes(getModelTier(item)))
    .slice(0, 2);
  const domesticAlt = allModels
    .filter((item) => item.model_id !== model.model_id && (item.provider_region === "cn" || item.is_domestic || item.pricing_region === "china_mainland"))
    .slice(0, 2);
  const overseasOfficialAlt = allModels
    .filter((item) => item.model_id !== model.model_id && item.provider_region !== "cn" && item.is_official)
    .slice(0, 2);
  const similar = allModels
    .filter((item) => item.model_id !== model.model_id && (item.provider_id === model.provider_id || item.model_family === model.model_family || item.family === model.family))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <section className="glass p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">
              <Link href="/models" className="hover:text-primary">Models</Link> / {model.provider_name_zh}
            </p>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
              {model.model_name}
              <ConfidenceBadge variant={variant as never} />
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {model.provider_name_zh} · {model.provider_region === "cn" ? "mainland provider" : "overseas provider"}
              {model.context_length ? ` · context ${formatContext(model.context_length)}` : ""}
            </p>
            <div className="mt-3 flex gap-1.5 flex-wrap">
              <Tag variant={recommendForNewProject ? "primary" : "warning"}>{tierLabels[tier] ?? tier}</Tag>
              <Tag variant={recommendForNewProject ? "success" : "danger"}>{recommendForNewProject ? "good for new projects" : "not default for new projects"}</Tag>
              {(model.capabilities ?? []).map((capability) => <Tag key={capability} variant="primary">{capability}</Tag>)}
              {(model.modality ?? []).map((modality) => <Tag key={modality} variant="cyan">{modality}</Tag>)}
              {(model.data_quality_flags ?? []).map((flag) => <Tag key={flag} variant="warning">{flag}</Tag>)}
            </div>
          </div>
        </div>
      </section>

      {strengths.length > 0 && <ModelStrengthsSection strengths={strengths} modelName={model.model_name} />}

      <section className="glass p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Multi-channel pricing</h2>
            <p className="text-[11px] text-slate-500 mt-1">Owner, selling platform, source provider, native CNY, USD, estimates, source URL, update time, and quality flags.</p>
          </div>
          <span className="text-[11px] text-slate-500">{pricingList.length} rows</span>
        </div>
        {pricingList.length === 0 ? (
          <p className="text-sm text-warning">Pricing pending. This model can appear in discovery but not in price rankings.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-slate-500">
                  <th className="py-2 text-left font-normal">Region</th>
                  <th className="py-2 text-left font-normal">Channel</th>
                  <th className="py-2 text-left font-normal">Provider relation</th>
                  <th className="py-2 text-right font-normal">Input / 1M</th>
                  <th className="py-2 text-right font-normal">Output / 1M</th>
                  <th className="py-2 text-right font-normal">Cache / 1M</th>
                  <th className="py-2 text-left font-normal">Source and quality</th>
                  <th className="py-2 text-right font-normal">Updated</th>
                </tr>
              </thead>
              <tbody>
                {pricingList.map((price) => {
                  const preferCny = price.currency_native === "CNY" || price.is_domestic || price.region === "china_mainland";
                  const estimated = preferCny && price.currency_native !== "CNY";
                  return (
                    <tr key={price.id} className="border-b border-white/5 align-top hover:bg-white/5">
                      <td className="py-3"><span className={`rounded px-1.5 py-0.5 text-[10px] ${preferCny ? "bg-cyan/10 text-cyan" : "bg-primary/10 text-primary"}`}>{price.region}</span></td>
                      <td className="py-3 text-slate-300">
                        <p>{price.channel}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-500">{price.platform || price.primary_source_id}</p>
                      </td>
                      <td className="py-3 text-[10px] text-slate-500">
                        <p>owner: <span className="font-mono text-slate-300">{model.model_owner_provider}</span></p>
                        <p>selling: <span className="font-mono text-slate-300">{price.selling_platform_provider || model.model_selling_platform_provider || "-"}</span></p>
                        <p>source: <span className="font-mono text-slate-300">{price.source_provider || price.primary_source_id}</span></p>
                      </td>
                      <td className="py-3 text-right"><PriceValue usd={price.input_per_1m_usd} nativeCny={nativeFromTieredRules(price.tiered_rules, "input_per_1m")} currencyNative={price.currency_native} estimatedCurrency={estimated} preferCny={preferCny} compact /></td>
                      <td className="py-3 text-right"><PriceValue usd={price.output_per_1m_usd} nativeCny={nativeFromTieredRules(price.tiered_rules, "output_per_1m")} currencyNative={price.currency_native} estimatedCurrency={estimated} preferCny={preferCny} compact /></td>
                      <td className="py-3 text-right"><PriceValue usd={price.input_cached_read_per_1m_usd} nativeCny={nativeFromTieredRules(price.tiered_rules, "cached_input_per_1m")} currencyNative={price.currency_native} estimatedCurrency={estimated} preferCny={preferCny} compact /></td>
                      <td className="py-3">
                        <PriceSourceBadges isOfficial={price.is_official} isAggregator={price.is_aggregator} channel={price.channel} isDomestic={preferCny} currencyNative={price.currency_native} estimatedCurrency={estimated} confidence={price.confidence_score} flags={price.data_quality_flags} />
                        <div className="mt-1"><SourceLink href={price.source_url} label={price.primary_source_id || "source"} /></div>
                      </td>
                      <td className="py-3 text-right text-slate-400">{relativeTime(price.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="glass p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Price history</h2>
        <PriceTrendChart data={[]} field="input" />
      </section>

      <ReviewSection reviews={[]} summary={{ count: 0, avgOverall: 0, dims: {} }} modelSlug={decoded} />
      <ReviewForm modelSlug={decoded} />

      <section>
        <h2 className="text-sm font-semibold text-white mb-3">Alternatives</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { title: "Stronger", items: stronger },
            { title: "Cheaper", items: cheaper },
            { title: "Same provider newer", items: sameProviderNewer },
            { title: "Mainland usable", items: domesticAlt },
            { title: "Overseas official", items: overseasOfficialAlt },
          ].map((group) => (
            <div key={group.title} className="glass p-3">
              <p className="text-xs font-semibold text-white mb-2">{group.title}</p>
              <div className="space-y-1.5">
                {group.items.length > 0 ? group.items.map((item) => (
                  <Link key={item.model_id} href={`/models/${encodeURIComponent(item.model_slug)}`} className="block text-[11px] text-slate-300 hover:text-primary truncate">
                    {item.model_name}
                    <span className="block text-[10px] text-slate-600">{item.provider_name_zh}</span>
                  </Link>
                )) : <p className="text-[11px] text-slate-500">No candidate</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {similar.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-3">Similar models</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {similar.map((item) => <ModelCard key={item.model_id} m={item} />)}
          </div>
        </section>
      )}

      <section className="glass p-5">
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Data trust</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          {[
            ["owner", model.model_owner_provider],
            ["canonical provider", model.canonical_provider_slug],
            ["selling platform", model.model_selling_platform_provider || model.selling_platform_provider],
            ["source provider", model.model_source_provider || model.source_provider],
            ["canonical model", model.canonical_model_slug],
            ["model family", model.model_family],
            ["variant", model.model_variant],
            ["source model id", model.source_model_id],
          ].map(([label, value]) => (
            <div key={label} className="rounded border border-white/10 bg-white/3 p-2">
              <p className="text-[10px] text-slate-500">{label}</p>
              <p className="mt-0.5 font-mono text-[11px] text-white break-all">{value || "unknown"}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <Database className="w-3.5 h-3.5 text-primary" />
          Main source:
          <a href={model.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            {model.primary_source_id || "source"} <ExternalLink className="w-3 h-3" />
          </a>
          · updated {relativeTime(model.updated_at)}
        </p>
      </section>

      <SiteDisclaimer />
    </div>
  );
}
