import { formatCount, partitionLimit } from './model'

// The drawing, in SVG units
const WIDTH = 640
const HEIGHT = 146
const LEFT = 24
const RIGHT = 616
const BAND_Y = 50
const BAND_H = 40
// Sizes from 1 page to 100 million, on a log scale
const LOW = 0
const HIGH = 8

const atSize = (pages: number) => LEFT + ((Math.log10(Math.max(pages, 1)) - LOW) / (HIGH - LOW)) * (RIGHT - LEFT)
const clamp = (x: number) => Math.max(LEFT, Math.min(RIGHT, x))
// 1,500 as "1.5k", 1,000,020 as "1M"
const short = (pages: number) =>
  pages >= 1e6
    ? `${Number((pages / 1e6).toPrecision(3))}M`
    : pages >= 1e3
      ? `${Number((pages / 1e3).toPrecision(3))}k`
      : String(pages)

const label = 'font-mono text-[11px] uppercase tracking-widest'

// Table sizes by what M pages of memory lets a join do with them: up to
// M − 1 pages it fits (read once), up to about M² its partitions or runs fit
// (read three times), past that it needs more passes. Marked on it: the
// smaller table, which is all hashing has to fit, and both together, which
// is what sort-merge has to fit.
export default function Limits({ r, s, m }: { r: number; s: number; m: number }) {
  const zones = [
    { from: LEFT, to: clamp(atSize(m - 1)), name: 'read once' },
    { from: clamp(atSize(m - 1)), to: clamp(atSize(partitionLimit(m))), name: '3 trips' },
    { from: clamp(atSize(partitionLimit(m))), to: RIGHT, name: 'more passes' },
  ]
  const markS = atSize(s)
  const markBoth = atSize(r + s)
  const inZone = (x: number) => zones.findIndex((z) => x >= z.from && x <= z.to)
  const sZone = inZone(markS)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`Table sizes from 1 page to 100 million: up to ${formatCount(m - 1)} pages fit in memory, up to ${formatCount(partitionLimit(m))} take three trips`}
    >
      <text x={LEFT} y={14} className={`fill-zinc-faded ${label}`}>
        Sizes, by what M = {formatCount(m)} pages allows
      </text>
      {zones.map((zone, i) =>
        zone.to > zone.from ? (
          <g key={i}>
            <rect
              x={zone.from}
              y={BAND_Y}
              width={zone.to - zone.from}
              height={BAND_H}
              className={
                i === sZone
                  ? 'fill-sage/30 stroke-paper'
                  : i % 2
                    ? 'fill-zinc-300 dark:fill-zinc-200/20 stroke-paper'
                    : 'fill-zinc-200 dark:fill-zinc-200/10 stroke-paper'
              }
              strokeWidth={2}
            />
            {zone.to - zone.from > zone.name.length * 9 + 16 && (
              <text
                x={(zone.from + zone.to) / 2}
                y={BAND_Y - 8}
                textAnchor="middle"
                className={`${label} ${i === sZone ? 'fill-sage-ink' : 'fill-zinc-faded'}`}
              >
                {zone.name}
              </text>
            )}
          </g>
        ) : null
      )}

      {/* The smaller table, solid; both together, dashed; their sizes under the band */}
      <line x1={markS} y1={BAND_Y} x2={markS} y2={BAND_Y + BAND_H + 6} className="stroke-ink" strokeWidth={2} />
      <text
        x={markS}
        y={BAND_Y + BAND_H + 18}
        textAnchor={markS > RIGHT - 70 ? 'end' : markS < LEFT + 70 ? 'start' : 'middle'}
        className={`fill-ink ${label}`}
      >
        S {short(s)}
      </text>
      <line
        x1={markBoth}
        y1={BAND_Y}
        x2={markBoth}
        y2={BAND_Y + BAND_H + 20}
        className="stroke-ink"
        strokeWidth={2}
        strokeDasharray="4 3"
      />
      <text
        x={markBoth}
        y={BAND_Y + BAND_H + 33}
        textAnchor={markBoth > RIGHT - 70 ? 'end' : markBoth < LEFT + 70 ? 'start' : 'middle'}
        className={`fill-ink ${label}`}
      >
        R + S {short(r + s)}
      </text>

      {/* The axis, in pages */}
      {[1, 100, 1e4, 1e6, 1e8].map((pages) => (
        <text
          key={pages}
          x={atSize(pages)}
          y={HEIGHT - 4}
          textAnchor={pages === 1 ? 'start' : pages === 1e8 ? 'end' : 'middle'}
          className="fill-zinc-faded font-mono text-[11px]"
        >
          {short(pages)}
        </text>
      ))}
    </svg>
  )
}
