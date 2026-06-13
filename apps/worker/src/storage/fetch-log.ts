import { db } from "./client.js";
import { sourceFetchLogs, sourceSnapshots } from "./schema.js";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

export async function logFetchStart(sourceId: string, sourceType: string, url?: string): Promise<string> {
  const result = await db
    .insert(sourceFetchLogs)
    .values({
      source_id: sourceId,
      source_type: sourceType,
      url: url ?? null,
      status: "running",
      items_fetched: 0,
      items_new: 0,
    })
    .returning({ id: sourceFetchLogs.id });
  return result[0]?.id ?? "";
}

export async function logFetchSuccess(
  logId: string,
  itemsFetched: number,
  itemsNew: number,
  durationMs: number,
) {
  if (!logId) return;
  await db
    .update(sourceFetchLogs)
    .set({
      status: "success",
      items_fetched: itemsFetched,
      items_new: itemsNew,
      duration_ms: durationMs,
    })
    .where(eq(sourceFetchLogs.id, logId));
}

export async function logFetchError(logId: string, errorMessage: string, durationMs: number) {
  if (!logId) return;
  await db
    .update(sourceFetchLogs)
    .set({
      status: "error",
      error_message: errorMessage?.slice(0, 500),
      duration_ms: durationMs,
    })
    .where(eq(sourceFetchLogs.id, logId));
}

export async function saveSnapshot(
  sourceId: string,
  url: string,
  contentType: string,
  rawContent: string,
): Promise<void> {
  const rawHash = crypto.createHash("sha256").update(rawContent).digest("hex").slice(0, 16);
  try {
    await db.insert(sourceSnapshots).values({
      source_id: sourceId,
      url,
      content_type: contentType,
      raw_content: rawContent.slice(0, 50000),
      raw_hash: rawHash,
      parse_status: "success",
    });
  } catch (err: any) {
    console.error(`[snapshot] save failed for ${sourceId}:`, err?.message);
  }
}
