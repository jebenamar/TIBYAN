import sanitizeHtml from "sanitize-html";

/**
 * Allow-list sanitiser for imported Tafsir HTML. Runs at IMPORT time, so the
 * database only ever stores safe markup. Provider classes are mapped to
 * semantic data attributes:
 *   quran.com  <span class="arabic qpc-hafs …">  → <q data-quran>  (Quran quotation)
 *   quran.com  <span class="blue">               → <span data-connector>
 * Every other attribute, tag, script and style is removed.
 */
export function sanitizeTafsirHtml(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: ["p", "br", "span", "q", "strong", "b", "em", "sup", "sub", "h3", "h4", "ul", "ol", "li"],
    allowedAttributes: { q: ["data-quran"], span: ["data-connector", "data-hadith"] },
    allowedSchemes: [],
    transformTags: {
      span: (tagName, attribs): sanitizeHtml.Tag => {
        const cls = attribs.class ?? "";
        if (/\b(qpc-hafs|arabic)\b/.test(cls) && /\b(brown|qpc-hafs)\b/.test(cls)) {
          return { tagName: "q", attribs: { "data-quran": "" } };
        }
        if (/\bblue\b/.test(cls)) return { tagName: "span", attribs: { "data-connector": "" } };
        if (/\bgreen\b/.test(cls)) return { tagName: "span", attribs: { "data-hadith": "" } };
        return { tagName: "span", attribs: {} };
      },
      div: "p",
      h1: "h3",
      h2: "h3",
    },
    exclusiveFilter: (frame) => frame.tag === "span" && !frame.text.trim() && !frame.mediaChildren.length,
  }).trim();
}

/** Plain text from (already-sanitised) HTML, paragraph breaks preserved. */
export function htmlToText(html: string): string {
  return sanitizeHtml(html.replace(/<\/(p|h3|h4|li)>/g, "\n").replace(/<br\s*\/?>/g, "\n"), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

/** Escapes plain text and wraps paragraphs — for sources delivered as plain text. */
export function textToHtml(text: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("");
}
