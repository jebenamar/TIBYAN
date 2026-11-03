/**
 * Builds src/data/surahs.json from cached Tanzil metadata (CC BY) and
 * Quran.com chapter names (en/fr/es). Verse counts are cross-checked between
 * both providers; any mismatch aborts the build.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const raw = path.resolve(".cache/raw");
const xml = readFileSync(path.join(raw, "quran-data.xml"), "utf8");
const chapters = (l: string) =>
  JSON.parse(readFileSync(path.join(raw, `chapters-${l}.json`), "utf8")).chapters as Array<{
    id: number; name_simple: string; name_complex: string; name_arabic: string;
    verses_count: number; revelation_place: string; translated_name: { name: string };
  }>;
const en = chapters("en"), fr = chapters("fr"), es = chapters("es");

const suras = [...xml.matchAll(/<sura index="(\d+)" ayas="(\d+)" start="(\d+)" name="([^"]+)" tname="([^"]+)" ename="([^"]+)" type="(\w+)"/g)];
if (suras.length !== 114) throw new Error(`Expected 114 suras, got ${suras.length}`);

const out = suras.map((m) => {
  const n = Number(m[1]);
  const q = en[n - 1];
  if (q.id !== n) throw new Error(`Order mismatch at ${n}`);
  if (q.verses_count !== Number(m[2])) throw new Error(`Verse count mismatch at ${n}`);
  return {
    number: n,
    nameArabic: m[4],
    nameTransliterated: q.name_simple,
    aliases: [...new Set([m[5], q.name_complex, q.name_simple, q.name_arabic])],
    names: { en: q.translated_name.name, fr: fr[n - 1].translated_name.name, es: es[n - 1].translated_name.name },
    versesCount: Number(m[2]),
    firstGlobalAyah: Number(m[3]) + 1,
    revelationPlace: m[7] === "Meccan" ? "makkah" : "madinah",
  };
});
const total = out.reduce((s, x) => s + x.versesCount, 0);
if (total !== 6236) throw new Error(`Expected 6236 ayahs, got ${total}`);
writeFileSync("src/data/surahs.json", JSON.stringify(out, null, 1) + "\n");
console.log(`✓ src/data/surahs.json — 114 surahs, ${total} ayahs`);
