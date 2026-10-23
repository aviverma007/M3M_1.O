/**
 * Faded city-skyline backdrop drawn as SVG (no image asset needed).
 * Buildings are light grey on the page background, with horizontal
 * floor lines to give the "glass tower" look from the original screen.
 */

type Tower = {
  x: number
  w: number
  h: number
  spire?: number // spire height above roof
  tone: number // 0 = lightest, 1 = darkest
}

const GROUND = 900

const towers: Tower[] = [
  // left cluster
  { x: 40, w: 90, h: 260, tone: 0.2 },
  { x: 140, w: 70, h: 340, tone: 0.3 },
  { x: 375, w: 170, h: 260, tone: 0.5 },
  { x: 410, w: 110, h: 270, tone: 0.6 },
  // central landmark towers
  { x: 600, w: 95, h: 640, spire: 220, tone: 0.75 },
  { x: 650, w: 90, h: 520, tone: 0.55 },
  { x: 930, w: 60, h: 700, spire: 110, tone: 0.45 },
  { x: 850, w: 130, h: 200, tone: 0.35 },
  { x: 1000, w: 110, h: 190, tone: 0.3 },
  { x: 1080, w: 120, h: 110, tone: 0.25 },
  // right cluster
  { x: 1215, w: 160, h: 290, tone: 0.45 },
  { x: 1240, w: 60, h: 320, tone: 0.35 },
  { x: 1420, w: 110, h: 90, tone: 0.3 },
  { x: 1520, w: 95, h: 380, spire: 40, tone: 0.55 },
  { x: 1640, w: 90, h: 140, tone: 0.25 },
  { x: 1760, w: 140, h: 220, tone: 0.2 },
]

function shade(tone: number) {
  // interpolate between #eceef1 and #d4d7dc
  const from = [236, 238, 241]
  const to = [212, 215, 220]
  const c = from.map((f, i) => Math.round(f + (to[i] - f) * tone))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

export default function SkylineBackground() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1920 900"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        {/* soft fade at the top so towers dissolve into the background */}
        <linearGradient id="skyFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-page)" stopOpacity="1" />
          <stop offset="0.35" stopColor="var(--color-page)" stopOpacity="0" />
        </linearGradient>
        <pattern id="floors" width="8" height="14" patternUnits="userSpaceOnUse">
          <rect width="8" height="14" fill="transparent" />
          <rect y="10" width="8" height="3" fill="#ffffff" opacity="0.55" />
        </pattern>
      </defs>

      {towers.map((t, i) => {
        const top = GROUND - t.h
        const color = shade(t.tone)
        return (
          <g key={i}>
            {t.spire && (
              <>
                <polygon
                  points={`${t.x + t.w * 0.38},${top} ${t.x + t.w / 2},${top - t.spire} ${t.x + t.w * 0.62},${top}`}
                  fill={color}
                />
                <rect x={t.x + t.w * 0.2} y={top - 18} width={t.w * 0.6} height={18} fill={color} />
              </>
            )}
            <rect x={t.x} y={top} width={t.w} height={t.h} fill={color} />
            <rect x={t.x} y={top} width={t.w} height={t.h} fill="url(#floors)" />
            {/* vertical mullion */}
            <rect x={t.x + t.w * 0.48} y={top} width={2} height={t.h} fill="#ffffff" opacity="0.35" />
          </g>
        )
      })}

      <rect width="1920" height="900" fill="url(#skyFade)" />
    </svg>
  )
}
