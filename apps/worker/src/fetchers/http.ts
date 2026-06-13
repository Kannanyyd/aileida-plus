import { fetch as undiciFetch } from "undici";
import { config } from "../config.js";
import type { RawPayload } from "../types.js";

/**
 * 通用 HTTP 抓取（轻量、不渲染）
 */
export async function fetchJson(url: string, sourceId: string): Promise<RawPayload> {
  const res = await undiciFetch(url, {
    headers: {
      "user-agent": config.userAgent,
      accept: "application/json,*/*",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  const body = await res.text();
  return {
    url,
    fetchedAt: new Date().toISOString(),
    contentType: "json",
    body,
    sourceId,
  };
}

export async function fetchText(url: string, sourceId: string): Promise<RawPayload> {
  const res = await undiciFetch(url, {
    headers: {
      "user-agent": config.userAgent,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  const ct = res.headers.get("content-type") ?? "";
  const body = await res.text();
  const contentType: RawPayload["contentType"] = ct.includes("json")
    ? "json"
    : ct.includes("html")
      ? "html"
      : "text";
  return { url, fetchedAt: new Date().toISOString(), contentType, body, sourceId };
}
