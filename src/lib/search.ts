import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { normalizeForSearch } from "./arabic";
import { prisma } from "./db";
import { queryTerms, snippet, type Range } from "./highlight";
import { log } from "./log";

export const searchParamsSchema = z.object({
  q: z.string().trim().min(1).max(200),
  scope: z.enum(["all", "quran", "tafsir"]).catch("all"),
  exact: z.preprocess((v) => v === "1" || v === "true" || v === true, z.boolean()).catch(false),
  surah: z.coerce.number().int().min(1).max(114).optional().catch(undefined),
  source: z.string().regex(/^[a-z0-9-]{1,40}$/).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).catch(1),
});
export type SearchParams = z.infer<typeof searchParamsSchema>;

export interface QuranHit {
  surah: number;
  ayah: number;
  text: string;
  ranges: Range[];
}

export interface TafsirHit {
  source: string;
  surah: number;
  ayahStart: number;
  ayahEnd: number;
  snippet: string;
  ranges: Range[];
  prefix: boolean;
  suffix: boolean;
}

/** Escapes LIKE wildcards in an already-normalised string. */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

export async function searchQuran(p: { q: string; exact: boolean; surah?: number; limit: number; offset: number }) {
  const norm = normalizeForSearch(p.q);
  if (!norm) return { hits: [] as QuranHit[], hasMore: false };
  const surahFilter = p.surah ? Prisma.sql`AND a."surahId" = ${p.surah}` : Prisma.empty;
  const word = `% ${likeEscape(norm)} %`;
  const sub = `%${likeEscape(norm)}%`;
  const condition = p.exact
    ? Prisma.sql`(' ' || a."searchText" || ' ') LIKE ${word}`
    : Prisma.sql`(a.tsv @@ websearch_to_tsquery('arabic', ${norm}) OR a."searchText" LIKE ${sub})`;

  const rows = await prisma.$queryRaw<Array<{ surahId: number; numberInSurah: number; textArabic: string; textSimple: string }>>`
    SELECT a."surahId", a."numberInSurah", a."textArabic", a."textSimple"
    FROM "Ayah" a
    WHERE ${condition} ${surahFilter}
    ORDER BY
      ((' ' || a."searchText" || ' ') LIKE ${word}) DESC,
      ts_rank(a.tsv, websearch_to_tsquery('arabic', ${norm})) DESC,
      a."globalNumber" ASC
    LIMIT ${p.limit + 1} OFFSET ${p.offset}`;

  const terms = queryTerms(p.q, p.exact);
  const hits = rows.slice(0, p.limit).map((r) => {
    // Highlight on the Uthmani text when the projection finds the term; otherwise fall back to simple text.
    const text = r.textArabic;
    const ranges = (() => {
      const { ranges } = snippet(text, terms, 100_000);
      return ranges;
    })();
    return ranges.length
      ? { surah: r.surahId, ayah: r.numberInSurah, text, ranges }
      : { surah: r.surahId, ayah: r.numberInSurah, text: r.textSimple, ranges: snippet(r.textSimple, terms, 100_000).ranges };
  });
  return { hits, hasMore: rows.length > p.limit };
}

export async function searchTafsir(p: { q: string; exact: boolean; surah?: number; source?: string; limit: number; offset: number }) {
  const norm = normalizeForSearch(p.q);
  if (!norm) return { hits: [] as TafsirHit[], hasMore: false };
  const filters = [
    p.surah ? Prisma.sql`AND e."surahId" = ${p.surah}` : Prisma.empty,
    p.source ? Prisma.sql`AND s.slug = ${p.source}` : Prisma.empty,
  ];
  const tsq = p.exact
    ? Prisma.sql`phraseto_tsquery('arabic', ${norm})`
    : Prisma.sql`websearch_to_tsquery('arabic', ${norm})`;
  const exactFilter = p.exact
    ? Prisma.sql`AND (' ' || e."searchText" || ' ') LIKE ${`% ${likeEscape(norm)} %`}`
    : Prisma.empty;

  // Candidates are capped before ranking so very common words stay fast.
  const rows = await prisma.$queryRaw<Array<{ id: number; slug: string; surahId: number; ayahStart: number; ayahEnd: number; contentArabic: string }>>`
    WITH q AS (SELECT ${tsq} AS query),
    candidates AS (
      SELECT e.id, e."tafsirSourceId", e."surahId", e."ayahStart", e.tsv, s.slug, s."sortOrder"
      FROM "TafsirEntry" e
      JOIN "TafsirSource" s ON s.id = e."tafsirSourceId", q
      WHERE e.tsv @@ q.query ${filters[0]} ${filters[1]} ${exactFilter}
      LIMIT 1500
    ),
    ranked AS (
      SELECT c.id, c.slug, c."sortOrder", c."surahId", c."ayahStart",
             ts_rank_cd(c.tsv, q.query, 32) AS rank
      FROM candidates c, q
      ORDER BY rank DESC, c."sortOrder", c."surahId", c."ayahStart"
      LIMIT ${p.limit + 1} OFFSET ${p.offset}
    )
    SELECT r.id, r.slug, e."surahId", e."ayahStart", e."ayahEnd", e."contentArabic"
    FROM ranked r JOIN "TafsirEntry" e ON e.id = r.id
    ORDER BY r.rank DESC, r."sortOrder", r."surahId", r."ayahStart"`;

  const terms = queryTerms(p.q, p.exact);
  const hits: TafsirHit[] = rows.slice(0, p.limit).map((r) => {
    const s = snippet(r.contentArabic, terms);
    return { source: r.slug, surah: r.surahId, ayahStart: r.ayahStart, ayahEnd: r.ayahEnd, snippet: s.text, ranges: s.ranges, prefix: s.prefix, suffix: s.suffix };
  });
  return { hits, hasMore: rows.length > p.limit };
}

export async function timed<T>(event: string, meta: Record<string, unknown>, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    const ms = Math.round(performance.now() - t0);
    if (ms > 400) log.warn(event, { ...meta, ms });
    else log.debug(event, { ...meta, ms });
  }
}
