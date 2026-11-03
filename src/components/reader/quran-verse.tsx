import { AyahNumber } from "@/components/brand/rosette";
import { splitBismillah } from "@/lib/arabic";
import { cn } from "@/lib/utils";

/**
 * Renders Tanzil Uthmani text verbatim. When verse 1 carries the basmala
 * prefix, it is laid out as a separate centred line (characters unchanged).
 */
export function QuranVerses({
  surah,
  verses,
  current,
}: {
  surah: number;
  verses: Array<{ numberInSurah: number; textArabic: string }>;
  current: number;
}) {
  return (
    <div dir="rtl" lang="ar" className="quran-text text-center">
      {verses.map((v) => {
        const { bismillah, text } = splitBismillah(surah, v.numberInSurah, v.textArabic);
        const isCurrent = v.numberInSurah === current;
        return (
          <span key={v.numberInSurah}>
            {bismillah && (
              <span className="mb-4 block text-[0.78em] text-gold-ink" aria-label="بسم الله الرحمن الرحيم">
                {bismillah}
              </span>
            )}
            <span
              className={cn(
                "rounded-lg transition-colors",
                verses.length > 1 && !isCurrent && "text-ink/55",
                verses.length > 1 && isCurrent && "bg-gold-soft/60 box-decoration-clone px-1",
              )}
              aria-current={isCurrent ? "true" : undefined}
            >
              {text}
            </span>
            <AyahNumber n={v.numberInSurah} />{" "}
          </span>
        );
      })}
    </div>
  );
}
