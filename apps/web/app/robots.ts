import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const host = process.env.APP_BASE_URL ?? "http://175.178.213.71:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/models", "/models/new", "/providers", "/rankings", "/recommend", "/compare"],
        disallow: ["/admin", "/api/admin"],
      },
    ],
    sitemap: `${host}/sitemap.xml`,
  };
}
