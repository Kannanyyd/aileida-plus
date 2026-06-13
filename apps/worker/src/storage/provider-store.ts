/**
 * Provider 写入：upsert
 */
import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { providers } from "./schema.js";

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
    })
    .returning();
  return u;
}
