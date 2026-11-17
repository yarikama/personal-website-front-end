import { COUNTS, noiseShares, pct, VOCAB } from './model'

// Each word's chance of being drawn as a noise word: the outline is its
// share of the text (plain counts), the sage bar its chance with the counts
// raised to `power`. Most common word first.

const WIDTH = 440
const ROW = 17
const TOP = 8
const NAMES = 84
const LEFT = 92
const RIGHT = 390
const MOST = 0.25

const ORDER = VOCAB.map((word, i) => ({ word, count: COUNTS[i], i })).sort((a, b) => b.count - a.count)
const w = (share: number) => (share / MOST) * (RIGHT - LEFT)

export default function Noise({ power }: { power: number }) {
  const plain = noiseShares(1)
  const shares = noiseShares(power)
  const height = TOP + ROW * ORDER.length + 4
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="w-full"
      role="img"
      aria-label={`Each word's chance of being drawn as a noise word with counts raised to the power ${power}: the is ${pct(shares[0], 1)}, against ${pct(plain[0], 1)} of the text.`}
    >
      {ORDER.map(({ word, count, i }, row) => {
        const y = TOP + row * ROW
        return (
          <g key={word}>
            <text x={NAMES} y={y + 11} textAnchor="end" className="fill-ink font-mono text-[11px]">
              {word} {count}
            </text>
            <rect x={LEFT} y={y + 2} width={w(shares[i])} height={ROW - 5} rx={2} className="fill-sage" />
            <rect
              x={LEFT}
              y={y + 2}
              width={w(plain[i])}
              height={ROW - 5}
              rx={2}
              className="fill-none stroke-ink"
              strokeOpacity={0.6}
              strokeWidth={1}
            />
            <text
              x={LEFT + Math.max(w(shares[i]), w(plain[i])) + 5}
              y={y + 11}
              className="fill-zinc-faded font-mono text-[11px] tabular-nums"
            >
              {pct(shares[i], 1)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
