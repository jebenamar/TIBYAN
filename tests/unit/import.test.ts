import { describe, expect, it } from "vitest";
import { parseCsv } from "../../scripts/import/adapters";
import { prepareSurah, type RawEntry } from "../../scripts/import/prepare";

const raw = (a: number, text: string, b = a): RawEntry => ({ surah: 1, ayahStart: a, ayahEnd: b, text });

describe("Import preparation", () => {
  it("merges a commentary repeated on consecutive verses into one ranged entry", () => {
    const { entries, issues } = prepareSurah(1, [raw(1, "أ"), raw(2, "ب"), raw(3, "ب"), raw(4, "ب"), raw(5, "ج"), raw(6, "د"), raw(7, "هـ")]);
    expect(entries.map((e) => [e.ayahStart, e.ayahEnd])).toEqual([[1, 1], [2, 4], [5, 5], [6, 6], [7, 7]]);
    expect(issues).toEqual([]);
  });

  it("reports missing verses instead of filling them", () => {
    const { entries, issues } = prepareSurah(1, [raw(1, "أ"), raw(2, "ب"), raw(4, "د"), raw(5, "هـ"), raw(6, "و"), raw(7, "ز")]);
    expect(entries).toHaveLength(6);
    expect(issues).toContainEqual(expect.objectContaining({ code: "missing-verses", message: expect.stringContaining("3") }));
  });

  it("rejects out-of-range and overlapping entries", () => {
    const { issues } = prepareSurah(1, [raw(1, "أ", 3), raw(2, "ب"), raw(8, "ح")]);
    expect(issues.map((i) => i.code)).toEqual(expect.arrayContaining(["out-of-range", "overlap"]));
  });

  it("skips empty explanations and flags suspect truncation", () => {
    const { entries, issues } = prepareSurah(1, [raw(1, "   "), raw(2, "؟ قال"), ...[3, 4, 5, 6, 7].map((a) => raw(a, `ن${a}`))]);
    expect(entries.find((e) => e.ayahStart === 1)).toBeUndefined();
    expect(issues.map((i) => i.code)).toEqual(expect.arrayContaining(["empty", "suspect-start", "missing-verses"]));
  });

  it("sanitises HTML and escapes plain text", () => {
    const { entries } = prepareSurah(1, [{ surah: 1, ayahStart: 1, ayahEnd: 1, html: "<p>نص<script>x</script></p>" }, raw(2, "<b>ليس وسما</b>")]);
    expect(entries[0].contentHtml).toBe("<p>نص</p>");
    expect(entries[1].contentHtml).toBe("<p>&lt;b&gt;ليس وسما&lt;/b&gt;</p>");
  });

  it("computes stable checksums (idempotent re-imports)", () => {
    const a = prepareSurah(1, [raw(1, "نص")]).entries[0].checksum;
    const b = prepareSurah(1, [raw(1, "نص")]).entries[0].checksum;
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("CSV parser", () => {
  it("handles quotes, commas and newlines inside fields", () => {
    expect(parseCsv('surah,ayah_start,text\n1,1,"قال، ""نعم""\nسطر"\n')).toEqual([
      ["surah", "ayah_start", "text"],
      ["1", "1", 'قال، "نعم"\nسطر'],
    ]);
  });
});
