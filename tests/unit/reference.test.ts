import { describe, expect, it } from "vitest";
import { compareHref, parseReference, tafsirHref } from "@/lib/reference";
import { getSurah, isValidAyah, matchSurahs, SURAHS, TOTAL_AYAHS } from "@/lib/surahs";

const ayah = (input: string) => {
  const r = parseReference(input);
  return r?.kind === "ayah" ? `${r.surah.number}:${r.ayah}` : (r?.kind ?? null);
};

describe("Verse reference parser", () => {
  it.each([
    ["2:255", "2:255"],
    ["18:10", "18:10"],
    ["2 255", "2:255"],
    ["2/255", "2:255"],
    ["٢:٢٥٥", "2:255"],
    ["الفاتحة 5", "1:5"],
    ["الفاتحة ٥", "1:5"],
    ["البقرة:255", "2:255"],
    ["سورة الكهف ١٠", "18:10"],
    ["al-baqara 255", "2:255"],
    ["Al-Kahf 10", "18:10"],
  ])("%s → %s", (input, expected) => expect(ayah(input)).toBe(expected));

  it("returns a surah reference for a bare name or number", () => {
    expect(parseReference("البقرة")).toMatchObject({ kind: "surah", surah: { number: 2 } });
    expect(parseReference("36")).toMatchObject({ kind: "surah", surah: { number: 36 } });
    expect(parseReference("Yasin")).toMatchObject({ kind: "surah", surah: { number: 36 } });
  });

  it("flags verse numbers beyond the real length of the surah", () => {
    expect(parseReference("1:8")).toMatchObject({ kind: "invalid-ayah", surah: { number: 1 } });
    expect(parseReference("2:287")).toMatchObject({ kind: "invalid-ayah" });
    expect(parseReference("108:4")).toMatchObject({ kind: "invalid-ayah" });
  });

  it("rejects non-references (falls back to text search)", () => {
    expect(parseReference("115:1")).toBeNull();
    expect(parseReference("0:1")).toBeNull();
    expect(parseReference("الصبر")).toBeNull();
    expect(parseReference("")).toBeNull();
  });

  it("builds shareable URLs", () => {
    expect(tafsirHref(2, 255, "ibn-kathir")).toBe("/tafsir/2/255?source=ibn-kathir");
    expect(compareHref(2, 255, ["saadi", "ibn-kathir"])).toBe("/comparer/2/255?sources=saadi,ibn-kathir");
  });
});

describe("Surah reference data", () => {
  it("has 114 surahs and 6236 verses", () => {
    expect(SURAHS).toHaveLength(114);
    expect(SURAHS.reduce((s, x) => s + x.versesCount, 0)).toBe(TOTAL_AYAHS);
  });

  it("validates verse bounds", () => {
    expect(isValidAyah(2, 286)).toBe(true);
    expect(isValidAyah(2, 287)).toBe(false);
    expect(isValidAyah(115, 1)).toBe(false);
    expect(getSurah(0)).toBeUndefined();
  });

  it.each([
    ["البقرة", 2],
    ["بقره", 2],
    ["baqara", 2],
    ["La vache", 2],
    ["The Cow", 2],
    ["الكهف", 18],
    ["kahf", 18],
    ["يس", 36],
    ["114", 114],
  ])("matchSurahs(%s) ranks surah %i first", (q, n) => expect(matchSurahs(q)[0]?.number).toBe(n));
});
