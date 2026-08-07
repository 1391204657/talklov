import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const PUBLIC_PATHS: { path: string; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/discover", changeFrequency: "daily", priority: 0.9 },
  { path: "/guides/language-exchange", changeFrequency: "monthly", priority: 0.85 },
  { path: "/guides/flash-check", changeFrequency: "monthly", priority: 0.8 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.75 },
  { path: "/partners", changeFrequency: "monthly", priority: 0.7 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
