import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { DICTIONARIES } from "@/i18n/dictionaries";
import { parsePrefs, PREFS_COOKIE } from "./prefs";

export const getPrefs = cache(async () => parsePrefs((await cookies()).get(PREFS_COOKIE)?.value));

export async function getI18n() {
  const prefs = await getPrefs();
  return { prefs, locale: prefs.locale, t: DICTIONARIES[prefs.locale] };
}
