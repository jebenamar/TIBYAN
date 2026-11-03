import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { getSurah } from "../../src/lib/surahs";
import type { Adapter, Issue, RawEntry } from "./pipeline";
import type { AdapterConfig } from "./sources";

const CACHE = path.resolve(".cache");

/** GET with on-disk cache, retries and exponential back-off. */
export async function cachedFetch(url: string, cacheFile: string, retries = 4): Promise<string> {
  const file = path.join(CACHE, cacheFile);
  if (existsSync(file)) return readFileSync(file, "utf8");
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "tafsir-importer/1.0 (+local study app)" }, signal: AbortSignal.timeout(120_000) });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const body = await res.text();
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, body);
      return body;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw lastErr;
}

/* ───────────────────────── Tanzil (txt-2: "sura|aya|text") ───────────────────────── */

export function tanzilAdapter(transId: string): Adapter {
  let bySurah: Map<number, RawEntry[]> | null = null;
  async function load() {
    if (bySurah) return bySurah;
    const body = await cachedFetch(`https://tanzil.net/trans/?transID=${transId}&type=txt-2`, `raw/${transId}.txt`);
    bySurah = new Map();
    let count = 0;
    for (const line of body.split(/\r?\n/)) {
      const m = line.match(/^(\d+)\|(\d+)\|(.*)$/);
      if (!m) continue;
      const s = Number(m[1]), a = Number(m[2]);
      if (!bySurah.has(s)) bySurah.set(s, []);
      bySurah.get(s)!.push({ surah: s, ayahStart: a, ayahEnd: a, text: m[3], reference: `tanzil:${transId}:${s}:${a}` });
      count++;
    }
    if (count !== 6236) throw new Error(`Tanzil ${transId}: expected 6236 lines, got ${count}`);
    return bySurah;
  }
  return {
    name: `tanzil:${transId}`,
    async fetchSurah(surah) {
      return { entries: (await load()).get(surah) ?? [], issues: [] };
    },
  };
}

/* ───────────────────────── Quran.com API v4 ───────────────────────── */

interface QcTafsir { verse_key: string; text: string }
interface QcPage { tafsirs: QcTafsir[]; pagination: { total_pages: number; total_records: number } }

export function quranComAdapter(resourceId: number): Adapter {
  const base = `https://api.quran.com/api/v4/tafsirs/${resourceId}/by_chapter`;
  return {
    name: `qurancom:${resourceId}`,
    async fetchSurah(surah) {
      const entries: RawEntry[] = [];
      const issues: Issue[] = [];
      let page = 1, totalPages = 1;
      do {
        const body = await cachedFetch(`${base}/${surah}?per_page=50&page=${page}`, `qurancom/${resourceId}/${surah}-${page}.json`);
        const json = JSON.parse(body) as QcPage;
        totalPages = json.pagination.total_pages;
        for (const t of json.tafsirs) {
          const [s, a] = t.verse_key.split(":").map(Number);
          if (s !== surah) continue;
          entries.push({ surah, ayahStart: a, ayahEnd: a, html: t.text ?? "", reference: `quran.com:tafsir/${resourceId}/${t.verse_key}` });
        }
        page++;
      } while (page <= totalPages);
      const meta = getSurah(surah)!;
      if (entries.length !== meta.versesCount) {
        issues.push({ level: "warning", surah, code: "provider-count", message: `Provider returned ${entries.length} records for ${meta.versesCount} verses` });
      }
      return { entries, issues };
    },
  };
}

/* ───────────────────────── mosahaf-tafseer JSON (GitHub) ───────────────────────── */

interface MosahafFile { number: number; ayahs: Array<{ ayah_number: number; tafsir: Array<{ type: string; text: string }> }> }

