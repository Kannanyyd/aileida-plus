const DEFAULT_URL =
  process.env.HOMEPAGE_RENDER_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.SITE_URL ??
  process.env.APP_BASE_URL ??
  "https://skillstop.online";

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function extractSection(html: string, section: string) {
  const start = html.indexOf(`data-home-section="${section}"`);
  if (start < 0) return "";
  const next = html.indexOf("data-home-section=", start + 1);
  return html.slice(start, next > start ? next : html.length);
}

function countCards(html: string, card: string) {
  return (html.match(new RegExp(`data-home-card="${card}"`, "g")) ?? []).length;
}

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fail(message: string, details?: unknown): never {
  console.error(JSON.stringify({ ok: false, message, details }, null, 2));
  process.exit(1);
}

async function fetchText(url: string) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) fail(`Fetch failed: ${url}`, { status: res.status });
  return res.text();
}

async function main() {
  const baseUrl = normalizeBaseUrl(DEFAULT_URL);
  const html = await fetchText(`${baseUrl}/`);
  const robots = await fetchText(`${baseUrl}/robots.txt`);
  const sitemap = await fetchText(`${baseUrl}/sitemap.xml`);

  const officialSection = extractSection(html, "official-current");
  const domesticSection = extractSection(html, "domestic-ranking");
  const latestSection = extractSection(html, "latest-models");
  const promotionsSection = extractSection(html, "promotions");

  const officialCount = countCards(officialSection, "official-model");
  const domesticCount = countCards(domesticSection, "domestic-model");
  const latestCount = countCards(latestSection, "latest-model");
  const promotionCount = countCards(promotionsSection, "promotion");
  const hasTop8Title = /官方当前主力\s*Top\s*8/i.test(stripTags(officialSection));

  const latestProviders = Array.from(latestSection.matchAll(/data-home-provider="([^"]+)"/g))
    .map((match) => match[1]?.trim())
    .filter(Boolean);
  const providerCounts = latestProviders.reduce<Record<string, number>>((acc, provider) => {
    acc[provider] = (acc[provider] ?? 0) + 1;
    return acc;
  }, {});

  const promotionText = stripTags(promotionsSection);
  const badUrlPattern = /175\.178\.213\.71|localhost|127\.0\.0\.1|:3000/;
  const crawlerTextPattern = /(首页|文档|价格|登录|注册|控制台|产品|解决方案|联系我们|English|Console|Docs|Pricing)(?:\s+\S+){0,2}\s+(首页|文档|价格|登录|注册|控制台|产品|解决方案|联系我们|English|Console|Docs|Pricing)/i;

  const errors: string[] = [];
  if (hasTop8Title && officialCount < 6) errors.push(`official-current title says Top8 but only rendered ${officialCount}`);
  if (!hasTop8Title && officialCount < 6) errors.push(`official-current rendered ${officialCount}, expected at least 6`);
  if (domesticCount < 4) errors.push(`domestic ranking rendered ${domesticCount}, expected at least 4`);
  if (latestCount < 3) errors.push(`latest model discovery rendered ${latestCount}, expected at least 3`);
  for (const [provider, count] of Object.entries(providerCounts)) {
    if (count > 2) errors.push(`latest model discovery provider ${provider} appears ${count} times`);
  }
  if (/>\s*unknown\s*</i.test(latestSection) || /\s\/\s*unknown\s*\//i.test(stripTags(latestSection))) {
    errors.push("latest model discovery exposes unknown as a primary label");
  }
  if (promotionText.length > 1600 || crawlerTextPattern.test(promotionText)) {
    errors.push("promotions section appears to contain crawler/navigation text");
  }
  if (badUrlPattern.test(html) || badUrlPattern.test(sitemap) || badUrlPattern.test(robots)) {
    errors.push("homepage/robots/sitemap contains IP, localhost, 127.0.0.1, or :3000");
  }
  if (!robots.includes("Sitemap: https://skillstop.online/sitemap.xml")) {
    errors.push("robots.txt does not point to https://skillstop.online/sitemap.xml");
  }
  if (!sitemap.includes("<loc>https://skillstop.online/") || badUrlPattern.test(sitemap)) {
    errors.push("sitemap.xml does not use canonical https://skillstop.online URLs");
  }

  const report = {
    ok: errors.length === 0,
    url: baseUrl,
    counts: {
      officialCurrent: officialCount,
      domesticRanking: domesticCount,
      latestModels: latestCount,
      promotions: promotionCount,
    },
    latestProviderCounts: providerCounts,
    hasTop8Title,
    robotsSitemapOk: robots.includes("Sitemap: https://skillstop.online/sitemap.xml"),
    sitemapCanonicalOk: sitemap.includes("<loc>https://skillstop.online/") && !badUrlPattern.test(sitemap),
    errors,
  };
  console.log(JSON.stringify(report, null, 2));
  if (errors.length > 0) process.exit(1);
}

main().catch((error) => fail("homepage render audit crashed", error instanceof Error ? error.message : String(error)));
