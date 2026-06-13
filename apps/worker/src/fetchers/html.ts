/**
 * 通用 HTML 抓取器：HTTP fetch + 可选 Playwright 渲染
 * 如果 Playwright/Chromium 不可用，自动降级为 HTTP fetch
 */
import { config } from "../config.js";
import type { RawPayload } from "../types.js";

let playwrightAvailable = false;
let browserPromise: any = null;

async function initPlaywright(): Promise<boolean> {
  if (playwrightAvailable) return true;
  try {
    // 检查系统 Chromium 是否可用
    const chromPath = process.env.CHROMIUM_PATH ?? "/usr/bin/chromium";
    const { chromium } = await import("playwright");
    const { access } = await import("node:fs/promises");
    await access(chromPath);
    browserPromise = chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
      executablePath: chromPath,
    });
    playwrightAvailable = true;
    console.log(`[html] Playwright ready: ${chromPath}`);
    return true;
  } catch {
    console.log("[html] Playwright/Chromium 不可用，使用 HTTP fetch 降级");
    return false;
  }
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
  // 尝试 Playwright
  const hasPw = await initPlaywright();
  if (hasPw && browserPromise) {
    try {
      const browser = await browserPromise;
      const ctx = await browser.newContext({
        userAgent: config.userAgent,
        locale: "zh-CN",
        extraHTTPHeaders: { "accept-language": "zh-CN,zh;q=0.9" },
      });
      const page = await ctx.newPage();
      try {
        await page.goto(url, {
          timeout: options.timeoutMs ?? 25000,
          waitUntil: options.waitForNetworkIdle ? "networkidle" : "domcontentloaded",
        });
        if (options.waitForSelector) {
          await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
        } else {
          await page.waitForTimeout(2000);
        }
        const body = await page.content();
        return { url, fetchedAt: new Date().toISOString(), contentType: "html", body, sourceId };
      } finally {
        await page.close();
        await ctx.close();
      }
    } catch (err: any) {
      console.log(`[html] Playwright 失败: ${err?.message?.slice(0, 80)}，降级 HTTP`);
    }
  }

  // HTTP fallback
  const { fetchText } = await import("./http.js");
  return fetchText(url, sourceId);
}

export async function closeBrowser() {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      await b.close();
    } catch { /* ignore */ }
    browserPromise = null;
  }
}
