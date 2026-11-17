import { lerp, usePlay } from '../../components/explain/useLoop'
import { ADDING, FIRST, FRIENDS, layerNorm, REWRITING, ROUNDS, spread, START, TOPICS, WORDS, type Mat } from './model'

export type Show = 'start' | 'meet' | 'add' | 'even' | 'alone' | 'rounds' | 'named'

// Four columns, one a friend, each with two little bar charts: the notebook
// on top, and the change it gets (or the rewritten notebook) below
const WIDTH = 460
const HEIGHT = 368
const COL = WIDTH / FRIENDS.length
const BAR = 16
const GAP = 6
const NAME_Y = 56
const NOTEBOOK = 164 // the notebook's zero line
const CHANGE = 292 // the lower chart's zero line
const PX = 18 // pixels a unit
const LIMIT = 4.9 // units, either side of zero, before a bar is cut off
const PACE = 1100 // ms for one tween
const ROUND_PACE = 650 // ms a round, in the six-round step

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const mix = (a: Mat, b: Mat, t: number): Mat => a.map((row, i) => row.map((v, j) => lerp(v, b[i][j], t)))
const zero = START.map((row) => row.map(() => 0))
const centre = (i: number) => COL * i + COL / 2
// Each friend's first notes, evened out: what the six rounds are compared with
const FIRST_NOTES = START.map((row) => layerNorm(row))

// Bars for one friend's four numbers around a zero line
function Bars({ values, zeroY, x, tone, outline }: { values: number[]; zeroY: number; x: number; tone: 'ink' | 'sage'; outline?: number[] }) {
  const left = x - (values.length * BAR + (values.length - 1) * GAP) / 2
  return (
    <g>
      <line x1={left - 4} x2={left + values.length * (BAR + GAP) - GAP + 4} y1={zeroY} y2={zeroY} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      {values.map((v, j) => {
        const h = Math.min(LIMIT, Math.abs(v)) * PX
        const bx = left + j * (BAR + GAP)
        return (
          <rect
            key={j}
            x={bx}
            y={v >= 0 ? zeroY - h : zeroY}
            width={BAR}
            height={Math.max(h, 0.5)}
            rx={3}
            className={tone === 'sage' ? 'fill-sage' : 'fill-ink'}
            fillOpacity={tone === 'sage' ? 0.85 : 0.7}
          />
        )
      })}
      {outline?.map((v, j) => {
        const h = Math.min(LIMIT, Math.abs(v)) * PX
        const bx = left + j * (BAR + GAP)
        return (
          <rect
            key={`o${j}`}
            x={bx - 1.5}
            y={v >= 0 ? zeroY - h : zeroY}
            width={BAR + 3}
            height={Math.max(h, 0.5)}
            rx={3}
            className="fill-none stroke-ink"
            strokeOpacity={0.55}
            strokeDasharray="3 3"
          />
        )
      })}
    </g>
  )
}

