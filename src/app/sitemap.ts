import type { MetadataRoute } from "next";
import { SURAHS } from "@/lib/surahs";

/** Home, sources and the 114 surah pages. Verse pages are reachable from them. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/sources`, changeFrequency: "monthly", priority: 0.5 },
    ...SURAHS.map((s) => ({ url: `${base}/sourate/${s.number}`, changeFrequency: "yearly" as const, priority: 0.8 })),
  ];
}
