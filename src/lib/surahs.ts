import data from "@/data/surahs.json";
import { normalizeForSearch } from "./arabic";

export type UiLocale = "ar" | "fr" | "en" | "es";

export interface SurahMeta {
  number: number;
  nameArabic: string;
  nameTransliterated: string;
  aliases: string[];
  names: { en: string; fr: string; es: string };
  versesCount: number;
  firstGlobalAyah: number;
  revelationPlace: "makkah" | "madinah";
}

export const SURAHS = data as SurahMeta[];
export const TOTAL_AYAHS = 6236;

export function getSurah(n: number): SurahMeta | undefined {
  return Number.isInteger(n) && n >= 1 && n <= 114 ? SURAHS[n - 1] : undefined;
}

export function isValidAyah(surah: number, ayah: number): boolean {
  const s = getSurah(surah);
  return !!s && Number.isInteger(ayah) && ayah >= 1 && ayah <= s.versesCount;
}

/** Localised secondary name for a surah (Arabic UI shows the transliteration). */
export function surahDisplayName(s: SurahMeta, locale: UiLocale): string {
  return locale === "ar" ? s.nameTransliterated : s.names[locale];
}

/** Removes the Arabic definite article and transliteration prefixes for looser matching. */
function stripArticle(normalized: string): string {
  return normalized
    .replace(/^(سوره|سورة)\s+/, "")
    .replace(/^ال(?=\S{2,})/, "")
    .replace(/^(al|an|ar|as|at|ad|adh|az|ash|aal|ul)\s?(?=\S{2,})/, "")
    .replace(/\s+/g, "");
}

interface IndexedSurah {
  meta: SurahMeta;
  keys: string[];
}

const INDEX: IndexedSurah[] = SURAHS.map((meta) => {
  const names = [meta.nameArabic, meta.nameTransliterated, ...meta.aliases, meta.names.en, meta.names.fr, meta.names.es];
  const keys = new Set<string>();
  for (const n of names) {
    const norm = normalizeForSearch(n);
    keys.add(norm.replace(/\s+/g, ""));
    keys.add(stripArticle(norm));
  }
  return { meta, keys: [...keys].filter(Boolean) };
});

/**
 * Ranks surahs for a free-text query (Arabic, transliteration, translated name or number).
 * Scores: exact > prefix > substring.
 */
export function matchSurahs(query: string, limit = 8): SurahMeta[] {
  const q = normalizeForSearch(query);
  if (!q) return [];
  if (/^\d{1,3}$/.test(q)) {
    const s = getSurah(Number(q));
    return s ? [s] : [];
  }
  const compact = q.replace(/\s+/g, "");
  const bare = stripArticle(q);
  const scored: Array<{ meta: SurahMeta; score: number }> = [];
  for (const { meta, keys } of INDEX) {
    let best = 0;
    for (const k of keys) {
      if (k === compact || k === bare) best = Math.max(best, 100);
      else if (k.startsWith(compact) || (bare.length >= 2 && k.startsWith(bare))) best = Math.max(best, 70);
      else if (compact.length >= 3 && k.includes(compact)) best = Math.max(best, 40);
      else if (bare.length >= 3 && k.includes(bare)) best = Math.max(best, 30);
    }
    if (best > 0) scored.push({ meta, score: best - meta.number / 1000 });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.meta);
}

/** Exact (best) surah match for a name, or undefined. */
export function findSurahByName(query: string): SurahMeta | undefined {
  const q = normalizeForSearch(query);
  const compact = q.replace(/\s+/g, "");
  const bare = stripArticle(q);
  return INDEX.find(({ keys }) => keys.includes(compact) || keys.includes(bare))?.meta;
}
