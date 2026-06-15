/**
 * Unified site URL for SEO metadata, sitemap, robots, OpenGraph, canonical.
 * Priority:
 *   1. NEXT_PUBLIC_SITE_URL (client-safe)
 *   2. SITE_URL
 *   3. APP_BASE_URL
 *   4. Production default: https://skillstop.online
 *   5. Development default: http://localhost:3000
 */
export function getSiteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.APP_BASE_URL ??
    (process.env.NODE_ENV === "production"
      ? "https://skillstop.online"
      : "http://localhost:3000");

  return url.replace(/\/+$/, "");
}
