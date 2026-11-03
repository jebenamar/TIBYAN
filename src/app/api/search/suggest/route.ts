import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { log } from "@/lib/log";
import { searchQuran, searchTafsir, timed } from "@/lib/search";

const schema = z.object({ q: z.string().trim().min(2).max(120) });

/** Instant suggestions for the command palette: top Quran verses + top Tafsir passages. */
export async function GET(req: NextRequest) {
  const parsed = schema.safeParse({ q: req.nextUrl.searchParams.get("q") ?? "" });
  if (!parsed.success) return NextResponse.json({ ayahs: [], tafsir: [] });
  const { q } = parsed.data;
  try {
    const [quran, tafsir] = await timed("search.suggest", { q }, () =>
      Promise.all([
        searchQuran({ q, exact: false, limit: 5, offset: 0 }),
        searchTafsir({ q, exact: false, limit: 4, offset: 0 }),
      ]),
    );
    return NextResponse.json(
      { ayahs: quran.hits, tafsir: tafsir.hits },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    log.error("search.suggest_failed", { q, err });
    return NextResponse.json({ error: "search_failed" }, { status: 500 });
  }
}
