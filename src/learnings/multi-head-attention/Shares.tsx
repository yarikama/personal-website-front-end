import { usePlay } from '../../components/explain/useLoop'
import { finePct, pick, softmax } from './model'

const WIDTH = 470
const TOP = 46
const ROW = 32
const BAR = 16
// The score lane: a signed bar about its middle
const LABEL = 54
const MID = 150
const HALF = 86
// Scores past this are drawn to the edge, with their number beside
const REACH = 24
const SCORE_TEXT = 284
// The share lane
const SHARE = 296
const SHARE_W = 76
// ms for the bars to grow
const GROW = 600

const signed = (x: number, digits: number) => {
  const text = Math.abs(x).toFixed(digits)
  return Number(text) === 0 ? '0' : x > 0 ? `+${text}` : `−${text}`
}

// One person's attention shared between six strangers: each one's score
// (the tally, or the tally ÷ √d) and the share the softmax gives it.
// `nudge` lowers the leader's score by one point and shows its share
// before, faint, and after. `named` relabels it as attention.
export default function Shares({
  tallies,
  d,
  scaled,
  nudge = false,
  named = false,
}: {
  tallies: number[]
  d: number
  scaled: boolean
  nudge?: boolean
  named?: boolean
}) {
  const grown = usePlay(1, GROW)
  const { scores, weights, top } = pick(tallies, d, scaled)
  const leader = weights.indexOf(top)
  const after = nudge ? softmax(scores.map((s, i) => (i === leader ? s - 1 : s))) : weights
  const shown = nudge ? after : weights
  const height = TOP + tallies.length * ROW + 4
  const root = Math.sqrt(d)
  const scoreHead = named
    ? scaled
      ? `q·k ÷ ${root}`
      : 'q·k'
    : scaled
      ? `Tally ÷ ${root}`
      : 'Tally'

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="mx-auto w-full max-w-[36rem]"
      role="img"
      aria-label={`Six ${named ? 'keys' : 'strangers'} on a ${d}-question ${named ? 'dot product' : 'quiz'}, with scores ${scores
        .map((s) => signed(s, scaled ? 2 : 0))
        .join(', ')} and shares ${shown.map((w) => finePct(w)).join(', ')}.`}
    >
      <text x={MID} y={16} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {scoreHead}
      </text>
      <text x={SHARE} y={16} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {named ? 'Attention weight' : 'Share'}
      </text>
      <text x={MID - HALF} y={34} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] tabular-nums">
        −{REACH}
      </text>
      <text x={MID + HALF} y={34} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] tabular-nums">
        +{REACH}
      </text>
      <text x={MID} y={34} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] tabular-nums">
        0
      </text>

      {scores.map((s, i) => {
        const y = TOP + i * ROW + ROW / 2
        const score = nudge && i === leader ? s - 1 : s
        const width = (Math.min(Math.abs(score), REACH) / REACH) * HALF * grown
        const isLeader = i === leader
        return (
          <g key={i}>
            <text
              x={LABEL - 10}
              y={y + 4}
              textAnchor="end"
              className={`font-mono text-[11px] uppercase tracking-widest ${isLeader ? 'fill-ink' : 'fill-zinc-faded'}`}
            >
              {named ? `k${i + 1}` : 'ABCDEF'[i]}
            </text>
            <rect x={MID - HALF} y={y - BAR / 2} width={2 * HALF} height={BAR} rx={2} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
            <line x1={MID} x2={MID} y1={y - BAR / 2 - 3} y2={y + BAR / 2 + 3} className="stroke-zinc-400" />
            {width > 0.2 && (
              <rect
                x={score >= 0 ? MID : MID - width}
                y={y - BAR / 2}
                width={width}
                height={BAR}
                rx={2}
                className="fill-ink"
                fillOpacity={score >= 0 ? 0.7 : 0.35}
              />
            )}
            <text x={SCORE_TEXT} y={y + 4} textAnchor="end" className="fill-ink font-mono text-[11px] tabular-nums">
              {signed(score, scaled ? 2 : 0)}
            </text>

            <rect x={SHARE} y={y - BAR / 2} width={SHARE_W} height={BAR} rx={2} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
            {nudge && isLeader && (
              <rect x={SHARE} y={y - BAR / 2} width={weights[i] * SHARE_W * grown} height={BAR} rx={2} className="fill-sage" fillOpacity={0.35} />
            )}
            <rect
              x={SHARE}
              y={y - BAR / 2}
              width={shown[i] * SHARE_W * grown}
              height={BAR}
              rx={2}
              className={isLeader ? 'fill-sage' : 'fill-ink'}
              fillOpacity={isLeader ? 1 : 0.45}
            />
            <text
              x={WIDTH - 2}
              y={y + 4}
              textAnchor="end"
              className={`font-mono text-[11px] tabular-nums ${isLeader ? 'fill-sage-ink' : 'fill-ink'}`}
            >
              {nudge && isLeader ? `${finePct(weights[i])}→` : ''}
              {finePct(shown[i])}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
