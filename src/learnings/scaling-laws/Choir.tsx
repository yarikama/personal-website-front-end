import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import {
  BEST_CHOIR,
  BIG_CHOIR,
  CHOIR_BUDGET,
  hoursFor,
  practiceFlaw,
  sci,
  SINGER_HOURS,
  SMALL_CHOIR,
  thinFlaw,
  totalFlaw,
  whole,
} from './model'

const WIDTH = 640
const HEIGHT = 320
const PLOT = { left: 58, right: 470, top: 24, bottom: 250 }
const SINGERS = { low: 2, high: 4000 }
const FLAW = { low: 0.018, high: 0.6 }
const Y_TICKS = [0.03, 0.1, 0.3]
const X_TICKS = [10, 100, 1000]
const BAR = { left: 524, width: 36, top: 60, scale: 0.2 }
const PLAY_MS = 1600
// Where the dashed line's label sits, below the line, in singers
const PRACTICE_LABEL_AT = 600

export type Scene = 'budget' | 'big' | 'lines' | 'walk' | 'valley' | 'named'

// Where the split starts and ends in each scene, in singers
const MOVES: Record<Scene, [number, number]> = {
  budget: [BIG_CHOIR, BIG_CHOIR],
  big: [BIG_CHOIR, BIG_CHOIR],
  lines: [BIG_CHOIR, BIG_CHOIR],
  walk: [BIG_CHOIR, SMALL_CHOIR],
  valley: [SMALL_CHOIR, BEST_CHOIR],
  named: [BEST_CHOIR, BEST_CHOIR],
}
const ORDER: Scene[] = ['budget', 'big', 'lines', 'walk', 'valley', 'named']
const from = (scene: Scene, step: Scene) => ORDER.indexOf(scene) >= ORDER.indexOf(step)

const x = (singers: number) =>
  PLOT.left + ((Math.log(singers) - Math.log(SINGERS.low)) / (Math.log(SINGERS.high) - Math.log(SINGERS.low))) * (PLOT.right - PLOT.left)
const y = (flaw: number) =>
  PLOT.bottom - ((Math.log(flaw) - Math.log(FLAW.low)) / (Math.log(FLAW.high) - Math.log(FLAW.low))) * (PLOT.bottom - PLOT.top)

const SAMPLES = Array.from({ length: 121 }, (_, i) => SINGERS.low * (SINGERS.high / SINGERS.low) ** (i / 120))
const path = (f: (singers: number) => number) =>
  SAMPLES.map((s, i) => `${i ? 'L' : 'M'}${x(s).toFixed(1)},${y(f(s)).toFixed(1)}`).join(' ')
const THIN_PATH = path(thinFlaw)
const PRACTICE_PATH = path(practiceFlaw)
const TOTAL_PATH = path(totalFlaw)

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

// 300 → "300B", 8,400 → "8.4T", in billions
const billions = (v: number) => (v >= 1000 ? `${Number((v / 1000).toFixed(1))}T` : `${Math.round(v)}B`)

