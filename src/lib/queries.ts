import "server-only";
import { cache } from "react";
import { prisma } from "./db";
import { log } from "./log";

/** Small TTL memo for stable, low-cardinality data (shared across requests). */
function memo<T>(ttlMs: number, fn: () => Promise<T>): () => Promise<T> {
  let value: { at: number; data: Promise<T> } | null = null;
  return () => {
    if (!value || Date.now() - value.at > ttlMs) {
      const data = fn().catch((err) => {
        value = null;
        throw err;
      });
      value = { at: Date.now(), data };
    }
    return value.data;
  };
}

export type TafsirSourceRow = Awaited<ReturnType<typeof loadSources>>[number];

async function loadSources() {
  return prisma.tafsirSource.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true, slug: true, titleArabic: true, titleLatin: true, authorArabic: true, authorLatin: true,
      description: true, edition: true, publisher: true, sourceUrl: true, sourceName: true, license: true,
      licenseStatus: true, licenseNotes: true, version: true, entryCount: true, importedAt: true,
    },
  });
}

const sourcesMemo = memo(5 * 60_000, loadSources);
export const getSources = cache(async () => {
  try {
    return await sourcesMemo();
  } catch (err) {
    log.error("db.sources_failed", { err });
    throw err;
  }
});

/** Verses covered per source (ranges expanded) — for honest coverage figures. */
const coverageMemo = memo(10 * 60_000, async () => {
  const rows = await prisma.$queryRaw<Array<{ tafsirSourceId: number; covered: bigint }>>`
    SELECT "tafsirSourceId", SUM("ayahEnd" - "ayahStart" + 1) AS covered
    FROM "TafsirEntry" GROUP BY "tafsirSourceId"`;
  return new Map(rows.map((r) => [r.tafsirSourceId, Number(r.covered)]));
});
export const getCoverage = cache(() => coverageMemo());

export const getAyah = cache(async (surah: number, ayah: number) =>
  prisma.ayah.findUnique({
    where: { surahId_numberInSurah: { surahId: surah, numberInSurah: ayah } },
    select: { numberInSurah: true, textArabic: true, textSimple: true, globalNumber: true },
  }),
);

export const getSurahAyahs = cache(async (surah: number) =>
  prisma.ayah.findMany({
    where: { surahId: surah },
    orderBy: { numberInSurah: "asc" },
    select: { numberInSurah: true, textArabic: true },
  }),
);

/** For one verse: which sources have an explanation covering it, and the covered range. */
export const getAvailability = cache(async (surah: number, ayah: number) => {
  const rows = await prisma.tafsirEntry.findMany({
    where: { surahId: surah, ayahStart: { lte: ayah }, ayahEnd: { gte: ayah } },
    select: { tafsirSourceId: true, ayahStart: true, ayahEnd: true },
  });
  return new Map(rows.map((r) => [r.tafsirSourceId, { ayahStart: r.ayahStart, ayahEnd: r.ayahEnd }]));
});

export const getEntry = cache(async (sourceId: number, surah: number, ayah: number) =>
  prisma.tafsirEntry.findFirst({
    where: { tafsirSourceId: sourceId, surahId: surah, ayahStart: { lte: ayah }, ayahEnd: { gte: ayah } },
    select: { ayahStart: true, ayahEnd: true, contentHtml: true, contentArabic: true, reference: true },
  }),
);

/** Quran text for a verse range (used when an explanation spans several verses). */
export const getAyahRange = cache(async (surah: number, from: number, to: number) =>
  prisma.ayah.findMany({
    where: { surahId: surah, numberInSurah: { gte: from, lte: to } },
    orderBy: { numberInSurah: "asc" },
    select: { numberInSurah: true, textArabic: true },
  }),
);
