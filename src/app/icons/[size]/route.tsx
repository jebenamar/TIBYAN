import { ImageResponse } from "next/og";

const SIZES = new Set([180, 192, 512]);

/** PNG app icons rendered from the brand mark (needed by iOS / Android installers). */
export async function GET(_req: Request, ctx: { params: Promise<{ size: string }> }) {
  const size = Number((await ctx.params).size);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#063d35" }}>
        <svg width={size} height={size} viewBox="0 0 512 512">
          <g transform="translate(256 256)">
            <rect x="-150" y="-150" width="300" height="300" rx="18" fill="#0a4a40" />
            <rect x="-150" y="-150" width="300" height="300" rx="18" fill="#0a4a40" transform="rotate(45)" />
            <rect x="-128" y="-128" width="256" height="256" rx="12" fill="none" stroke="#c9a76a" strokeWidth="7" />
            <rect x="-128" y="-128" width="256" height="256" rx="12" fill="none" stroke="#c9a76a" strokeWidth="7" transform="rotate(45)" />
            <path d="M-76 66c27-15 51-15 76 0 25-15 49-15 76 0V-52c-27-15-51-15-76 0-25-15-49-15-76 0Z" fill="none" stroke="#fffdf8" strokeWidth="13" strokeLinejoin="round" />
            <path d="M0-52V66" stroke="#fffdf8" strokeWidth="11" />
            <circle cy="-92" r="11" fill="#c9a76a" />
          </g>
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": `public, max-age=${86400 * 30}, immutable` } },
  );
}