export function mosahafAdapter(typeName: string): Adapter {
  let files: string[] | null = null;
  async function listing() {
    if (files) return files;
    const body = await cachedFetch("https://api.github.com/repos/meibassam/mosahaf-tafseer/contents/json-data", "mosahaf/_listing.json");
    files = (JSON.parse(body) as Array<{ name: string }>).map((f) => f.name).filter((n) => n.endsWith(".json")).sort();
    if (files.length !== 114) throw new Error(`mosahaf: expected 114 files, got ${files.length}`);
    return files;
  }
  return {
    name: `mosahaf:${typeName}`,
    async fetchSurah(surah) {
      const name = (await listing())[surah - 1];
      if (!name.startsWith(String(surah).padStart(3, "0"))) throw new Error(`mosahaf: unexpected file ${name} for surah ${surah}`);
      const body = await cachedFetch(
        `https://raw.githubusercontent.com/meibassam/mosahaf-tafseer/master/json-data/${encodeURIComponent(name)}`,
        `mosahaf/${String(surah).padStart(3, "0")}.json`,
      );
      const json = JSON.parse(body) as MosahafFile;
      if (json.number !== surah) throw new Error(`mosahaf: file ${name} declares surah ${json.number}`);
      const entries: RawEntry[] = [];
      for (const a of json.ayahs) {
        const t = a.tafsir.find((x) => x.type === typeName);
        if (t) entries.push({ surah, ayahStart: a.ayah_number, ayahEnd: a.ayah_number, text: t.text, reference: `mosahaf:${surah}:${a.ayah_number}` });
      }
      return { entries, issues: [] };
    },
  };
}

/* ───────────────────────── Generic structured formats ───────────────────────── */

/**
 * JSON file: array of { surah, ayah | ayahStart, ayahEnd?, text | html, reference? }
 * or JSON Lines (one object per line).
 */
export function jsonFileAdapter(file: string): Adapter {
  let rows: RawEntry[] | null = null;
  const load = () => {
    if (rows) return rows;
    const body = readFileSync(file, "utf8").trim();
    const items: Record<string, unknown>[] = body.startsWith("[") ? JSON.parse(body) : body.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
    rows = items.map(toRawEntry);
    return rows;
  };
  return { name: `json:${path.basename(file)}`, async fetchSurah(s) { return { entries: load().filter((r) => r.surah === s), issues: [] }; } };
}

/** CSV with header: surah,ayah_start,ayah_end,text (RFC 4180 quoting). */
export function csvFileAdapter(file: string): Adapter {
  let rows: RawEntry[] | null = null;
  const load = () => {
    if (rows) return rows;
    const records = parseCsv(readFileSync(file, "utf8"));
    const header = records.shift()!.map((h) => h.trim().toLowerCase());
    rows = records.filter((r) => r.length > 1).map((r) => toRawEntry(Object.fromEntries(header.map((h, i) => [h, r[i]]))));
    return rows;
  };
  return { name: `csv:${path.basename(file)}`, async fetchSurah(s) { return { entries: load().filter((r) => r.surah === s), issues: [] }; } };
}

/** Any PostgreSQL database (e.g. a restored SQL dump): query must return surah, ayah_start, ayah_end, text. */
export function sqlAdapter(connectionString: string, query: string): Adapter {
  let rows: RawEntry[] | null = null;
  const load = async () => {
    if (rows) return rows;
    const client = new Client({ connectionString });
    await client.connect();
    try {
      rows = (await client.query(query)).rows.map(toRawEntry);
    } finally {
      await client.end();
    }
    return rows;
  };
  return { name: "sql", async fetchSurah(s) { return { entries: (await load()).filter((r) => r.surah === s), issues: [] }; } };
}

function toRawEntry(o: Record<string, unknown>): RawEntry {
  const num = (v: unknown) => (v === undefined || v === null || v === "" ? undefined : Number(v));
  const surah = num(o.surah)!;
  const start = num(o.ayahStart ?? o.ayah_start ?? o.ayah)!;
  const end = num(o.ayahEnd ?? o.ayah_end) ?? start;
  if (!Number.isInteger(surah) || !Number.isInteger(start)) throw new Error(`Invalid row: ${JSON.stringify(o).slice(0, 120)}`);
  return {
    surah,
    ayahStart: start,
    ayahEnd: end,
    html: typeof o.html === "string" ? o.html : undefined,
    text: typeof o.text === "string" ? o.text : undefined,
    reference: typeof o.reference === "string" ? o.reference : undefined,
  };
}

export function parseCsv(input: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(field); out.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); out.push(row); }
  return out;
}

export function adapterFor(config: AdapterConfig): Adapter {
  switch (config.kind) {
    case "tanzil": return tanzilAdapter(config.transId);
    case "qurancom": return quranComAdapter(config.resourceId);
    case "mosahaf": return mosahafAdapter(config.typeName);
  }
}
