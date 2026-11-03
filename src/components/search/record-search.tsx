"use client";

import { useEffect } from "react";
import { pushRecentSearch } from "@/lib/local-store";

/** Adds a search page query to the local "recent searches" history. */
export function RecordSearch({ q }: { q: string }) {
  useEffect(() => pushRecentSearch(q), [q]);
  return null;
}