// The choir story: a budget of singer-hours split between singers and hours,
// the two flaws each split leaves on log–log axes, and their total. In the
// last scene the same drawing is relabelled as a language model.
export default function Choir({ scene }: { scene: Scene }) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [t, setT] = useState(reducedMotion ? 1 : 0)

  useAnimationFrame((time) => {
    if (t >= 1) return
    started.current ??= time
    setT(Math.min(1, (time - started.current) / PLAY_MS))
  })

  const named = scene === 'named'
  const [start, end] = MOVES[scene]
  const singers = Math.exp(Math.log(start) + (Math.log(end) - Math.log(start)) * ease(t))
  const hours = hoursFor(singers)
  const thin = thinFlaw(singers)
  const practice = practiceFlaw(singers)
  const showFlaws = from(scene, 'big')
  const showLines = from(scene, 'lines')
  const showTotal = from(scene, 'valley')
  const fadeIn = (first: Scene) => (scene === first ? t : 1)

  const words = named
    ? { thin: 'too few parameters', practice: 'too few tokens', total: 'loss above the floor', top: 'parameters', bottom: 'tokens', bar: 'loss' }
    : { thin: 'thin sound', practice: 'wrong notes', total: 'total flaws', top: 'singers', bottom: 'hours each', bar: 'flaws' }

  const barHeight = (flaw: number) => (flaw / BAR.scale) * (PLOT.bottom - BAR.top)
  const thinTop = PLOT.bottom - barHeight(thin)
  const totalTop = thinTop - barHeight(practice)

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="text-zinc-faded">{named ? `Compute: ${sci(CHOIR_BUDGET)} FLOPs` : `${whole(SINGER_HOURS)} singer-hours`}</span>
        <span className="text-ink tabular-nums">
          {named
            ? `${billions(singers)} parameters · ${billions(hours)} tokens`
            : `${Math.round(singers)} singers · ${whole(hours)} hours`}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-3 w-full"
        role="img"
        aria-label={
          named
            ? `A language model on a budget of ${sci(CHOIR_BUDGET)} FLOPs: ${billions(singers)} parameters trained on ${billions(hours)} tokens. Its loss above the floor is ${(thin + practice).toFixed(3)}: ${thin.toFixed(3)} for too few parameters and ${practice.toFixed(3)} for too few tokens.`
            : `A choir with ${whole(SINGER_HOURS)} singer-hours: ${Math.round(singers)} singers rehearsing ${whole(hours)} hours each.${showFlaws ? ` Too few voices costs ${thin.toFixed(3)}, too little practice ${practice.toFixed(3)}, ${(thin + practice).toFixed(3)} in all.` : ''}`
        }
      >
        {/* Axes and gridlines */}
        {Y_TICKS.map((v) => (
          <g key={v}>
            <line x1={PLOT.left} x2={PLOT.right} y1={y(v)} y2={y(v)} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeDasharray="2 4" />
            <text x={PLOT.left - 8} y={y(v) + 4} textAnchor="end" className="fill-zinc-faded font-mono text-[10px]">
              {v}
            </text>
          </g>
        ))}
        <line x1={PLOT.left} x2={PLOT.right} y1={PLOT.bottom} y2={PLOT.bottom} className="stroke-zinc-400" />
        <line x1={PLOT.left} x2={PLOT.left} y1={PLOT.top} y2={PLOT.bottom} className="stroke-zinc-400" />
        {X_TICKS.map((s) => (
          <g key={s}>
            <line x1={x(s)} x2={x(s)} y1={PLOT.bottom} y2={PLOT.bottom + 5} className="stroke-zinc-400" />
            <text x={x(s)} y={PLOT.bottom + 20} textAnchor="middle" className="fill-ink font-mono text-[10px]">
              {named ? billions(s) : whole(s)}
            </text>
            <text x={x(s)} y={PLOT.bottom + 36} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
              {named ? billions(hoursFor(s)) : whole(hoursFor(s))}
            </text>
          </g>
        ))}
        <text x={PLOT.right + 6} y={PLOT.bottom + 20} className="fill-ink font-mono text-[10px] uppercase tracking-widest">
          {words.top}
        </text>
        <text x={PLOT.right + 6} y={PLOT.bottom + 36} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          {words.bottom}
        </text>
        <text x={PLOT.left} y={PLOT.top - 10} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          {named ? 'loss above the floor (log scale)' : 'flaw (log scale)'}
        </text>

        {/* Where the budget is split now */}
        <line x1={x(singers)} x2={x(singers)} y1={PLOT.top} y2={PLOT.bottom} className="stroke-zinc-300 dark:stroke-zinc-200/25" />

        {showLines && (
          <g opacity={fadeIn('lines')}>
            <path d={THIN_PATH} className="fill-none stroke-sage" strokeWidth={2} />
            <path d={PRACTICE_PATH} className="fill-none stroke-ink" strokeWidth={1.5} strokeDasharray="6 4" />
            <text x={x(3)} y={y(thinFlaw(3)) - 14} className="fill-sage-ink font-mono text-[10px] uppercase tracking-widest">
              {words.thin}
            </text>
            <text x={x(PRACTICE_LABEL_AT) + 8} y={y(practiceFlaw(PRACTICE_LABEL_AT)) + 26} className="fill-ink font-mono text-[10px] uppercase tracking-widest">
              {words.practice}
            </text>
          </g>
        )}
        {showTotal && (
          <g opacity={fadeIn('valley')}>
            <path d={TOTAL_PATH} className="fill-none stroke-ink" strokeWidth={2.5} />
            <text x={x(BEST_CHOIR)} y={y(totalFlaw(BEST_CHOIR)) - 14} textAnchor="middle" className="fill-ink font-mono text-[10px] uppercase tracking-widest">
              {words.total}
            </text>
          </g>
        )}

        {/* The flaws this split leaves */}
        {showFlaws && (
          <g>
            <circle cx={x(singers)} cy={y(thin)} r={4.5} className="fill-sage" />
            <circle cx={x(singers)} cy={y(practice)} r={4.5} className="fill-paper stroke-ink" strokeWidth={1.5} />
            {showTotal && <circle cx={x(singers)} cy={y(thin + practice)} r={6} className="fill-ink" />}
          </g>
        )}
        {!showFlaws && <circle cx={x(singers)} cy={PLOT.bottom} r={5} className="fill-ink" />}

        {/* The same flaws stacked, on an ordinary scale */}
        {showFlaws && (
          <g>
            <rect x={BAR.left} y={thinTop} width={BAR.width} height={PLOT.bottom - thinTop} className="fill-sage" />
            <rect x={BAR.left} y={totalTop} width={BAR.width} height={thinTop - totalTop} className="fill-ink" fillOpacity={0.55} />
            <line x1={BAR.left - 6} x2={BAR.left + BAR.width + 6} y1={PLOT.bottom} y2={PLOT.bottom} className="stroke-zinc-400" />
            <text x={BAR.left + BAR.width / 2} y={totalTop - 8} textAnchor="middle" className="fill-ink font-mono text-[11px] tabular-nums">
              {(thin + practice).toFixed(3)}
            </text>
            <text x={BAR.left + BAR.width + 6} y={(thinTop + PLOT.bottom) / 2 + 4} className="fill-sage-ink font-mono text-[10px] tabular-nums">
              {thin.toFixed(3)}
            </text>
            <text x={BAR.left + BAR.width + 6} y={(totalTop + thinTop) / 2 + 4} className="fill-ink font-mono text-[10px] tabular-nums">
              {practice.toFixed(3)}
            </text>
            <text x={BAR.left + BAR.width / 2} y={totalTop - 24} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
              {words.bar}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
