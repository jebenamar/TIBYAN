import { Fragment } from "react";
import type { Range } from "@/lib/highlight";

/** Renders text with <mark> around the given ranges. Text is rendered as text (never HTML). */
export function Highlighted({ text, ranges, className }: { text: string; ranges: Range[]; className?: string }) {
  if (!ranges.length) return <span className={className}>{text}</span>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([s, e], i) => {
    if (s > cursor) parts.push(<Fragment key={`t${i}`}>{text.slice(cursor, s)}</Fragment>);
    parts.push(<mark key={`m${i}`}>{text.slice(s, e)}</mark>);
    cursor = e;
  });
  if (cursor < text.length) parts.push(<Fragment key="end">{text.slice(cursor)}</Fragment>);
  return <span className={className}>{parts}</span>;
}
