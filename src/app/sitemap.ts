import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();
  const routes: Array<MetadataRoute.Sitemap[0]> = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/admin`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/teacher`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/student`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/parent`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];
  return routes;
}
