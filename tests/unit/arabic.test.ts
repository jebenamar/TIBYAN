import { describe, expect, it } from "vitest";
import { containsArabic, normalizeForSearch, splitBismillah, stripDiacritics, toAsciiDigits } from "@/lib/arabic";

describe("Arabic normalisation (search index only)", () => {
  it("removes harakat, tanwin, shadda and Quranic marks", () => {
    expect(stripDiacritics("بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ")).toBe("بسم ٱلله ٱلرحمن");
  });

  it("unifies alef / hamza / ya / ta marbuta variants", () => {
    expect(normalizeForSearch("أإآٱا")).toBe("ااااا");
    expect(normalizeForSearch("هدى")).toBe(normalizeForSearch("هدي"));
    expect(normalizeForSearch("رحمة")).toBe("رحمه");
    expect(normalizeForSearch("مؤمن")).toBe("مومن");
    expect(normalizeForSearch("شيئ")).toBe("شيي");
  });

  it("matches Uthmani text against a plain query", () => {
    const uthmani = normalizeForSearch("وَٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ");
    expect(uthmani).toContain(normalizeForSearch("بالصبر"));
  });

  it("is idempotent", () => {
    const s = "قُلْ هُوَ ٱللَّهُ أَحَدٌ — Al-Baqara ٢٥٥";
    expect(normalizeForSearch(normalizeForSearch(s))).toBe(normalizeForSearch(s));
  });

  it("converts Arabic-Indic and Persian digits", () => {
    expect(toAsciiDigits("٢:٢٥٥")).toBe("2:255");
    expect(toAsciiDigits("۱۸")).toBe("18");
  });

  it("normalises transliterations (case, accents, apostrophes, hyphens)", () => {
    expect(normalizeForSearch("Al-Mā'idah")).toBe("almaidah");
  });

  it("detects Arabic script", () => {
    expect(containsArabic("Al-Baqara")).toBe(false);
    expect(containsArabic("البقرة")).toBe(true);
  });
});

describe("Basmala presentation", () => {
  const v1 = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ الٓمٓ";

  it("splits the basmala off verse 1 without altering characters", () => {
    const r = splitBismillah(2, 1, v1);
    expect(r.bismillah).toBe("بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ");
    expect(r.text).toBe("الٓمٓ");
    expect(`${r.bismillah} ${r.text}`).toBe(v1);
  });

  it("leaves Al-Fatiha, At-Tawba and other verses untouched", () => {
    expect(splitBismillah(1, 1, "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ").bismillah).toBeNull();
    expect(splitBismillah(9, 1, "بَرَآءَةٌ").bismillah).toBeNull();
    expect(splitBismillah(2, 2, v1).bismillah).toBeNull();
  });
});
