import { normalizeArabicLetters, normalizeForSearch, toAsciiDigits } from "./arabic";

const DIACRITIC = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ࣓-ࣿـ]/;

function normChar(c: string): string {
  if (DIACRITIC.test(c)) return "";
  let n = normalizeArabicLetters(toAsciiDigits(c));
  n = n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/['’`ʿʾ‘-]/.test(n)) return "";
  return /[\p{L}\p{N}]/u.test(n) ? n[0] : " ";
}

/**
 * Builds a normalised projection of `original` plus an index map, so matches
 * found in normalised space can be mapped back to exact ranges of the original
 * (diacritics included). The original text is never altered.
 */
function project(original: string) {
  let norm = "";
  const map: number[] = [];
  for (let i = 0; i < original.length; i++) {
    const n = normChar(original[i]);
    if (!n) continue;
    if (n === " " && (norm.length === 0 || norm.endsWith(" "))) continue;
    norm += n;
    map.push(i);
  }
  return { norm, map };
}

export type Range = [start: number, end: number];

export function queryTerms(q: string, exact = false): string[] {
  const n = normalizeForSearch(q);
  if (!n) return [];
  if (exact) return [n];
  return [...new Set(n.split(" ").filter((t) => t.length >= 2))].sort((a, b) => b.length - a.length);
}

export function findRanges(original: string, terms: string[], max = 200): Range[] {
  if (!terms.length) return [];
  const { norm, map } = project(original);
  const ranges: Range[] = [];
  for (const term of terms) {
    let from = 0;
    while (ranges.length < max) {
      const idx = norm.indexOf(term, from);
      if (idx === -1) break;
      const start = map[idx];
      let end = map[idx + term.length - 1] + 1;
      while (end < original.length && DIACRITIC.test(original[end])) end++; // keep trailing harakat
      ranges.push([start, end]);
      from = idx + term.length;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Range[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}

/** Window of text around the first match, snapped to word boundaries. */
export function snippet(text: string, terms: string[], radius = 150): { text: string; ranges: Range[]; prefix: boolean; suffix: boolean } {
  const all = findRanges(text, terms, 50);
  const anchor = all[0]?.[0] ?? 0;
  let start = Math.max(0, anchor - radius);
  let end = Math.min(text.length, anchor + radius * 2);
  if (start > 0) {
    const sp = text.indexOf(" ", start);
    if (sp !== -1 && sp < anchor) start = sp + 1;
  }
  if (end < text.length) {
    const sp = text.lastIndexOf(" ", end);
    if (sp > anchor) end = sp;
  }
  const slice = text.slice(start, end);
  const ranges = all
    .filter(([s, e]) => s >= start && e <= end)
    .map(([s, e]) => [s - start, e - start] as Range);
  return { text: slice, ranges, prefix: start > 0, suffix: end < text.length };
}
