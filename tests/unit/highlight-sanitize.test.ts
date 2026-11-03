import { describe, expect, it } from "vitest";
import { findRanges, queryTerms, snippet } from "@/lib/highlight";
import { htmlToText, sanitizeTafsirHtml } from "@/lib/sanitize";

describe("Highlighting on original (diacritised) text", () => {
  const verse = "وَٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ";

  it("maps a plain query onto the Uthmani text including harakat", () => {
    const [[s, e]] = findRanges(verse, queryTerms("الصبر"));
    expect(verse.slice(s, e)).toBe("ٱلصَّبْرِ");
  });

  it("never alters the original text", () => {
    expect(snippet(verse, queryTerms("الصبر"), 1000).text).toBe(verse);
  });

  it("builds a bounded window around the first match", () => {
    const long = `${"كلمة ".repeat(200)}الصبر ${"نص ".repeat(200)}`;
    const r = snippet(long, queryTerms("الصبر"), 50);
    expect(r.text.length).toBeLessThan(200);
    expect(r.prefix && r.suffix).toBe(true);
    expect(r.text.slice(r.ranges[0][0], r.ranges[0][1])).toBe("الصبر");
  });

  it("exact mode keeps the phrase as one term", () => {
    expect(queryTerms("آية الكرسي", true)).toEqual(["ايه الكرسي"]);
  });
});

describe("Tafsir HTML sanitiser", () => {
  it("removes scripts, handlers, links and styles", () => {
    const out = sanitizeTafsirHtml(
      '<p onclick="x()">نص<script>alert(1)</script><a href="javascript:alert(1)">رابط</a><img src=x onerror=alert(1)><style>p{}</style></p>',
    );
    expect(out).toBe("<p>نصرابط</p>");
  });

  it("maps provider classes to semantic attributes", () => {
    expect(sanitizeTafsirHtml('<span class="arabic qpc-hafs brown">{ ذَلِكَ الْكِتَابُ }</span>')).toBe("<q data-quran>{ ذَلِكَ الْكِتَابُ }</q>");
    expect(sanitizeTafsirHtml('<span class="blue">أي:</span>')).toBe("<span data-connector>أي:</span>");
    expect(sanitizeTafsirHtml('<span style="color:red" class="x">ب</span>')).toBe("<span>ب</span>");
  });

  it("produces plain text with one line per paragraph", () => {
    expect(htmlToText("<p>أ &amp; ب</p><p>ج</p>")).toBe("أ & ب\nج");
  });
});
