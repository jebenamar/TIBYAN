/**
 * Whole-database integrity report: Quran completeness, per-source coverage,
 * overlapping ranges, orphan entries, checksum drift.
 */
import { createHash } from "node:crypto";
import { prisma } from "../../src/lib/db";
import { SURAHS } from "../../src/lib/surahs";
import { writeReport } from "./pipeline";

export async function validateDatabase() {
  const problems: string[] = [];
  const surahCount = await prisma.surah.count();
  const ayahCount = await prisma.ayah.count();
  if (surahCount !== 114) problems.push(`Surahs: ${surahCount}/114`);
  if (ayahCount !== 6236) problems.push(`Ayahs: ${ayahCount}/6236`);

  const perSurah = await prisma.ayah.groupBy({ by: ["surahId"], _count: true });
  for (const row of perSurah) {
    const expected = SURAHS[row.surahId - 1].versesCount;
    if (row._count !== expected) problems.push(`Surah ${row.surahId}: ${row._count}/${expected} ayahs`);
  }

  const sources = await prisma.tafsirSource.findMany({ orderBy: { sortOrder: "asc" } });
  const coverage: Record<string, unknown> = {};
  for (const src of sources) {
    const entries = await prisma.tafsirEntry.findMany({
      where: { tafsirSourceId: src.id },
      select: { surahId: true, ayahStart: true, ayahEnd: true, contentArabic: true, checksum: true },
      orderBy: [{ surahId: "asc" }, { ayahStart: "asc" }],
    });
    let covered = 0, overlaps = 0, checksumDrift = 0, ranged = 0;
    let prev: (typeof entries)[number] | undefined;
    for (const e of entries) {
      covered += e.ayahEnd - e.ayahStart + 1;
      if (e.ayahEnd > e.ayahStart) ranged++;
      if (prev && prev.surahId === e.surahId && e.ayahStart <= prev.ayahEnd) overlaps++;
      if (createHash("sha256").update(e.contentArabic, "utf8").digest("hex") !== e.checksum) checksumDrift++;
      if (e.ayahEnd > SURAHS[e.surahId - 1].versesCount) problems.push(`${src.slug}: ${e.surahId}:${e.ayahStart}-${e.ayahEnd} exceeds surah length`);
      prev = e;
    }
    if (overlaps) problems.push(`${src.slug}: ${overlaps} overlapping ranges`);
    if (checksumDrift) problems.push(`${src.slug}: ${checksumDrift} entries modified since import (checksum drift)`);
    coverage[src.slug] = {
      entries: entries.length,
      versesCovered: covered,
      coveragePct: Math.round((covered / 6236) * 10000) / 100,
      rangedEntries: ranged,
      licenseStatus: src.licenseStatus,
    };
  }

  const report = { checkedAt: new Date().toISOString(), surahCount, ayahCount, coverage, problems };
  writeReport("_validation", report);
  console.table(coverage);
  if (problems.length) {
    console.log("✗ Problems:\n  " + problems.join("\n  "));
    process.exitCode = 1;
  } else console.log("✓ Database integrity OK");
}
