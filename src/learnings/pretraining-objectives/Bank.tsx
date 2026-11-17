import { usePlay } from '../../components/explain/useLoop'
import { BANK, LITTLE, VECTORS } from './model'

// Toy word vectors in two dimensions: one fixed vector for bank, as in a
// word-vector table, and the vector it gets inside each of two sentences.

const WIDTH = 360
const HEIGHT = 300
const LEFT = 34
const RIGHT = 14
const TOP = 14
const BOTTOM = 34
const MAX = 1.08
const sx = (x: number) => LEFT + (x / MAX) * (WIDTH - LEFT - RIGHT)
const sy = (y: number) => HEIGHT - BOTTOM - (y / MAX) * (HEIGHT - TOP - BOTTOM)

// Where each labelled word's name goes, beside its dot
const LABELS: Record<string, { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' }> = {
  river: { dx: 8, dy: 4, anchor: 'start' },
  boats: { dx: 8, dy: 4, anchor: 'start' },
  sat: { dx: 8, dy: 4, anchor: 'start' },
  watched: { dx: 8, dy: 4, anchor: 'start' },
  week: { dx: 0, dy: 16, anchor: 'middle' },
  money: { dx: -8, dy: -6, anchor: 'end' },
  paid: { dx: -8, dy: -2, anchor: 'end' },
  earned: { dx: -8, dy: 8, anchor: 'end' },
}

const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
]

export default function Bank() {
  const t = usePlay(1, 1400)
  const ease = 1 - (1 - t) ** 3
  const river = lerp(BANK.still, BANK.river, ease)
  const money = lerp(BANK.still, BANK.money, ease)
  const named = Object.keys(LABELS)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto w-full max-w-[30rem]"
      role="img"
      aria-label="Toy two-dimensional word vectors: money words to the right, water words at the top. The fixed vector for bank sits between them. Inside the river sentence bank moves up and left toward river and boats; inside the money sentence it moves down and right toward money and paid."
    >
      <line x1={LEFT} x2={WIDTH - RIGHT} y1={sy(0)} y2={sy(0)} className="stroke-zinc-300" strokeWidth={1.5} />
      <line x1={sx(0)} x2={sx(0)} y1={TOP} y2={sy(0)} className="stroke-zinc-300" strokeWidth={1.5} />
      <text x={WIDTH - RIGHT} y={HEIGHT - 10} textAnchor="end" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        About money →
      </text>
      <text
        x={0}
        y={0}
        transform={`translate(${LEFT - 14} ${sy(0)}) rotate(-90)`}
        className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest"
      >
        About water →
      </text>

      {/* The other words of the two sentences */}
      {Object.entries(VECTORS)
        .filter(([w]) => w !== 'bank')
        .map(([w, [x, y]]) => (
          <circle key={w} cx={sx(x)} cy={sy(y)} r={3.5} className="fill-ink" fillOpacity={0.45} />
        ))}
      {named.map((w) => {
        const [x, y] = VECTORS[w]
        const l = LABELS[w]
        return (
          <text key={w} x={sx(x) + l.dx} y={sy(y) + l.dy} textAnchor={l.anchor} className="fill-zinc-faded font-mono text-[11px]">
            {w}
          </text>
        )
      })}
      <text x={sx(0.02)} y={sy(0.17)} className="fill-zinc-faded font-mono text-[11px]">
        {LITTLE.length} little words
      </text>

      {/* bank: one fixed vector, and where each sentence moves it */}
      <line x1={sx(BANK.still[0])} y1={sy(BANK.still[1])} x2={sx(river[0])} y2={sy(river[1])} className="stroke-sage" strokeWidth={1.5} strokeDasharray="4 3" />
      <line x1={sx(BANK.still[0])} y1={sy(BANK.still[1])} x2={sx(money[0])} y2={sy(money[1])} className="stroke-ink" strokeWidth={1.5} strokeDasharray="4 3" />
      <circle cx={sx(BANK.still[0])} cy={sy(BANK.still[1])} r={7} className="fill-paper stroke-ink" strokeWidth={2} />
      <text x={sx(BANK.still[0])} y={sy(BANK.still[1]) - 14} textAnchor="middle" className="fill-ink font-mono text-[11px]">
        bank, one vector
      </text>
      <circle cx={sx(river[0])} cy={sy(river[1])} r={6.5} className="fill-sage" />
      <circle cx={sx(money[0])} cy={sy(money[1])} r={6.5} className="fill-ink" />
      {t >= 1 && (
        <>
          <text x={sx(river[0])} y={sy(river[1]) + 20} textAnchor="middle" className="fill-sage-ink font-mono text-[11px]">
            bank by the river
          </text>
          <text x={sx(money[0])} y={sy(money[1]) + 20} textAnchor="middle" className="fill-ink font-mono text-[11px]">
            bank for money
          </text>
        </>
      )}
    </svg>
  )
}
