import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { log } from "@/lib/log";
import { getSources } from "@/lib/queries";

const params = z.object({ source: z.string().regex(/^[a-z0-9-]{1,40}$/), surah: z.coerce.number().int().min(1).max(114) });

/**
 * Offline bundle for one (tafsir, surah): Quran text of the surah (Tanzil, verbatim)
 * + every explanation of that source for the surah. Versioned for update detection.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ source: string; surah: string }> }) {
  const parsed = params.safeParse(await ctx.params);
  if (!parsed.success) return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  const { source: slug, surah } = parsed.data;
  try {
    const source = (await getSources()).find((s) => s.slug === slug);
    if (!source) return NextResponse.json({ error: "unknown_source" }, { status: 404 });
    const etag = `"${source.version}-${source.importedAt?.getTime() ?? 0}-${surah}"`;
    if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304 });

    const [ayahs, entries] = await Promise.all([
      prisma.ayah.findMany({ where: { surahId: surah }, orderBy: { numberInSurah: "asc" }, select: { numberInSurah: true, textArabic: true, textSimple: true } }),
      prisma.tafsirEntry.findMany({
        where: { tafsirSourceId: source.id, surahId: surah },
        orderBy: { ayahStart: "asc" },
        select: { ayahStart: true, ayahEnd: true, contentHtml: true, contentArabic: true },
      }),
    ]);
    const body = {
      format: 1,
      source: {
        slug: source.slug, titleArabic: source.titleArabic, authorArabic: source.authorArabic, sourceName: source.sourceName,
        sourceUrl: source.sourceUrl, license: source.license, licenseStatus: source.licenseStatus, version: source.version,
        importedAt: source.importedAt?.toISOString() ?? null,
      },
      surah,
      quranAttribution: "Tanzil Quran Text — Copyright (C) 2007-2026 Tanzil Project — CC BY 3.0 — https://tanzil.net",
      ayahs: ayahs.map((a) => [a.numberInSurah, a.textArabic, a.textSimple] as const),
      entries: entries.map((e) => [e.ayahStart, e.ayahEnd, e.contentHtml, e.contentArabic] as const),
    };
    return NextResponse.json(body, { headers: { ETag: etag, "Cache-Control": "public, max-age=3600" } });
  } catch (err) {
    log.error("offline.bundle_failed", { slug, surah, err });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
