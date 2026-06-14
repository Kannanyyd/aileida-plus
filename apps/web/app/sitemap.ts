import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const host = process.env.APP_BASE_URL ?? "http://175.178.213.71:3000";
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
