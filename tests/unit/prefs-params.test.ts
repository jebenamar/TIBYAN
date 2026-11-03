import { describe, expect, it } from "vitest";
import { dirOf } from "@/i18n/dictionaries";
import { adjacentVerses, parseSourceList, parseVerseParams } from "@/lib/params";
import { DEFAULT_PREFS, parsePrefs, serializePrefs } from "@/lib/prefs";

describe("Preferences cookie", () => {
  it("round-trips", () => {
    const p = { ...DEFAULT_PREFS, locale: "fr" as const, theme: "dark" as const, scale: 1.3 };
    expect(parsePrefs(serializePrefs(p))).toEqual(p);
  });

  it("falls back field-by-field on invalid input", () => {
    expect(parsePrefs(encodeURIComponent(JSON.stringify({ locale: "xx", scale: 99, theme: "dark" })))).toMatchObject({ locale: "ar", scale: 1, theme: "dark" });
    expect(parsePrefs("%%%not-json")).toEqual(DEFAULT_PREFS);
  });

  it("defaults to Arabic RTL", () => {
    expect(DEFAULT_PREFS.locale).toBe("ar");
    expect(dirOf("ar")).toBe("rtl");
    expect(dirOf("fr")).toBe("ltr");
  });
});

describe("Verse navigation", () => {
  it("validates route params against real surah lengths", () => {
    expect(parseVerseParams({ surah: "2", ayah: "286" })).toMatchObject({ surah: 2, ayah: 286 });
    expect(parseVerseParams({ surah: "2", ayah: "287" })).toBeNull();
    expect(parseVerseParams({ surah: "abc", ayah: "1" })).toBeNull();
    expect(parseVerseParams({ surah: "115", ayah: "1" })).toBeNull();
  });

  it("crosses surah boundaries", () => {
    expect(adjacentVerses(1, 1).prev).toBeNull();
    expect(adjacentVerses(1, 7).next).toEqual({ surah: 2, ayah: 1 });
    expect(adjacentVerses(2, 1).prev).toEqual({ surah: 1, ayah: 7 });
    expect(adjacentVerses(114, 6).next).toBeNull();
  });

  it("sanitises comparison source lists", () => {
    expect(parseSourceList("saadi,ibn-kathir,saadi,<script>,tabari,qurtubi")).toEqual(["saadi", "ibn-kathir", "tabari"]);
  });
});
