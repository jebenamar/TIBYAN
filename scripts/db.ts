/**
 * Local PostgreSQL for development — no Docker required.
 * Spawns a real PostgreSQL cluster (embedded-postgres binaries) in ./.pgdata.
 *
 *   pnpm db:start   -> starts the cluster on port 5433 and keeps running (Ctrl+C to stop)
 *
 * In production, point DATABASE_URL at any PostgreSQL ≥ 14 instead.
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const PORT = Number(process.env.LOCAL_PG_PORT ?? 5433);
const DB_NAME = "tafsir";
const dataDir = path.resolve(process.cwd(), ".pgdata");

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "tafsir",
    password: "tafsir",
    port: PORT,
    persistent: true,
    autoRehydrateSymlinks: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {},
  });

  const fresh = !existsSync(path.join(dataDir, "PG_VERSION"));
  if (fresh) {
    console.log("› Initialising PostgreSQL cluster in .pgdata …");
    await pg.initialise();
  }
  await pg.start();
  if (fresh) await pg.createDatabase(DB_NAME);

  console.log(`✓ PostgreSQL ready — postgresql://tafsir:tafsir@localhost:${PORT}/${DB_NAME}`);
  console.log("  Press Ctrl+C to stop.");

  const stop = async () => {
    console.log("\n› Stopping PostgreSQL …");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  // keep process alive
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
