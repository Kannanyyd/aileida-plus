/**
 * 模型写入：upsert with ON CONFLICT (prevents race conditions across sources)
 */
import { eq } from "drizzle-orm";
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
    .onConflictDoUpdate({
      target: models.slug,
      set: {
        name: m.name,
        family: m.family,
        modality: m.modality ?? ["text"],
        context_length: m.context_length,
        max_output_tokens: m.max_output_tokens,
        capabilities: m.capabilities ?? [],
        release_date: m.release_date,
        status: m.status ?? "active",
        updated_at: new Date(),
      },
    })
    .returning();
  return u;
}

export async function findModelByExternalId(externalId: string) {
  const slug = externalId.includes("/") ? externalId.split("/").slice(1).join("/") : externalId;
  const rows = await db.select().from(models).where(eq(models.slug, slug)).limit(1);
  return rows[0] ?? null;
}
