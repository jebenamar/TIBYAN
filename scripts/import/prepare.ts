import { createHash } from "node:crypto";
import { normalizeForSearch } from "../../src/lib/arabic";
import { htmlToText, sanitizeTafsirHtml } from "../../src/lib/sanitize";
import { getSurah } from "../../src/lib/surahs";

/** Pure, DB-free preparation & validation of imported entries (unit-tested). */

/** What an adapter yields: raw (unsanitised) HTML or plain text for a verse or verse range. */
export interface RawEntry {
  surah: number;
  ayahStart: number;
  ayahEnd: number;
  html?: string;
  text?: string;
  reference?: string;
}

export interface Issue {
  level: "error" | "warning";
  surah: number;
  ayah?: number;
  code: string;
  message: string;
}

export interface Adapter {
  name: string;
  /** Returns entries for one surah. Must never invent content. */
  fetchSurah(surah: number): Promise<{ entries: RawEntry[]; issues: Issue[] }>;
}

export interface PreparedEntry {
  surahId: number;
  ayahStart: number;
  ayahEnd: number;
  contentHtml: string;
  contentArabic: string;
  searchText: string;
  reference: string | null;
  checksum: string;
}

export const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

/**
 * Sanitises, merges consecutive identical explanations into one ranged entry
 * (providers often repeat a grouped commentary on every verse), and validates.
 */
export function prepareSurah(surah: number, raw: RawEntry[]): { entries: PreparedEntry[]; issues: Issue[] } {
  const meta = getSurah(surah);
  if (!meta) throw new Error(`Invalid surah ${surah}`);
  const issues: Issue[] = [];
  const sorted = [...raw].sort((a, b) => a.ayahStart - b.ayahStart);
  const out: PreparedEntry[] = [];

  for (const r of sorted) {
    if (r.surah !== surah) {
      issues.push({ level: "error", surah, ayah: r.ayahStart, code: "wrong-surah", message: `Entry for surah ${r.surah} in surah ${surah} batch` });
      continue;
    }
    if (r.ayahStart < 1 || r.ayahEnd < r.ayahStart || r.ayahEnd > meta.versesCount) {
      issues.push({ level: "error", surah, ayah: r.ayahStart, code: "out-of-range", message: `Range ${r.ayahStart}-${r.ayahEnd} outside 1-${meta.versesCount}` });
      continue;
    }
    const html = r.html !== undefined ? sanitizeTafsirHtml(r.html) : textToSafeHtml(r.text ?? "");
    const text = htmlToText(html);
    if (!text.trim()) {
      issues.push({ level: "warning", surah, ayah: r.ayahStart, code: "empty", message: "Empty explanation skipped (reported as missing)" });
      continue;
    }
    const checksum = sha256(text);
    const prev = out[out.length - 1];
    if (prev && prev.checksum === checksum && prev.ayahEnd + 1 === r.ayahStart) {
      prev.ayahEnd = r.ayahEnd; // same commentary repeated on the next verse → one ranged entry
      continue;
    }
    if (prev && r.ayahStart <= prev.ayahEnd) {
      issues.push({ level: "error", surah, ayah: r.ayahStart, code: "overlap", message: `Overlaps previous range ${prev.ayahStart}-${prev.ayahEnd}` });
      continue;
    }
    out.push({
      surahId: surah,
      ayahStart: r.ayahStart,
      ayahEnd: r.ayahEnd,
      contentHtml: html,
      contentArabic: text,
      searchText: normalizeForSearch(text),
      reference: r.reference ?? null,
      checksum,
    });
  }

  // Coverage: every verse should be covered; gaps are reported, never filled.
  const covered = new Set<number>();
  for (const e of out) for (let a = e.ayahStart; a <= e.ayahEnd; a++) covered.add(a);
  const missing: number[] = [];
  for (let a = 1; a <= meta.versesCount; a++) if (!covered.has(a)) missing.push(a);
  if (missing.length) {
    issues.push({ level: "warning", surah, code: "missing-verses", message: `No explanation for verses: ${missing.join(", ")}` });
  }

  // Heuristic truncation signal: text beginning with punctuation.
  for (const e of out) {
    if (/^[؟?.,،:؛)\]»]/.test(e.contentArabic)) {
      issues.push({ level: "warning", surah, ayah: e.ayahStart, code: "suspect-start", message: "Explanation starts with punctuation (possible truncation at source)" });
    }
  }
  return { entries: out, issues };
}

function textToSafeHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return text
    .split(/\r?\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("");
}
