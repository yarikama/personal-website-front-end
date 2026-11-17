import { lerp, useLoop, within } from '../../components/explain/useLoop'

const WIDTH = 560
const HEIGHT = 300
// The sheet of every prediction a line can make, seen from above at an angle
const SHEET = [
  [40, 262],
  [400, 262],
  [530, 172],
  [170, 172],
]
const ORIGIN = [150, 238]
// The prices, standing off the sheet, and the point right below them
const PRICES = [330, 56]
const FOOT = [330, 214]
// Where a guess at the predictions wanders before it settles below the prices
const WANDER = [[470, 242], [215, 246], [420, 188], [285, 205], FOOT]
const SETTLE = 0.62

function along(t: number) {
  const legs = WANDER.length - 1
  const at = Math.min(0.9999, t) * legs
  const i = Math.floor(at)
  const k = at - i
  const e = k * k * (3 - 2 * k)
  return [lerp(WANDER[i][0], WANDER[i + 1][0], e), lerp(WANDER[i][1], WANDER[i + 1][1], e)]
}

// The fit as a shadow: the prices are one point off the sheet of everything
// the features can make; a guess slides about the sheet, its distance to the
// prices shrinking, until it sits straight below them and the leftover meets
// the sheet at a right angle. Loops; with reduced motion, holds the end.
export default function Shadow() {
  const phase = useLoop(9000, 0.9)
  const moving = within(phase, 0, SETTLE)
  const [px, py] = moving === null ? FOOT : along(moving)
  const settled = moving === null

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label="A tilted sheet stands for every set of predictions a line can make. The actual prices are a point above the sheet. A guess slides around the sheet; the closest one is straight below the prices, and the leftover misses meet the sheet at a right angle."
    >
      <polygon
        points={SHEET.map((p) => p.join(',')).join(' ')}
        className="fill-sage/15 stroke-sage"
        strokeWidth={1.5}
      />
      <text x={SHEET[0][0]} y={SHEET[0][1] + 24} className="fill-ink font-mono text-[11px] uppercase tracking-widest">
        The sheet: every prediction a line can make
      </text>

      {/* From the origin: the prices, and the predictions */}
      <line x1={ORIGIN[0]} y1={ORIGIN[1]} x2={PRICES[0]} y2={PRICES[1]} className="stroke-ink" strokeWidth={2} />
      <line x1={ORIGIN[0]} y1={ORIGIN[1]} x2={px} y2={py} className="stroke-sage" strokeWidth={2.5} />
      <circle cx={ORIGIN[0]} cy={ORIGIN[1]} r={3.5} className="fill-ink" />

      {/* The leftover misses: from the guess up to the prices */}
      <line
        x1={px}
        y1={py}
        x2={PRICES[0]}
        y2={PRICES[1]}
        className={settled ? 'stroke-ink' : 'stroke-zinc-400'}
        strokeWidth={settled ? 2 : 1.5}
        strokeDasharray="5 5"
      />
      {settled && (
        <path
          d={`M${FOOT[0] - 13},${FOOT[1]} L${FOOT[0] - 13},${FOOT[1] - 13} L${FOOT[0]},${FOOT[1] - 13}`}
          className="fill-none stroke-ink"
          strokeWidth={1.25}
        />
      )}

      <circle cx={PRICES[0]} cy={PRICES[1]} r={6} className="fill-ink" />
      <text x={PRICES[0] + 12} y={PRICES[1] + 4} className="fill-ink font-mono text-[11px] uppercase tracking-widest">
        y: the five prices
      </text>
      <circle cx={px} cy={py} r={6} className="fill-sage stroke-paper" strokeWidth={2} />
      <text x={px + 12} y={py + 18} className="fill-ink font-mono text-[11px] uppercase tracking-widest">
        {settled ? 'Xw: the best predictions' : 'Xw: a guess'}
      </text>
      <text
        x={(px + PRICES[0]) / 2 + 10}
        y={(py + PRICES[1]) / 2 + 4}
        className="fill-ink font-mono text-[11px] uppercase tracking-widest"
      >
        {settled ? 'leftover: at a right angle' : 'leftover'}
      </text>
    </svg>
  )
}
