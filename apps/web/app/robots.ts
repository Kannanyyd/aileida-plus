import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const host = getSiteUrl();
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
