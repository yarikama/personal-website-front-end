import { at, PER_SWEEP, type Run } from './model'

const WIDTH = 600
const HEIGHT = 340
const LEFT = 68
const RIGHT = 584
// The values' panel: how far off, on a log scale from 30 turns to 0.001
const OFF_TOP = 28
const OFF_BOTTOM = 170
const HIGH = Math.log10(30)
const LOW = -3
// The moves' panel: how many squares want the other move, 0 to 16
const MOVES_TOP = 222
const MOVES_BOTTOM = 296
const MOST = 16

const yOff = (off: number) => {
  const clamped = Math.min(HIGH, Math.max(LOW, Math.log10(Math.max(off, 1e-9))))
  return OFF_TOP + ((HIGH - clamped) / (HIGH - LOW)) * (OFF_BOTTOM - OFF_TOP)
}
const yMoves = (count: number) => MOVES_BOTTOM - (Math.min(count, MOST) / MOST) * (MOVES_BOTTOM - MOVES_TOP)

// Ticks for the sweeps' axis: about five, on round numbers
function ticks(sweeps: number) {
  const step = [1, 2, 5, 10, 20].find((s) => sweeps / s <= 6) ?? 20
  return Array.from({ length: Math.floor(sweeps / step) + 1 }, (_, i) => i * step)
}

// The two jobs' unfinished work over a run, sweep by sweep: on top, how far
// the values are from the current way of playing's own values (judging
// drives it down, a switch can throw it up); underneath, how many squares
// would rather take the other move (a switch clears it, judging can raise
// it). Drawn up to `upTo` square updates; the rest of the run faint, with
// `ghost`. A faint line wherever an improvement switched something,
// unless switches come so thick (one square at a time) that they blur.
export default function Gaps({ run, upTo, ghost = true }: { run: Run; upTo: number; ghost?: boolean }) {
  const sweeps = Math.max(1, run.updates / PER_SWEEP)
  const xOf = (updates: number) => LEFT + (updates / PER_SWEEP / sweeps) * (RIGHT - LEFT)
  const now = at(run, upTo)
  const moments = run.moments
  const shown = moments.slice(0, now + 1)

  const offLine = (list: typeof moments) => list.map((m) => `${xOf(m.updates).toFixed(1)},${yOff(m.off).toFixed(1)}`).join(' ')
  // Unhappy squares as a staircase: a count holds until the next moment
  const movesLine = (list: typeof moments) =>
    list
      .flatMap((m, i) => {
        const x = xOf(m.updates).toFixed(1)
        const y = yMoves(m.unhappy.length).toFixed(1)
        const before = i > 0 ? yMoves(list[i - 1].unhappy.length).toFixed(1) : y
        return [`${x},${before}`, `${x},${y}`]
      })
      .join(' ')

  const switches = shown.filter((m) => m.kind === 'improve')
  const here = moments[now]
  const cursor = xOf(Math.min(upTo, run.updates))

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`Over ${Math.round(sweeps)} sweeps' worth of updates: how far the values are from the way of playing's own values, falling while judging and jumping at each switch; and how many squares want the other move, rising while judging and dropping to none at each switch. Both end at zero.`}
    >
      {/* Panel titles */}
      <text x={LEFT} y={OFF_TOP - 12} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        Values off by · turns
      </text>
      <text x={LEFT} y={MOVES_TOP - 12} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        Squares wanting the other move
      </text>

      {/* Scaffolding */}
      {[10, 1, 0.1, 0.01, 0.001].map((off) => (
        <g key={off}>
          <line x1={LEFT} x2={RIGHT} y1={yOff(off)} y2={yOff(off)} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
          {/* Every other decade, so the labels have room on a phone */}
          {off !== 1 && off !== 0.01 && (
            <text x={LEFT - 8} y={yOff(off) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
              {off}
            </text>
          )}
        </g>
      ))}
      {[0, 16].map((count) => (
        <g key={count}>
          <line
            x1={LEFT}
            x2={RIGHT}
            y1={yMoves(count)}
            y2={yMoves(count)}
            className="stroke-zinc-200 dark:stroke-zinc-200/10"
          />
          <text x={LEFT - 8} y={yMoves(count) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
            {count}
          </text>
        </g>
      ))}
      {ticks(sweeps).slice(1).map((sweep) => (
        <text
          key={sweep}
          x={xOf(sweep * PER_SWEEP)}
          y={MOVES_BOTTOM + 18}
          textAnchor="middle"
          className="fill-zinc-400 font-mono text-[11px]"
        >
          {sweep}
        </text>
      ))}
      <text
        x={RIGHT}
        y={HEIGHT - 2}
        textAnchor="end"
        className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest"
      >
        sweeps’ worth of updates
      </text>

      {/* Where improvements switched a move */}
      {switches.length <= 12 &&
        switches.map((m, i) => (
        <line
          key={i}
          x1={xOf(m.updates)}
          x2={xOf(m.updates)}
          y1={OFF_TOP}
          y2={MOVES_BOTTOM}
          className="stroke-zinc-300 dark:stroke-zinc-200/20"
          strokeDasharray="2 3"
        />
        ))}

      {/* The whole run, faint */}
      {ghost && (
        <g className="stroke-zinc-300 dark:stroke-zinc-200/20" fill="none" strokeWidth={1.25}>
          <polyline points={offLine(moments)} />
          <polyline points={movesLine(moments)} />
        </g>
      )}

      {/* Up to now */}
      <polyline points={offLine(shown)} fill="none" className="stroke-sage" strokeWidth={2.25} />
      <polyline points={movesLine(shown)} fill="none" className="stroke-ink" strokeWidth={2} />
      <circle cx={xOf(here.updates)} cy={yOff(here.off)} r={4} className="fill-sage" />
      <circle cx={xOf(here.updates)} cy={yMoves(here.unhappy.length)} r={4} className="fill-ink" />
      {upTo > 0 && upTo < run.updates && (
        <line x1={cursor} x2={cursor} y1={OFF_TOP} y2={MOVES_BOTTOM} className="stroke-zinc-400" strokeWidth={1} />
      )}
    </svg>
  )
}
