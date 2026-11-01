import { motion } from 'motion/react'
import { EASE, useSeen } from './motion'

export interface Series {
  name: string
  points: [number, number][]
  accent?: boolean
  muted?: boolean
  // A second contender, told apart from the first by colour
  warm?: boolean
  dashed?: boolean
}

// A few lines on one chart that draw themselves in when they come into
// view, each named at its right end. `mark` rings one point the text talks
// about. Remount (a new `key`) to draw again when the data changes.
export function Lines({
  series,
  x,
  y,
  xLabel,
  yLabel,
  format = (v) => String(v),
  mark,
}: {
  series: Series[]
  x: { min: number; max: number; ticks: number[]; format?: (v: number) => string }
  y: { min: number; max: number; ticks: number[] }
  xLabel: string
  yLabel: string
  format?: (v: number) => string
  mark?: { x: number; y: number; label: string }
}) {
  const { ref, seen } = useSeen<SVGSVGElement>(0.4)
  const W = 640
  const H = 300
  const L = 48
  const R = 128
  const T = 30
  const B = 44
  const px = (v: number) => L + ((v - x.min) / (x.max - x.min)) * (W - L - R)
  const py = (v: number) => T + (1 - (v - y.min) / (y.max - y.min)) * (H - T - B)
  const fx = x.format ?? String

  // End labels, nudged apart so they never overlap
  const ends = series
    .map((s, i) => ({ i, y: py(s.points[s.points.length - 1][1]) }))
    .sort((a, b) => a.y - b.y)
  for (let k = 1; k < ends.length; k++) ends[k].y = Math.max(ends[k].y, ends[k - 1].y + 15)
  const endY = new Map(ends.map((e) => [e.i, e.y]))

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${yLabel} by ${xLabel}`}>
      {y.ticks.map((t) => (
        <g key={`y${t}`}>
          <line x1={L} x2={W - R} y1={py(t)} y2={py(t)} className="stroke-zinc-200 dark:stroke-zinc-200/15" />
          <text x={L - 8} y={py(t) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
            {format(t)}
          </text>
        </g>
      ))}
      {x.ticks.map((t) => (
        <text key={`x${t}`} x={px(t)} y={H - B + 18} textAnchor="middle" className="fill-zinc-400 font-mono text-[11px]">
          {fx(t)}
        </text>
      ))}
      <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {xLabel}
      </text>
      <text x={0} y={12} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {yLabel}
      </text>

      {series.map((s, i) => {
        const d = s.points.map(([a, b], k) => `${k ? 'L' : 'M'}${px(a)},${py(b)}`).join(' ')
        const tone = s.accent ? 'stroke-sage' : s.warm ? 'stroke-[#b08d57]' : s.muted ? 'stroke-zinc-400' : 'stroke-zinc-faded'
        const fill = s.accent ? 'fill-sage' : s.warm ? 'fill-[#b08d57]' : s.muted ? 'fill-zinc-400' : 'fill-zinc-faded'
        const [lx, ly] = s.points[s.points.length - 1]
        return (
          <g key={s.name}>
            <motion.path
              d={d}
              fill="none"
              className={tone}
              strokeWidth={s.accent ? 3 : 1.75}
              strokeDasharray={s.dashed ? '6 5' : undefined}
              initial={{ pathLength: 0 }}
              animate={seen ? { pathLength: 1 } : {}}
              transition={{ duration: 1.1, delay: 0.1 + i * 0.15, ease: EASE }}
            />
            {s.points.map(([a, b]) => (
              <motion.circle
                key={a}
                cx={px(a)}
                cy={py(b)}
                r={s.accent ? 4 : 3}
                className={fill}
                initial={{ opacity: 0 }}
                animate={seen ? { opacity: 1 } : {}}
                transition={{ delay: 0.6 + i * 0.15 }}
              />
            ))}
            <motion.text
              x={px(lx) + 10}
              y={(endY.get(i) ?? py(ly)) + 4}
              className={`font-mono text-[11px] ${s.accent ? 'fill-sage' : s.warm ? 'fill-[#b08d57]' : 'fill-zinc-faded'}`}
              initial={{ opacity: 0 }}
              animate={seen ? { opacity: 1 } : {}}
              transition={{ delay: 0.9 + i * 0.15 }}
            >
              {s.name}
            </motion.text>
          </g>
        )
      })}

      {mark && (
        <motion.g initial={{ opacity: 0, scale: 0.6 }} animate={seen ? { opacity: 1, scale: 1 } : {}} transition={{ delay: 1.5 }}>
          <circle cx={px(mark.x)} cy={py(mark.y)} r={10} fill="none" className="stroke-sage" strokeWidth={1.5} />
          <text x={px(mark.x)} y={py(mark.y) - 16} textAnchor="middle" className="fill-sage font-mono text-[11px]">
            {mark.label}
          </text>
        </motion.g>
      )}
    </svg>
  )
}
