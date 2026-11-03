import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { getSources } from "@/lib/queries";

/** Current data versions — lets the client detect outdated offline downloads. */
export async function GET() {
  try {
    const sources = await getSources();
    return NextResponse.json(
      { sources: sources.map((s) => ({ slug: s.slug, version: s.version, importedAt: s.importedAt?.toISOString() ?? null })) },
      { headers: { "Cache-Control": "no-cache" } },
    );
  } catch (err) {
    log.error("offline.manifest_failed", { err });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
