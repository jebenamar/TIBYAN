/** Structured JSON logs (one line per event) — easy to ship to any log pipeline. */
type Level = "debug" | "info" | "warn" | "error";

function serialize(meta: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = v instanceof Error ? { name: v.name, message: v.message, stack: v.stack?.split("\n").slice(0, 5).join("\n") } : v;
  }
  return out;
}

function write(level: Level, event: string, meta: Record<string, unknown> = {}) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...serialize(meta) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (e: string, m?: Record<string, unknown>) => write("debug", e, m),
  info: (e: string, m?: Record<string, unknown>) => write("info", e, m),
  warn: (e: string, m?: Record<string, unknown>) => write("warn", e, m),
  error: (e: string, m?: Record<string, unknown>) => write("error", e, m),
};
