/**
 * Provider 写入：upsert
 */
import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { providers } from "./schema.js";

const PROVIDER_ALIASES: Record<string, { canonical: string; type: string; confidence: number; review: boolean }> = {
  "x-ai": { canonical: "xai", type: "model_vendor", confidence: 0.98, review: false },
  "x.ai": { canonical: "xai", type: "model_vendor", confidence: 0.98, review: false },
  "google-ai": { canonical: "google", type: "model_vendor", confidence: 0.95, review: false },
  gemini: { canonical: "google", type: "model_vendor", confidence: 0.95, review: false },
  "vertex-ai-language-models": { canonical: "google", type: "cloud_platform", confidence: 0.9, review: false },
  "~openai": { canonical: "openai", type: "model_vendor", confidence: 0.92, review: false },
  "azure-openai": { canonical: "openai", type: "cloud_platform", confidence: 0.7, review: true },
  claude: { canonical: "anthropic", type: "model_vendor", confidence: 0.95, review: false },
  alibaba: { canonical: "alibaba-cloud", type: "cloud_platform", confidence: 0.88, review: false },
  aliyun: { canonical: "alibaba-cloud", type: "cloud_platform", confidence: 0.9, review: false },
  "aliyun-bailian": { canonical: "alibaba-cloud", type: "cloud_platform", confidence: 0.96, review: false },
  bailian: { canonical: "alibaba-cloud", type: "cloud_platform", confidence: 0.95, review: false },
  qwen: { canonical: "alibaba-cloud", type: "model_vendor", confidence: 0.82, review: true },
  bytedance: { canonical: "bytedance-volcano", type: "cloud_platform", confidence: 0.88, review: false },
  volcano: { canonical: "bytedance-volcano", type: "cloud_platform", confidence: 0.95, review: false },
  volcengine: { canonical: "bytedance-volcano", type: "cloud_platform", confidence: 0.98, review: false },
  doubao: { canonical: "bytedance-volcano", type: "model_vendor", confidence: 0.85, review: true },
  "硅基流动": { canonical: "siliconflow", type: "api_aggregator", confidence: 0.98, review: false },
};

export async function upsertProvider(p: {
  slug: string;
  name_zh: string;
  name_en?: string;
  region: "cn" | "global";
  homepage?: string;
  docs_url?: string;
  api_base_url?: string;
  logo_url?: string;
  tags?: string[];
}) {
  const alias = PROVIDER_ALIASES[p.slug.toLowerCase()];
  const canonical = alias?.canonical ?? p.slug;
  const existing = await db.select().from(providers).where(eq(providers.slug, p.slug)).limit(1);
  if (existing.length > 0) {
    const [u] = await db
      .update(providers)
      .set({
        name_zh: p.name_zh,
        name_en: p.name_en,
        region: p.region,
        homepage: p.homepage,
        docs_url: p.docs_url,
        api_base_url: p.api_base_url,
        logo_url: p.logo_url,
        tags: p.tags ?? [],
        canonical_slug: canonical,
        provider_type: alias?.type ?? undefined,
        is_canonical: canonical === p.slug,
        alias_confidence: String(alias?.confidence ?? 1),
        alias_source: alias ? "manual-baseline" : "self",
        needs_alias_review: alias?.review ?? false,
        updated_at: new Date(),
      })
      .where(eq(providers.slug, p.slug))
      .returning();
    return u;
  }
  const [u] = await db
    .insert(providers)
    .values({
      slug: p.slug,
      name_zh: p.name_zh,
      name_en: p.name_en,
      region: p.region,
      homepage: p.homepage,
      docs_url: p.docs_url,
      api_base_url: p.api_base_url,
      logo_url: p.logo_url,
      tags: p.tags ?? [],
      canonical_slug: canonical,
      provider_type: alias?.type,
      is_canonical: canonical === p.slug,
      alias_confidence: String(alias?.confidence ?? 1),
      alias_source: alias ? "manual-baseline" : "self",
      needs_alias_review: alias?.review ?? false,
    })
    .returning();
  return u;
}
