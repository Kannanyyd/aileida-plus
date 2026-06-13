/**
 * 模型写入：upsert
 */
import { and, eq } from "drizzle-orm";
import { db } from "./client.js";
import { models } from "./schema.js";

export async function upsertModel(m: {
  provider_id: string;
  slug: string;
  name: string;
  family?: string;
  modality?: string[];
  context_length?: number;
  max_output_tokens?: number;
  capabilities?: string[];
  release_date?: string;
  status?: "active" | "beta" | "deprecated" | "preview";
}) {
  const existing = await db
    .select()
    .from(models)
    .where(and(eq(models.provider_id, m.provider_id), eq(models.slug, m.slug)))
    .limit(1);
  if (existing.length > 0) {
    const [u] = await db
      .update(models)
      .set({
        name: m.name,
        family: m.family,
        modality: m.modality ?? ["text"],
        context_length: m.context_length,
        max_output_tokens: m.max_output_tokens,
        capabilities: m.capabilities ?? [],
        release_date: m.release_date,
        status: m.status ?? "active",
        updated_at: new Date(),
      })
      .where(eq(models.id, existing[0].id))
      .returning();
    return u;
  }
  const [u] = await db
    .insert(models)
    .values({
      provider_id: m.provider_id,
      slug: m.slug,
      name: m.name,
      family: m.family,
      modality: m.modality ?? ["text"],
      context_length: m.context_length,
      max_output_tokens: m.max_output_tokens,
      capabilities: m.capabilities ?? [],
      release_date: m.release_date,
      status: m.status ?? "active",
    })
    .returning();
  return u;
}

export async function findModelByExternalId(externalId: string) {
  // externalId 形如 'openai/gpt-4o'，对应 model.slug（已不含 provider 前缀）
  // 这里只按 slug 查；provider 信息由 pipeline 层保证
  const slug = externalId.includes("/") ? externalId.split("/").slice(1).join("/") : externalId;
  const rows = await db.select().from(models).where(eq(models.slug, slug)).limit(1);
  return rows[0] ?? null;
}
