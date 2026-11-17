import { Readout } from '../../components/explain/figure'
import { LAB, LAB_RATINGS, miss as missText, thousands, type LabRun } from './model'
import { shade } from './paint'

const WIDTH = 560
const HEIGHT = 300
const SIZE = LAB.size
const CELL = 12.5
const SPAN = SIZE * CELL
const LEFT = 12
const RIGHT = WIDTH - 12 - SPAN
const TOP = 34
// Shade over the ratings the grid actually holds, for contrast
const LOW = Math.min(...LAB_RATINGS.values)
const HIGH = Math.max(...LAB_RATINGS.values)
const tone = (rating: number) => shade(rating, LOW, HIGH)
// A miss this many stars fills a cell's dot to the edge
const FULL_MISS = 1

// The lab: the ratings you were given on the left, and on the right every
// cell's guess, with a dot on each hidden cell as big as its miss
export default function CompletionLab({ run }: { run: LabRun }) {
  const { seen, guesses, seenCount, missSeen, missHidden, numbers } = run
  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Left: a ${SIZE} by ${SIZE} grid of ratings with ${seenCount} cells given. Right: the filled grid; the guesses for the hidden cells miss by ${missText(missHidden)} stars on average, against ${missText(missSeen)} on the given ones.`}
      >
        <text x={LEFT} y={20} className="fill-ink font-mono text-[11px] uppercase tracking-widest">
          Given
        </text>
        <text x={RIGHT} y={20} className="fill-ink font-mono text-[11px] uppercase tracking-widest">
          Filled in
        </text>
        {[LEFT, RIGHT].map((x0) => (
          <rect key={x0} x={x0 - 1} y={TOP - 1} width={SPAN + 2} height={SPAN + 2} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
        ))}
        {Array.from({ length: SIZE * SIZE }, (_, c) => {
          const i = Math.floor(c / SIZE)
          const j = c % SIZE
          const y = TOP + i * CELL
          const miss = Math.abs(guesses[c] - LAB_RATINGS.values[c])
          const r = Math.min(1, miss / FULL_MISS) * (CELL / 2 - 1)
          return (
            <g key={c}>
              {seen[c] ? (
                <rect x={LEFT + j * CELL + 0.6} y={y + 0.6} width={CELL - 1.2} height={CELL - 1.2} className="fill-sage" opacity={tone(LAB_RATINGS.values[c])} />
              ) : (
                <rect x={LEFT + j * CELL + 3.5} y={y + 3.5} width={CELL - 7} height={CELL - 7} rx={1.5} className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25" />
              )}
              <rect x={RIGHT + j * CELL + 0.6} y={y + 0.6} width={CELL - 1.2} height={CELL - 1.2} className="fill-sage" opacity={tone(guesses[c])} />
              {!seen[c] && r > 0.6 && <circle cx={RIGHT + j * CELL + CELL / 2} cy={y + CELL / 2} r={r} className="fill-ink" />}
            </g>
          )
        })}
      </svg>
      <p className="mt-3 font-mono text-[0.875rem] text-zinc-faded">
        Deeper sage, a higher rating. A dot is a hidden cell’s miss: a full one is {FULL_MISS} star or more.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Readout label="Ratings given" value={thousands(seenCount)} />
        <Readout label="Numbers to fit" value={thousands(numbers)} />
        <Readout label="Miss on given" value={missText(missSeen)} />
        <Readout label="Miss on hidden" value={missText(missHidden)} accent />
      </div>
    </div>
  )
}
