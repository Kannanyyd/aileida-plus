import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { fetchHtml } from "../fetchers/html.js";
import { NEWS_SOURCE_REGISTRY, type NewsSourceConfig } from "./news-registry.js";

export interface VendorAnnouncementCandidate {
  source: NewsSourceConfig;
  title: string;
  url: string;
  summary: string | null;
  bodyText: string | null;
  category: string;
  tags: string[];
  affectsPricing: boolean;
  importance: number;
  externalId: string;
}

const ANNOUNCEMENT_HINTS = [
  "公告",
  "发布",
  "更新",
  "上线",
  "价格",
  "计费",
  "优惠",
  "release",
  "changelog",
  "news",
  "pricing",
  "launch",
  "update",
  "announcement",
  "notice",
];

function normalizeText(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function absolutizeUrl(href: string, baseUrl: string) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return baseUrl;
  }
}

function classify(title: string, url: string) {
  const text = `${title} ${url}`.toLowerCase();
  const tags: string[] = [];
  let category = "product-update";
  let affectsPricing = false;
  let importance = 3;

  if (/价格|计费|费用|降价|调价|pricing|price|billing/.test(text)) {
    category = "price-change";
    affectsPricing = true;
    importance = 4;
    tags.push("pricing");
  }
  if (/优惠|折扣|免费|额度|活动|voucher|discount|free|promotion|coupon/.test(text)) {
    category = "promotion";
    affectsPricing = true;
    importance = Math.max(importance, 4);
    tags.push("promotion");
  }
  if (/模型|大模型|model|llm|deepseek|qwen|glm|kimi|doubao|hunyuan|ernie|claude|gpt|gemini/.test(text)) {
    if (category === "product-update") category = "new-model";
    tags.push("model");
  }
  if (/api|sdk|控制台|console|平台|文档|docs/.test(text)) tags.push("platform");

  return { category, tags: Array.from(new Set(tags)), affectsPricing, importance };
}

function looksLikeAnnouncement(title: string, url: string) {
  const value = `${title} ${url}`.toLowerCase();
  if (title.length < 6) return false;
  if (/上一篇|下一篇|相关阅读|相关推荐|文档.*捉虫|通知服务|联系我们|登录|注册/.test(title)) return false;
  if (ANNOUNCEMENT_HINTS.some((hint) => value.includes(hint.toLowerCase()))) return true;
  return /(模型|model|llm).*(发布|上线|更新|升级|release|launch|update)/i.test(value);
}

function isProviderRelevant(title: string, url: string, source: NewsSourceConfig) {
  const value = `${title} ${url}`.toLowerCase();
  if (source.provider_slug === "tencent-hunyuan") {
    return /大模型|模型|混元|tokenhub|hunyuan|deepseek|minimax|qwen|glm|llm/i.test(value);
  }
  if (source.provider_slug === "baidu-qianfan") {
    return /大模型|模型|千帆|文心|ernie|qianfan|llm/i.test(value);
  }
  return true;
}

function externalId(sourceSlug: string, url: string, title: string) {
  return createHash("sha1").update(`${sourceSlug}:${url}:${title}`).digest("hex");
}

function extractCandidates(html: string, url: string, source: NewsSourceConfig): VendorAnnouncementCandidate[] {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();

  const pageTitle = normalizeText($("title").first().text() || source.name_zh);
  const pageSummary = normalizeText(
    $('meta[name="description"]').attr("content") ??
      $("main p, article p, .content p, .markdown p, p").first().text() ??
      "",
  ).slice(0, 240);

  const byUrl = new Map<string, VendorAnnouncementCandidate>();
  $("a[href]").each((_, el) => {
    const title = normalizeText($(el).text());
    const href = $(el).attr("href");
    if (!href || !looksLikeAnnouncement(title, href)) return;
    if (!isProviderRelevant(title, href, source)) return;

    const itemUrl = absolutizeUrl(href, url);
    if (!itemUrl.startsWith("http")) return;
    const classified = classify(title, itemUrl);
    byUrl.set(itemUrl, {
      source,
      title,
      url: itemUrl,
      summary: pageSummary || null,
      bodyText: null,
      category: classified.category,
      tags: classified.tags,
      affectsPricing: classified.affectsPricing,
      importance: classified.importance,
      externalId: externalId(source.slug, itemUrl, title),
    });
  });

  if (byUrl.size === 0) {
    const text = normalizeText($("main, article, body").first().text()).slice(0, 1200);
    const fallbackTitle = pageTitle || `${source.name_zh}公告`;
    const classified = classify(fallbackTitle, url);
    byUrl.set(url, {
      source,
      title: fallbackTitle,
      url,
      summary: pageSummary || text.slice(0, 240) || null,
      bodyText: text || null,
      category: classified.category,
      tags: classified.tags,
      affectsPricing: classified.affectsPricing,
      importance: classified.importance,
      externalId: externalId(source.slug, url, fallbackTitle),
    });
  }

  return Array.from(byUrl.values()).slice(0, 12);
}

export async function fetchVendorAnnouncements() {
  const officialSources = NEWS_SOURCE_REGISTRY.filter((source) => source.priority >= 10 && source.provider_slug);
  const items: VendorAnnouncementCandidate[] = [];
  const raw: { source: string; url: string; count: number; error?: string }[] = [];

  for (const source of officialSources) {
    for (const url of source.urls) {
      try {
        const payload = await fetchHtml(url, source.slug, { timeoutMs: 20000, waitForNetworkIdle: false });
        const candidates = extractCandidates(payload.body, url, source);
        items.push(...candidates);
        raw.push({ source: source.slug, url, count: candidates.length });
      } catch (err: any) {
        raw.push({ source: source.slug, url, count: 0, error: err?.message ?? String(err) });
      }
    }
  }

  return { items, rawText: JSON.stringify({ fetched_at: new Date().toISOString(), sources: raw }, null, 2) };
}
