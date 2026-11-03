import { toAsciiDigits } from "./arabic";
import { findSurahByName, getSurah, type SurahMeta } from "./surahs";

export type ParsedReference =
  | { kind: "ayah"; surah: SurahMeta; ayah: number }
  | { kind: "surah"; surah: SurahMeta }
  | { kind: "invalid-ayah"; surah: SurahMeta; ayah: number };

/**
 * Parses a direct verse reference. Accepted forms (Arabic or ASCII digits):
 *   "2:255"  "2 255"  "2/255"  "2.255"  "٢:٢٥٥"
 *   "الفاتحة 5"  "البقرة:255"  "al-baqara 255"  "baqarah"  "2"
 * Returns null when the input is not a reference (→ fall back to text search).
 */
export function parseReference(input: string): ParsedReference | null {
  const raw = toAsciiDigits(input).trim().replace(/[،،]/g, " ");
  if (!raw) return null;

  // Numeric: "2:255", "2 255", "2"
  const num = raw.match(/^(\d{1,3})(?:\s*[:/.\-\s]\s*(\d{1,3}))?$/);
  if (num) {
    const surah = getSurah(Number(num[1]));
    if (!surah) return null;
    if (num[2] === undefined) return { kind: "surah", surah };
    return withAyah(surah, Number(num[2]));
  }

  // Name + optional number: "البقرة 255", "al-baqara:255", "سورة الكهف ١٠"
  const named = raw.match(/^(.+?)\s*[:\s]\s*(\d{1,3})$/);
  if (named) {
    const surah = findSurahByName(named[1]);
    if (surah) return withAyah(surah, Number(named[2]));
  }
  const surah = findSurahByName(raw);
  if (surah) return { kind: "surah", surah };
  return null;
}

function withAyah(surah: SurahMeta, ayah: number): ParsedReference {
  if (ayah < 1 || ayah > surah.versesCount) return { kind: "invalid-ayah", surah, ayah };
  return { kind: "ayah", surah, ayah };
}

export function tafsirHref(surah: number, ayah: number, source?: string | null): string {
  return `/tafsir/${surah}/${ayah}${source ? `?source=${encodeURIComponent(source)}` : ""}`;
}

export function compareHref(surah: number, ayah: number, sources: string[]): string {
  return `/comparer/${surah}/${ayah}${sources.length ? `?sources=${sources.map(encodeURIComponent).join(",")}` : ""}`;
}
