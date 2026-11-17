import { lerp, usePlay } from '../../components/explain/useLoop'
import { formatRows, HOST_DAYS, HOSTS, isPisces, MARCH, monthOf, MONTHS, NEIGHBOUR_DAYS, NEIGHBOURS, STORY } from './model'

export type Scene = 'room' | 'months' | 'pairs' | 'pisces-guess' | 'pisces' | 'reveal'

// The drawing, in SVG units: twelve month columns, the hosts' party
// stacked up from the month names and the party next door hanging below
const WIDTH = 640
const HEIGHT = 284
const LEFT = 20
const COLUMN = 50
const BASE = 150
const STEP = 15
const R = 6
const HOSTS_FLOOR = BASE - 10
const NEIGHBOURS_TOP = BASE + 12
const PRODUCT_Y = 274

const columnX = (month: number) => LEFT + COLUMN / 2 + month * COLUMN
// The k-th guest of a month (from 0), and the height of a guess, in guests
const hostY = (k: number) => HOSTS_FLOOR - (k + 0.5) * STEP
const neighbourY = (k: number) => NEIGHBOURS_TOP + (k + 0.5) * STEP
const guessY = (guests: number) => HOSTS_FLOOR - guests * STEP

// Each guest's spot in a month column, the earliest birthday lowest
function stacked(days: number[]) {
  const order = days.map((day, i) => ({ day, i })).sort((p, q) => p.day - q.day)
  const height = MONTHS.map(() => 0)
  const spots: { month: number; k: number }[] = []
  for (const { day, i } of order) {
    const month = monthOf(day)
    spots[i] = { month, k: height[month]++ }
  }
  return { spots, height }
}

const HOSTS_STACK = stacked(HOST_DAYS)
const NEIGHBOURS_STACK = stacked(NEIGHBOUR_DAYS)

// Where each host mingles before anyone asks: a loose crowd, 15 to a row
const ROOM = HOST_DAYS.map((_, i) => ({
  x: 68 + (i % 15) * 36 + ((i * 7) % 5) * 3 - 6,
  y: 32 + Math.floor(i / 15) * 30 + ((i * 3) % 4) * 3,
}))

const ease = (t: number) => t * t * (3 - 2 * t)
const label = 'fill-zinc-faded font-mono text-[11px] uppercase tracking-widest'
const dot = {
  plain: 'fill-paper stroke-ink',
  watch: 'fill-sage stroke-sage',
  quiet: 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25',
  next: 'fill-zinc-400 stroke-zinc-400 dark:fill-zinc-200/40 dark:stroke-zinc-200/40',
}

const pairs = MONTHS.map((_, m) => HOSTS_STACK.height[m] * NEIGHBOURS_STACK.height[m])

// What the header says, by scene
const HEADER: Record<Scene, [string, string]> = {
  room: [`A party of ${HOSTS}`, `Guess: ${HOSTS} ÷ 12 = ${STORY.marchGuess} born in March`],
  months: ['Born in each month', `Guess ${STORY.marchGuess} · counted ${STORY.march}`],
  pairs: [
    `${HOSTS} here, ${NEIGHBOURS} next door`,
    `Guess ${HOSTS} × ${NEIGHBOURS} ÷ 12 = ${STORY.pairsGuess} pairs · counted ${STORY.pairs}`,
  ],
  'pisces-guess': ['March and Pisces', `Guess ${HOSTS} × 1/12 × 1/12 = ${formatRows(STORY.piscesGuess)}`],
  pisces: [
    'March and Pisces',
    `Guess ${formatRows(STORY.piscesGuess)} · counted ${STORY.pisces}, ${Math.round(STORY.pisces / STORY.piscesGuess)}× more`,
  ],
  reveal: [
    'R ⋈ S on month',
    `T(R) = ${HOSTS} · T(S) = ${NEIGHBOURS} · V = 12 → ${STORY.pairsGuess} · actual ${STORY.pairs}`,
  ],
}

