import { cn } from "@/lib/utils";

/**
 * Generative girih rosette: concentric rings of rotated squares (8-fold),
 * a 16-point star and radial "light rays". Pure SVG, themed with tokens,
 * rotates very slowly (disabled with prefers-reduced-motion).
 */
export function Rosette({ className }: { className?: string }) {
  const rings = [
    { r: 230, n: 16, w: 0.6, o: 0.35 },
    { r: 170, n: 8, w: 0.8, o: 0.55 },
    { r: 112, n: 8, w: 1, o: 0.8 },
  ];
  const starPoints = (cx: number, cy: number, outer: number, inner: number, n: number) =>
    Array.from({ length: n * 2 }, (_, i) => {
      const a = (Math.PI * i) / n - Math.PI / 2;
      const r = i % 2 === 0 ? outer : inner;
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    }).join(" ");

  return (
    <svg viewBox="-260 -260 520 520" aria-hidden="true" className={cn("pointer-events-none select-none", className)}>
      <defs>
        <radialGradient id="ro-glow">
          <stop offset="0" stopColor="var(--gold)" stopOpacity="0.32" />
          <stop offset="0.55" stopColor="var(--accent)" stopOpacity="0.06" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ro-brass" x1="0" y1="-1" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--gold-ink)" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <circle r="250" fill="url(#ro-glow)" />
      <g className="animate-slow-spin origin-center" style={{ transformBox: "fill-box" }}>
        {Array.from({ length: 32 }, (_, i) => (
          <line key={i} x1="0" y1="-60" x2="0" y2="-250" stroke="var(--gold)" strokeOpacity={i % 2 ? 0.08 : 0.16} strokeWidth="0.6" transform={`rotate(${(360 / 32) * i})`} />
        ))}
        {rings.map((ring, ri) =>
          Array.from({ length: ring.n / 4 }, (_, i) => {
            const s = ring.r * Math.SQRT1_2;
            return (
              <rect
                key={`${ri}-${i}`}
                x={-s}
                y={-s}
                width={s * 2}
                height={s * 2}
                fill="none"
                stroke="url(#ro-brass)"
                strokeOpacity={ring.o}
                strokeWidth={ring.w}
                transform={`rotate(${(90 / (ring.n / 4)) * i})`}
              />
            );
          }),
        )}
        <circle r="230" fill="none" stroke="var(--gold)" strokeOpacity="0.25" strokeWidth="0.6" />
        <circle r="236" fill="none" stroke="var(--gold)" strokeOpacity="0.12" strokeWidth="0.6" strokeDasharray="2 6" />
      </g>
      <polygon points={starPoints(0, 0, 96, 58, 16)} fill="var(--surface)" fillOpacity="0.35" stroke="var(--gold)" strokeOpacity="0.7" strokeWidth="0.9" />
      <polygon points={starPoints(0, 0, 58, 40, 8)} fill="none" stroke="var(--accent)" strokeOpacity="0.55" strokeWidth="0.9" />
      <circle r="30" fill="none" stroke="var(--gold)" strokeOpacity="0.6" strokeWidth="0.8" />
    </svg>
  );
}

/** Ornamental divider: hairline – small star – hairline. */
export function Ornament({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 text-gold", className)} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-line-gold to-line-gold" />
      <svg viewBox="0 0 20 20" className="size-3.5">
        <path d="M10 1 12.6 7.4 19 10 12.6 12.6 10 19 7.4 12.6 1 10 7.4 7.4Z" fill="currentColor" opacity="0.85" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-line-gold to-line-gold" />
    </div>
  );
}

/** Ayah end marker ۝ rendered with locale digits inside an octagonal frame. */
export function AyahNumber({ n, className }: { n: number; className?: string }) {
  const digits = new Intl.NumberFormat("ar-EG").format(n);
  return (
    <span className={cn("relative mx-1 inline-grid size-[1.6em] place-items-center align-middle", className)} aria-label={`﴿${n}﴾`}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full text-gold" aria-hidden="true">
        <rect x="8" y="8" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <rect x="8" y="8" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" transform="rotate(45 20 20)" />
      </svg>
      <span className="relative font-arabic text-[0.42em] font-bold leading-none text-gold-ink">{digits}</span>
    </span>
  );
}

/** Khatam lattice layer. The fade is applied on a wrapper so it doesn't override the pattern mask. */
export function PatternLayer({ fade = true, className }: { fade?: boolean; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", fade && "fade-edges", className)}>
      <div className="pattern-layer" />
    </div>
  );
}
