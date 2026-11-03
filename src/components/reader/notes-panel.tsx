"use client";

import { useState } from "react";
import { Check, NotebookPen, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { noteKey, notesStore, saveNote } from "@/lib/local-store";
import { useFlash } from "./actions";

/** Personal notes — visually and structurally separate from the religious texts. */
export function NotesPanel({ surah, ayah }: { surah: number; ayah: number }) {
  const { t } = useApp();
  const notes = notesStore.useValue();
  const existing = notes[noteKey(surah, ayah)]?.text ?? "";
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, flashSaved] = useFlash();
  const value = draft ?? existing;

  return (
    <section aria-labelledby="notes-title" className="rounded-2xl border border-dashed border-line-strong bg-surface-2/50 p-5">
      <div className="mb-1 flex items-center gap-2">
        <NotebookPen className="size-4 text-accent" />
        <h2 id="notes-title" className="text-sm font-semibold text-ink">{t.reader.notes}</h2>
      </div>
      <p className="mb-3 text-xs text-muted">{t.reader.notesHint}</p>
      <textarea
        value={value}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t.reader.notePlaceholder}
        rows={value ? 4 : 2}
        maxLength={20_000}
        className="w-full resize-y rounded-xl border border-line bg-surface p-3 text-[15px] leading-relaxed text-ink outline-none placeholder:text-muted focus:border-accent"
      />
      <div className="mt-2 flex justify-end gap-2">
        {existing && (
          <Button size="sm" variant="ghost" onClick={() => { saveNote(surah, ayah, ""); setDraft(null); }}>
            <Trash2 /> {t.reader.deleteNote}
          </Button>
        )}
        <Button
          size="sm"
          variant="accent"
          disabled={draft === null || draft === existing}
          onClick={() => { saveNote(surah, ayah, value); setDraft(null); flashSaved(); }}
        >
          {saved ? <Check /> : null} {saved ? t.settings.saved : t.reader.saveNote}
        </Button>
      </div>
    </section>
  );
}
