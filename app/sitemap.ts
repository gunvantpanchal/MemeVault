import type { MetadataRoute } from "next";
import { posts } from "@/lib/blog";
import { getAllSoundIdsForSitemap } from "@/lib/sounds";
import { getAllGifIdsForSitemap } from "@/lib/gifs";

const BASE = "https://mememusic.fun";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE}/upload`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE}/gifs`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE}/gifs/upload`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const soundIds = await getAllSoundIdsForSitemap();
  const soundRoutes: MetadataRoute.Sitemap = soundIds.map(({ id, updatedAt }) => ({
    url: `${BASE}/sound/${id}`,
    lastModified: updatedAt ?? now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const gifIds = await getAllGifIdsForSitemap();
  const gifRoutes: MetadataRoute.Sitemap = gifIds.map(({ id, updatedAt }) => ({
    url: `${BASE}/gifs/${id}`,
    lastModified: updatedAt ?? now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...blogRoutes, ...soundRoutes, ...gifRoutes];
}
