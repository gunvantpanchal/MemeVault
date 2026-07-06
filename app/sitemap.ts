import type { MetadataRoute } from "next";
import { posts } from "@/lib/blog";
import { getAllSoundSlugsForSitemap, getSoundCategoryCounts } from "@/lib/sounds";
import { getAllGifIdsForSitemap } from "@/lib/gifs";
import { CATEGORIES, categorySlug } from "@/lib/soundMeta";

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
    {
      url: `${BASE}/about`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/contact`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/privacy-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/terms-of-service`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const soundSlugs = await getAllSoundSlugsForSitemap();
  const soundRoutes: MetadataRoute.Sitemap = soundSlugs.map(({ slug, updatedAt }) => ({
    url: `${BASE}/sound/${slug}`,
    lastModified: updatedAt ?? now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const categoryCounts = await getSoundCategoryCounts();
  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES
    .filter((c) => c !== "All" && (categoryCounts[c] ?? 0) > 0)
    .map((c) => ({
      url: `${BASE}/category/${categorySlug(c)}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.75,
    }));

  const gifIds = await getAllGifIdsForSitemap();
  const gifRoutes: MetadataRoute.Sitemap = gifIds.map(({ id, updatedAt }) => ({
    url: `${BASE}/gifs/${id}`,
    lastModified: updatedAt ?? now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...blogRoutes, ...categoryRoutes, ...soundRoutes, ...gifRoutes];
}
