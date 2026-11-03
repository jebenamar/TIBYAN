/**
 * Imports the Quran text from Tanzil (CC BY 3.0, verbatim — must not be modified).
 *  - Uthmani text for display, simple-clean text for search.
 *  - Verifies line counts, per-surah verse counts against src/data/surahs.json,
 *    and the presence of the Tanzil licence header.
 */
import { prisma } from "../../src/lib/db";
import { BISMILLAH_SIMPLE, normalizeForSearch } from "../../src/lib/arabic";
import { SURAHS } from "../../src/lib/surahs";
import { cachedFetch } from "./adapters";
import { writeReport } from "./pipeline";

type Verse = { s: number; a: number; text: string };

function parseTanzil(body: string, label: string): Verse[] {
  if (!/Tanzil Project/.test(body) || !/Creative Commons Attribution 3\.0/.test(body)) {
    throw new Error(`${label}: Tanzil licence header missing — refusing to import an unverifiable copy`);
  }
  const verses: Verse[] = [];
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^(\d+)\|(\d+)\|(.+)$/);
    if (m) verses.push({ s: Number(m[1]), a: Number(m[2]), text: m[3] });
  }
  if (verses.length !== 6236) throw new Error(`${label}: expected 6236 verses, got ${verses.length}`);
  return verses;
}

export async function importQuran() {
  const uthmani = parseTanzil(
    await cachedFetch("https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true&marks=true&sajdah=true&tatweel=true", "raw/quran-uthmani.txt"),
    "uthmani",
  );
  const simple = parseTanzil(
    await cachedFetch("https://tanzil.net/pub/download/index.php?quranType=simple-clean&outType=txt-2&agree=true", "raw/quran-simple-clean.txt"),
    "simple-clean",
  );

  // Integrity: both files must align verse-for-verse with the reference surah table.
  let idx = 0;
  for (const s of SURAHS) {
    for (let a = 1; a <= s.versesCount; a++, idx++) {
      for (const [v, label] of [[uthmani[idx], "uthmani"], [simple[idx], "simple"]] as const) {
        if (v.s !== s.number || v.a !== a) throw new Error(`${label}: misalignment at index ${idx}: got ${v.s}:${v.a}, expected ${s.number}:${a}`);
      }
    }
  }

  console.log("› Writing 114 surahs …");
  for (const s of SURAHS) {
    const searchText = normalizeForSearch([s.nameArabic, s.nameTransliterated, ...s.aliases, s.names.en, s.names.fr, s.names.es].join(" "));
    const data = {
      number: s.number,
      nameArabic: s.nameArabic,
      nameTransliterated: s.nameTransliterated,
      nameTranslated: s.names,
      versesCount: s.versesCount,
      revelationPlace: s.revelationPlace,
      searchText,
    };
    await prisma.surah.upsert({ where: { id: s.number }, create: { id: s.number, ...data }, update: data });
  }

  console.log("› Writing 6236 ayahs …");
  const rows = uthmani.map((u, i) => {
    const simpleText = simple[i].text;
    // The basmala prefix of verse 1 is excluded from the search index only.
    const forIndex = u.a === 1 && u.s !== 1 && u.s !== 9 && simpleText.startsWith(BISMILLAH_SIMPLE + " ")
      ? simpleText.slice(BISMILLAH_SIMPLE.length + 1)
      : simpleText;
    return { surahId: u.s, numberInSurah: u.a, globalNumber: i + 1, textArabic: u.text, textSimple: simpleText, searchText: normalizeForSearch(forIndex) };
  });
  await prisma.$transaction(async (tx) => {
    await tx.ayah.deleteMany({});
    for (let i = 0; i < rows.length; i += 1000) await tx.ayah.createMany({ data: rows.slice(i, i + 1000) });
  }, { timeout: 120_000 });

  const count = await prisma.ayah.count();
  if (count !== 6236) throw new Error(`Post-import check failed: ${count} ayahs`);
  await prisma.importRun.create({
    data: { kind: "quran", adapter: "tanzil", status: "success", finishedAt: new Date(), stats: { surahs: 114, ayahs: count } },
  });
  writeReport("quran", { source: "tanzil", status: "success", surahs: 114, ayahs: count });
  console.log(`✓ Quran imported — 114 surahs, ${count} ayahs (Tanzil Uthmani + simple-clean)`);
}