// The party story, one scene of it, played once from the start; give it a
// `key` per step
export default function Party({ scene }: { scene: Scene }) {
  const t = ease(usePlay(1, scene === 'room' ? 1 : 1400))
  const sorted = scene !== 'room'
  const nextDoor = scene === 'pairs' || scene === 'reveal'
  const pisces = scene === 'pisces-guess' || scene === 'pisces'
  // The hosts move from the crowd into their months only in the first sorted scene
  const move = scene === 'months' ? t : 1
  const [what, numbers] = HEADER[scene]

  const toneOf = (i: number) => {
    const { month } = HOSTS_STACK.spots[i]
    if (pisces) {
      if (month !== MARCH) return dot.quiet
      return scene === 'pisces' && isPisces(HOST_DAYS[i]) && t > 0.3 ? dot.watch : dot.plain
    }
    if (scene === 'months' && month === MARCH && t > 0.9) return dot.watch
    return dot.plain
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="text-zinc-faded">{what}</span>
        <span className="text-ink tabular-nums">{numbers}</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={`${what}: ${numbers}`}>
        {/* The month names, once the guests have sorted themselves */}
        {MONTHS.map((name, m) => (
          <text
            key={name}
            x={columnX(m)}
            y={BASE + 4}
            textAnchor="middle"
            opacity={sorted ? (scene === 'months' ? t : 1) : 0}
            className={`font-mono text-[11px] uppercase tracking-widest ${
              m === MARCH && scene !== 'pairs' && scene !== 'reveal' ? 'fill-sage-ink' : 'fill-zinc-faded'
            }`}
          >
            {name}
          </text>
        ))}

        {/* The guess for March, the same height in every month */}
        {scene === 'months' && t > 0.9 && (
          <g>
            <line
              x1={LEFT}
              x2={LEFT + 12 * COLUMN}
              y1={guessY(STORY.marchGuess)}
              y2={guessY(STORY.marchGuess)}
              className="stroke-ink"
              strokeDasharray="4 4"
            />
            <text x={LEFT + 12 * COLUMN} y={guessY(STORY.marchGuess) - 6} textAnchor="end" className={label}>
              1 in 12 of the room
            </text>
          </g>
        )}
        {pisces && (
          <g>
            <line
              x1={columnX(MARCH) - COLUMN / 2 + 4}
              x2={columnX(MARCH) + COLUMN / 2 - 4}
              y1={guessY(STORY.piscesGuess)}
              y2={guessY(STORY.piscesGuess)}
              className="stroke-ink"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
            {/* Under the month names, where nobody stands in this scene */}
            <text x={columnX(MARCH)} y={BASE + 24} textAnchor="middle" className={label}>
              guess {formatRows(STORY.piscesGuess)}
            </text>
          </g>
        )}

        {/* The hosts */}
        {HOST_DAYS.map((_, i) => {
          const { month, k } = HOSTS_STACK.spots[i]
          const x = lerp(ROOM[i].x, columnX(month), sorted ? move : 0)
          const y = lerp(ROOM[i].y, hostY(k), sorted ? move : 0)
          return <circle key={i} cx={x} cy={y} r={R} className={toneOf(i)} strokeWidth={1.5} />
        })}

        {/* The party next door, and the pairs each month makes */}
        {nextDoor &&
          NEIGHBOUR_DAYS.map((_, i) => {
            const { month, k } = NEIGHBOURS_STACK.spots[i]
            return (
              <circle
                key={i}
                cx={columnX(month)}
                cy={lerp(HEIGHT + 10, neighbourY(k), scene === 'pairs' ? t : 1)}
                r={R}
                className={dot.next}
                strokeWidth={1.5}
              />
            )
          })}
        {nextDoor &&
          pairs.map((n, m) => (
            <text
              key={m}
              x={columnX(m)}
              y={PRODUCT_Y}
              textAnchor="middle"
              opacity={scene === 'pairs' ? Math.max(0, (t - 0.7) / 0.3) : 1}
              className="fill-sage-ink font-mono text-[11px]"
            >
              {n}
            </text>
          ))}

        {scene === 'reveal' && (
          <g>
            <text x={2} y={hostY(0) + 4} className={label}>
              R
            </text>
            <text x={2} y={neighbourY(0) + 4} className={label}>
              S
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
