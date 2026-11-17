import { BAG_ROWS } from './model'

const WIDTH = 640
const HEIGHT = 130
const LEFT = 30
const STEP = (WIDTH - 2 * LEFT) / (BAG_ROWS - 1)
const ROW_Y = 30
const SIDE = 18
const DOT = 5.5
const GAP = 14

// One bootstrap sample of 20 rows. Each square is a row of the data; the
// sage dots under it are how many times the sample drew it. A hollow square
// was never drawn: it is out of the bag for this tree.
export default function Bag({ tally }: { tally: number[] }) {
  const kept = tally.filter((c) => c > 0).length
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`A bootstrap sample of ${BAG_ROWS} draws from ${BAG_ROWS} rows. ${kept} rows were drawn at least once, some of them two or three times; ${BAG_ROWS - kept} were never drawn and are out of the bag.`}
    >
      {tally.map((count, i) => {
        const cx = LEFT + i * STEP
        return (
          <g key={i}>
            <rect
              x={cx - SIDE / 2}
              y={ROW_Y - SIDE / 2}
              width={SIDE}
              height={SIDE}
              rx={5}
              className={count > 0 ? 'fill-ink' : 'fill-paper stroke-ink'}
              strokeWidth={count > 0 ? 0 : 1.5}
            />
            {count === 0 ? (
              <text x={cx} y={ROW_Y + 28} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase">
                out
              </text>
            ) : (
              Array.from({ length: count }, (_, k) => (
                <circle key={k} cx={cx} cy={ROW_Y + 24 + k * GAP} r={DOT} className="fill-sage" />
              ))
            )}
          </g>
        )
      })}
    </svg>
  )
}
