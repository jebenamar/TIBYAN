/**
 * Data CLI.
 *
 *   pnpm data quran                                  Import Quran text (Tanzil)
 *   pnpm data tafsir muyassar [--surahs 1-10,18]     Import one source with its registered adapter
 *   pnpm data tafsir all                             Import every registered source
 *   pnpm data tafsir <slug> --file data.json         Import from a local JSON / JSONL file
 *   pnpm data tafsir <slug> --file data.csv          Import from CSV (surah,ayah_start,ayah_end,text)
 *   pnpm data tafsir <slug> --sql <url> --query "…"  Import from any PostgreSQL query
 *   pnpm data validate                               Integrity report over the whole database
 *
 * Flags: --dry-run (fetch + validate, no writes), --concurrency N
 */
import "dotenv/config";
import { prisma } from "../../src/lib/db";
import { adapterFor, csvFileAdapter, jsonFileAdapter, sqlAdapter } from "./adapters";
import { runTafsirImport, type Adapter } from "./pipeline";
import { importQuran } from "./quran";
import { getSourceDef, SOURCES } from "./sources";
import { validateDatabase } from "./validate";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

export function parseSurahList(spec: string | undefined): number[] {
  if (!spec) return Array.from({ length: 114 }, (_, i) => i + 1);
  const out = new Set<number>();
  for (const part of spec.split(",")) {
    const [a, b] = part.split("-").map((x) => Number(x.trim()));
    for (let n = a; n <= (b || a); n++) if (n >= 1 && n <= 114) out.add(n);
  }
  return [...out].sort((x, y) => x - y);
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === "quran") return importQuran();
  if (cmd === "validate") return validateDatabase();
  if (cmd === "tafsir" && arg) {
    const ayahs = await prisma.ayah.count();
    if (ayahs !== 6236) throw new Error("Import the Quran text first: pnpm data quran");
    const slugs = arg === "all" ? SOURCES.map((s) => s.slug) : [arg];
    for (const slug of slugs) {
      const def = getSourceDef(slug);
      const file = flag("file");
      const sql = flag("sql");
      let adapter: Adapter;
      if (file) adapter = file.endsWith(".csv") ? csvFileAdapter(file) : jsonFileAdapter(file);
      else if (sql) adapter = sqlAdapter(sql, flag("query") ?? "");
      else adapter = adapterFor(def.adapter);
      console.log(`\n› ${def.titleLatin} — adapter ${adapter.name}`);
      const res = await runTafsirImport(def, adapter, {
        surahs: parseSurahList(flag("surahs")),
        concurrency: Number(flag("concurrency") ?? 3),
        dryRun: process.argv.includes("--dry-run"),
      });
      console.log(`✓ ${def.slug}: ${res.status} — ${JSON.stringify(res.stats)} (report: reports/import/${def.slug}.json)`);
    }
    return;
  }
  console.log("Usage: pnpm data <quran | tafsir <slug|all> [--surahs 1-5] | validate>");
  process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error("✗", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
