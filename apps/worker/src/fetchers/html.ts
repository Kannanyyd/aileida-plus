/**
 * 通用 HTML 抓取器：使用 Playwright 渲染动态页面，cheerio 解析静态 HTML
 */
import { chromium, type Browser, type Page } from "playwright";
import { config } from "../config.js";
import type { RawPayload } from "../types.js";

let browserPromise: Promise<Browser> | null = null;
async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

export interface HtmlFetcherOptions {
  waitForSelector?: string;
  timeoutMs?: number;
  waitForNetworkIdle?: boolean;
}

export async function fetchHtml(
  url: string,
  sourceId: string,
  options: HtmlFetcherOptions = {},
): Promise<RawPayload> {
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    userAgent: config.userAgent,
    locale: "zh-CN",
    extraHTTPHeaders: { "accept-language": "zh-CN,zh;q=0.9" },
  });
  const page: Page = await ctx.newPage();
  try {
    await page.goto(url, {
      timeout: options.timeoutMs ?? config.requestTimeoutMs,
      waitUntil: options.waitForNetworkIdle ? "networkidle" : "domcontentloaded",
    });
    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: options.timeoutMs ?? 15_000 });
    } else {
      await page.waitForTimeout(1500);
    }
    const body = await page.content();
    return {
      url,
      fetchedAt: new Date().toISOString(),
      contentType: "html",
      body,
      sourceId,
    };
  } finally {
    await page.close();
    await ctx.close();
  }
}

export async function closeBrowser() {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}
