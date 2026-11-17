import { trips } from './model'

const WIDTH = 480
const HEIGHT = 230
const PLOT = { left: 40, right: 466, top: 30, bottom: 196 }
// The y axis is fixed, so a longer sentence's bars grow instead of rescaling
const MAX_STEPS = 60
const TICKS = [0, 20, 40, 60]
const MAX_WORDS = 30

const yOf = (steps: number) => PLOT.bottom - (steps / MAX_STEPS) * (PLOT.bottom - PLOT.top)

// The lab: for a sentence of `length` words, how many steps lie between
// French word k and English word k, for every k, read forwards or backwards.
// The first pair is in sage.
export default function Trips({ length, reversed }: { length: number; reversed: boolean }) {
  const all = trips(length, reversed)
  const slot = (PLOT.right - PLOT.left) / MAX_WORDS
  const barW = Math.max(4, slot - 4)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`Steps between each French word and the English word in the same place, for a ${length}-word sentence read ${reversed ? 'backwards' : 'forwards'}: from ${Math.min(...all)} to ${Math.max(...all)}.`}
    >
      {TICKS.map((t) => (
        <g key={t}>
          <line x1={PLOT.left} x2={PLOT.right} y1={yOf(t)} y2={yOf(t)} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={1} />
          <text x={PLOT.left - 8} y={yOf(t) + 4} textAnchor="end" className="fill-zinc-faded font-mono text-[11px]">
            {t}
          </text>
        </g>
      ))}
      {all.map((steps, k) => {
        const x = PLOT.left + k * slot + (slot - barW) / 2
        return (
          <rect
            key={k}
            x={x}
            y={yOf(steps)}
            width={barW}
            height={PLOT.bottom - yOf(steps)}
            rx={2}
            className={k === 0 ? 'fill-sage' : 'fill-ink'}
            fillOpacity={k === 0 ? 1 : 0.4}
          />
        )
      })}
      <text x={PLOT.left + (barW + slot) / 2 + 4} y={yOf(all[0]) - 6} className="fill-sage-ink font-mono text-[11px]">
        {all[0]}
      </text>
      <text x={PLOT.left} y={HEIGHT - 8} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        Word pair 1 to {length}
      </text>
      <text x={12} y={12} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        Steps apart
      </text>
    </svg>
  )
}
