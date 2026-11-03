import { NextResponse, type NextRequest } from "next/server";
import surahs from "@/data/surahs.json";

/** Verse counts per surah (index = surah number − 1). Static data, bundled. */
const COUNTS = (surahs as Array<{ versesCount: number }>).map((s) => s.versesCount);

const valid = (s: number, a?: number) =>
  Number.isInteger(s) && s >= 1 && s <= 114 && (a === undefined || (Number.isInteger(a) && a >= 1 && a <= COUNTS[s - 1]));

/**
 * Rejects out-of-range verse/surah URLs with a real HTTP 404 *before* rendering
 * starts (route-level loading UI would otherwise commit a 200 status first).
 */
export function proxy(req: NextRequest) {
  const [, kind, s, a] = req.nextUrl.pathname.split("/");
  const ok = kind === "sourate" ? valid(Number(s)) && a === undefined : valid(Number(s), Number(a));
  if (ok) return NextResponse.next();
  return NextResponse.rewrite(new URL("/introuvable", req.url), { status: 404 });
}

export const config = {
  matcher: ["/tafsir/:surah/:ayah", "/comparer/:surah/:ayah", "/sourate/:n"],
};
