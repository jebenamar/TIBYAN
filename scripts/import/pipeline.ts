import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../../src/lib/db";
import type { SourceDefinition } from "./sources";

export { prepareSurah, type Adapter, type Issue, type PreparedEntry, type RawEntry } from "./prepare";
import { prepareSurah, type Adapter, type Issue, type PreparedEntry } from "./prepare";

export async function upsertSource(def: SourceDefinition) {
  const data = {
    titleArabic: def.titleArabic,
    titleLatin: def.titleLatin,
    authorArabic: def.authorArabic,
    authorLatin: def.authorLatin,
    description: def.description,
    edition: def.edition,
    publisher: def.publisher,
    sourceUrl: def.sourceUrl,
    sourceName: def.sourceName,
    license: def.license,
    licenseStatus: def.licenseStatus,
    licenseNotes: def.licenseNotes,
    version: def.version,
    sortOrder: def.sortOrder,
  };
  return prisma.tafsirSource.upsert({ where: { slug: def.slug }, create: { slug: def.slug, ...data }, update: data });
}

/** Idempotent per (source, surah): replaces the surah's entries inside one transaction. */
async function writeSurah(sourceId: number, surah: number, entries: PreparedEntry[], importVersion: string) {
  const existing = await prisma.tafsirEntry.findMany({
    where: { tafsirSourceId: sourceId, surahId: surah },
    select: { ayahStart: true, ayahEnd: true, checksum: true },
  });
  const key = (e: { ayahStart: number; ayahEnd: number; checksum: string }) => `${e.ayahStart}-${e.ayahEnd}-${e.checksum}`;
  const before = new Set(existing.map(key));
  const unchanged = entries.length === existing.length && entries.every((e) => before.has(key(e)));
  if (unchanged) return { written: 0, unchanged: true };

  await prisma.$transaction([
    prisma.tafsirEntry.deleteMany({ where: { tafsirSourceId: sourceId, surahId: surah } }),
    prisma.tafsirEntry.createMany({ data: entries.map((e) => ({ ...e, tafsirSourceId: sourceId, importVersion })) }),
  ]);
  return { written: entries.length, unchanged: false };
}

export interface RunOptions {
  surahs: number[];
  concurrency?: number;
  dryRun?: boolean;
}

export async function runTafsirImport(def: SourceDefinition, adapter: Adapter, opts: RunOptions) {
  const source = await upsertSource(def);
  const run = await prisma.importRun.create({
    data: { tafsirSourceId: source.id, kind: "tafsir", adapter: adapter.name, status: "running" },
  });
  const allIssues: Issue[] = [];
  let entries = 0, written = 0, unchangedSurahs = 0, failedSurahs = 0;
  const queue = [...opts.surahs];
  const started = Date.now();

  async function worker() {
    for (let s = queue.shift(); s !== undefined; s = queue.shift()) {
      try {
        const fetched = await adapter.fetchSurah(s);
        const prepared = prepareSurah(s, fetched.entries);
        allIssues.push(...fetched.issues, ...prepared.issues);
        entries += prepared.entries.length;
        if (!opts.dryRun) {
          const res = await writeSurah(source.id, s, prepared.entries, def.version);
          written += res.written;
          if (res.unchanged) unchangedSurahs++;
        }
        process.stdout.write(`  ${def.slug} · surah ${String(s).padStart(3)} · ${prepared.entries.length} entries\n`);
      } catch (err) {
        failedSurahs++;
        allIssues.push({ level: "error", surah: s, code: "fetch-failed", message: String(err instanceof Error ? err.message : err) });
        process.stdout.write(`  ${def.slug} · surah ${s} · FAILED: ${err}\n`);
      }
    }
  }
  await Promise.all(Array.from({ length: opts.concurrency ?? 3 }, worker));

  const total = await prisma.tafsirEntry.count({ where: { tafsirSourceId: source.id } });
  await prisma.tafsirSource.update({ where: { id: source.id }, data: { entryCount: total, importedAt: new Date() } });

  const errors = allIssues.filter((i) => i.level === "error").length;
  const status = failedSurahs === opts.surahs.length ? "failed" : errors || failedSurahs ? "partial" : "success";
  const stats = { surahs: opts.surahs.length, entries, written, unchangedSurahs, failedSurahs, errors, warnings: allIssues.length - errors, seconds: Math.round((Date.now() - started) / 1000) };
  await prisma.importRun.update({
    where: { id: run.id },
    data: { status, finishedAt: new Date(), stats, issues: allIssues.slice(0, 2000) as never },
  });
  writeReport(def.slug, { source: def.slug, adapter: adapter.name, status, stats, issues: allIssues });
  return { status, stats, issues: allIssues };
}

export function writeReport(name: string, report: unknown) {
  const dir = path.resolve("reports/import");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(report, null, 2));
}
