import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const host = getSiteUrl();
  const now = new Date();
  const paths = [
    "/",
    "/models",
    "/models/new",
    "/providers",
    "/rankings",
    "/rankings/domestic",
    "/rankings/frontier-value",
    "/recommend",
    "/compare",
  ];

  return paths.map((path) => ({
    url: `${host}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