// The story's figure: four friends' notebooks through one round of a
// Transformer block, then six. Give it a `key` per step so each step plays
// from the start.
export default function Round({ show }: { show: Show }) {
  const span = show === 'rounds' ? ROUNDS - 1 : 1
  const played = usePlay(span, show === 'rounds' ? ROUND_PACE : PACE)
  const t = ease(Math.min(1, played))
  const named = show === 'named'

  // What the notebooks show, the outline of where they were, and the lower chart
  let notebook: Mat = START
  let outline: Mat | undefined
  let lower: Mat | undefined
  let lowerTone: 'ink' | 'sage' = 'sage'
  let lowerLabel = ''
  let round = 1
  if (show === 'meet') {
    lower = mix(zero, FIRST.heard, t)
    lowerLabel = 'What each one heard'
  } else if (show === 'add') {
    notebook = mix(START, FIRST.added, t)
    outline = START
    lower = FIRST.heard
    lowerLabel = 'What each one heard'
  } else if (show === 'even') {
    notebook = mix(FIRST.added, FIRST.evened, t)
    outline = FIRST.added
  } else if (show === 'alone') {
    notebook = mix(FIRST.evened, FIRST.output, t)
    outline = FIRST.evened
    lower = mix(zero, FIRST.thought, Math.min(1, 2 * t))
    lowerLabel = 'What each one thought alone'
  } else if (show === 'rounds' || named) {
    // Round k's notebooks, tweened from the round before; the reveal shows the last
    const k = named ? ROUNDS - 1 : Math.min(ROUNDS - 1, Math.floor(played))
    const within = named ? 1 : ease(played - k)
    const at = (rounds: typeof ADDING) => (k >= ROUNDS - 1 ? rounds[ROUNDS - 1].output : mix(rounds[k].output, rounds[k + 1].output, within))
    notebook = at(ADDING)
    lower = at(REWRITING)
    outline = FIRST_NOTES
    lowerTone = 'ink'
    lowerLabel = named ? 'Without residual connections' : 'Had they rewritten instead'
    round = Math.min(ROUNDS, k + 1 + (within > 0.5 ? 1 : 0))
  }

  const topLabel = named ? 'Each word’s vector' : show === 'rounds' ? `Notebooks after round ${round} of ${ROUNDS}` : 'Notebooks'
  const spreads = notebook.map(spread)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto w-full max-w-[36rem]"
      role="img"
      aria-label={
        named
          ? 'Four words, each with a vector of four numbers, after six Transformer blocks: with residual connections each vector keeps its own pattern; without them all four vectors are the same.'
          : 'Four friends, each with a notebook of four scores, shown as bars, going through a round of meeting, adding, evening out and thinking alone.'
      }
    >
      {/* Everyone listens to everyone at the meeting */}
      {show === 'meet' &&
        FRIENDS.flatMap((_, i) =>
          FRIENDS.map((__, j) => {
            if (j <= i) return null
            const x1 = centre(i)
            const x2 = centre(j)
            const lift = 12 + 9 * (j - i)
            return (
              <path
                key={`${i}-${j}`}
                d={`M${x1},${NAME_Y - 16} C${x1},${NAME_Y - 16 - lift} ${x2},${NAME_Y - 16 - lift} ${x2},${NAME_Y - 16}`}
                className="fill-none stroke-sage"
                strokeWidth={1.6}
                strokeOpacity={t}
              />
            )
          }),
        )}

      <text x={4} y={NAME_Y + 24} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        {topLabel}
      </text>
      {outline && (
        <text x={WIDTH / 2} y={HEIGHT - 24} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
          {show === 'rounds' || named ? 'dashed: first notes, evened out' : 'dashed: before this step'}
        </text>
      )}
      {lower && (
        <text x={4} y={CHANGE - 52} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          {lowerLabel}
        </text>
      )}

      {FRIENDS.map((friend, i) => (
        <g key={friend}>
          <text x={centre(i)} y={NAME_Y} textAnchor="middle" className="fill-ink font-mono text-[12px]">
            {named ? WORDS[i] : friend}
          </text>
          <Bars values={notebook[i]} zeroY={NOTEBOOK} x={centre(i)} tone="ink" outline={outline?.[i]} />
          {show === 'even' && (
            <text x={centre(i)} y={NOTEBOOK + 80} textAnchor="middle" className="fill-ink font-mono text-[10px] tabular-nums">
              spread {spreads[i].toFixed(2)}
            </text>
          )}
          {lower && <Bars values={lower[i]} zeroY={CHANGE} x={centre(i)} tone={lowerTone} />}
        </g>
      ))}

      <text x={WIDTH / 2} y={HEIGHT - 6} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
        {named ? 'bars: the four numbers of each word’s vector' : `bars, left to right: ${TOPICS.join(' · ')}`}
      </text>
    </svg>
  )
}
