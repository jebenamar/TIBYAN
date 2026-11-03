/**
 * Arabic text normalisation for SEARCH ONLY.
 * Normalised strings are derived indexes — they are never displayed
 * in place of the original Quran or Tafsir text.
 */

// Harakat, tanwin, shadda, sukun, superscript alef, Quranic annotation marks.
const DIACRITICS =
  /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ࣓-ࣿ]/g;
const TATWEEL = /ـ/g;
const ALEF_VARIANTS = /[آأإٱٲٳٵ]/g; // آ أ إ ٱ …
const ARABIC_INDIC_DIGITS = /[٠-٩]/g;
const PERSIAN_DIGITS = /[۰-۹]/g;

/** Converts ٠-٩ / ۰-۹ to ASCII digits. */
export function toAsciiDigits(input: string): string {
  return input
    .replace(ARABIC_INDIC_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(PERSIAN_DIGITS, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Removes harakat and Quranic marks, keeps letters. */
export function stripDiacritics(input: string): string {
  return input.replace(DIACRITICS, "").replace(TATWEEL, "");
}

/**
 * Normalises Arabic letters with common orthographic variants:
 * alef forms → ا, ى → ي, ة → ه, ؤ → و, ئ → ي, Persian kaf/yeh → Arabic.
 */
export function normalizeArabicLetters(input: string): string {
  return input
    .replace(ALEF_VARIANTS, "ا")
    .replace(/ى/g, "ي") // ى → ي
    .replace(/ة/g, "ه") // ة → ه
    .replace(/ؤ/g, "و") // ؤ → و
    .replace(/ئ/g, "ي") // ئ → ي
    .replace(/ی/g, "ي") // ی → ي
    .replace(/ک/g, "ك"); // ک → ك
}

/** Latin: lowercase, strip accents and transliteration punctuation. */
function normalizeLatin(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`ʿʾ‘-]/g, "");
}

/**
 * Full normalisation used both at index time and query time.
 * Idempotent: normalize(normalize(x)) === normalize(x).
 */
export function normalizeForSearch(input: string): string {
  const s = normalizeLatin(normalizeArabicLetters(stripDiacritics(toAsciiDigits(input))));
  return s
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function containsArabic(input: string): boolean {
  return /[؀-ۿ]/.test(input);
}

/** Bismillah as it appears at the start of verse 1 in Tanzil Uthmani text. */
export const BISMILLAH_UTHMANI = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ";
export const BISMILLAH_SIMPLE = "بسم الله الرحمن الرحيم";

/**
 * Presentation helper: Tanzil includes the basmala in verse 1 of every surah
 * except 1 (where it IS verse 1) and 9 (no basmala). We display it as a header
 * line — the characters are unchanged, only laid out separately.
 */
export function splitBismillah(
  surah: number,
  ayah: number,
  text: string,
): { bismillah: string | null; text: string } {
  if (ayah !== 1 || surah === 1 || surah === 9) return { bismillah: null, text };
  for (const b of [BISMILLAH_UTHMANI, BISMILLAH_SIMPLE]) {
    if (text.startsWith(b + " ")) return { bismillah: b, text: text.slice(b.length + 1) };
  }
  return { bismillah: null, text };
}
