import { usePlay } from '../../components/explain/useLoop'
import { LISTS, TRIP, TRIP_PLANS, type List } from './model'

export type TripScene = 'lists' | 'rule' | 'fh' | 'cf' | 'pairs' | 'triple' | 'system'

const WIDTH = 480
const HEIGHT = 340

// The three lists across the top: where each starts, its dots in rows of 10
const LIST_X: Record<List, number> = { concerts: 16, flights: 176, rooms: 336 }
const DOT = 8
const PITCH = 12
const DOTS_Y = 36
const dotAt = (list: List, i: number) => ({ x: LIST_X[list] + (i % 10) * PITCH, y: DOTS_Y + Math.floor(i / 10) * PITCH })

// One example trip: the first concert, a flight into its city that day,
// and a room in that city, each on the bottom row of its list so the line
// joining them crosses no other dot. The flights and rooms that fit that
// concert are tinted too.
const EXAMPLE: Record<List, number> = { concerts: 0, flights: 30, rooms: 20 }
const CONCERT = TRIP.concerts[EXAMPLE.concerts]
const fits = (list: List, i: number) =>
  list === 'flights'
    ? TRIP.flights[i].city === CONCERT.city && TRIP.flights[i].day === CONCERT.day
    : list === 'rooms'
      ? TRIP.rooms[i].city === CONCERT.city
      : i === EXAMPLE.concerts

const label = 'fill-zinc-faded font-mono text-[11px] uppercase tracking-widest'
const mono = 'font-mono text-[11px]'

const TABLE: Record<List, string> = { concerts: 'CONCERT', flights: 'FLIGHT', rooms: 'ROOM' }
const WORDS = {
  story: {
    list: (list: List) => `${TRIP[list].length} ${list}`,
    pair: (a: List, b: List) => `${a} + ${b}`,
    unit: 'lines',
    cards: 'Cards · the best sheet for each group',
    all: 'all three',
  },
  system: {
    list: (list: List) => `${TABLE[list]} · ${TRIP[list].length}`,
    pair: (a: List, b: List) => `${TABLE[a]} ⋈ ${TABLE[b]}`,
    unit: 'rows',
    cards: 'Memo table · the best plan for each set',
    all: 'all three',
  },
}

// Width on the page per line written
const SCALE = 1.5
const BAR_X = 16
const BAR_H = 22

type Plan = (typeof TRIP_PLANS)[number]

// A plan as one bar: the pair's sheet, then the trips, growing as `t` goes
// from 0 to 1
function PlanBar({ plan, y, t, tone }: { plan: Plan; y: number; t: number; tone: 'ink' | 'sage' }) {
  const first = plan.pairLines * SCALE
  const grown = t * (plan.pairLines + plan.trips) * SCALE
  return (
    <g>
      <text x={BAR_X} y={y - 8} className={label}>
        {plan.pair[0]} + {plan.pair[1]} first
      </text>
      <rect
        x={BAR_X}
        y={y}
        width={Math.min(grown, first)}
        height={BAR_H}
        rx={3}
        className={tone === 'ink' ? 'fill-ink' : 'fill-sage'}
      />
      <rect x={BAR_X + first} y={y} width={Math.max(0, grown - first)} height={BAR_H} rx={3} className="fill-zinc-400" />
      <text x={BAR_X} y={y + BAR_H + 18} className={`${mono} fill-ink`} opacity={t >= 1 ? 1 : 0}>
        {plan.pairLines} pairs + {plan.trips} trips ={' '}
        <tspan className={tone === 'ink' ? 'fill-ink' : 'fill-sage-ink'} fontWeight={600}>
          {plan.lines} lines
        </tspan>
      </text>
    </g>
  )
}

const CARD_W = 216
const CARD_H = 84
const CARD_Y = 156
const cardX = (k: number) => 16 + (k % 2) * (CARD_W + 16)
const cardY = (k: number) => CARD_Y + Math.floor(k / 2) * (CARD_H + 12)

// The pair plans from cheapest to dearest, as the cards show them
const BY_COST = [...TRIP_PLANS].sort((p, q) => p.lines - q.lines)

const SPANS: Record<TripScene, number> = { lists: 1, rule: 1, fh: 1, cf: 1, pairs: 3, triple: 3, system: 0 }

// The weekend-trip story, one scene of it, played once from the start;
// give it a `key` per step. The last scene names everything as a database
// does.
export default function Trip({ scene }: { scene: TripScene }) {
  const system = scene === 'system'
  const words = system ? WORDS.system : WORDS.story
  const played = usePlay(SPANS[scene], scene === 'pairs' || scene === 'triple' ? 500 : 1100)
  const t = Math.min(1, played)
  const [fh, cf] = TRIP_PLANS
  const cards = scene === 'pairs' || scene === 'triple' || system
  const compared = system || (scene === 'triple' && played >= 2.5)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto w-full max-w-[36rem]"
      role="img"
      aria-label={
        system
          ? 'Three tables, CONCERT, FLIGHT and ROOM, and a memo table with the rows of each pair of them and the best plan for all three'
          : 'Three lists, of concerts, flights and hotel rooms, and the sheets of matches written when two of them are matched first'
      }
    >
      {/* The lists */}
      {LISTS.map((list) => (
        <g key={list}>
          <text x={LIST_X[list]} y={DOTS_Y - 12} className={label}>
            {words.list(list)}
          </text>
          {TRIP[list].map((_, i) => {
            const { x, y } = dotAt(list, i)
            const tinted = scene === 'rule' && fits(list, i)
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={DOT}
                height={DOT}
                rx={2}
                className={
                  scene === 'rule' && EXAMPLE[list] === i ? 'fill-sage' : tinted ? 'fill-sage/40' : 'fill-zinc-400'
                }
                opacity={scene === 'rule' && !tinted ? 1 - 0.55 * t : 1}
              />
            )
          })}
        </g>
      ))}

      {/* One trip, and what has to agree along it */}
      {scene === 'rule' && (
        <g opacity={t}>
          {(
            [
              ['concerts', 'flights', 'same city, same day'],
              ['flights', 'rooms', 'same city'],
            ] as [List, List, string][]
          ).map(([a, b, said]) => {
            const from = dotAt(a, EXAMPLE[a])
            const to = dotAt(b, EXAMPLE[b])
            const low = 100
            return (
              <g key={a}>
                <path
                  d={`M${from.x + DOT / 2} ${from.y + DOT} V${low} H${to.x + DOT / 2} V${to.y + DOT + 2}`}
                  className="fill-none stroke-sage"
                  strokeWidth={1.5}
                />
                <text x={(from.x + to.x) / 2 + DOT / 2} y={low + 18} textAnchor="middle" className={`${mono} fill-sage-ink`}>
                  {said}
                </text>
              </g>
            )
          })}
          <text x={16} y={170} className={`${mono} fill-zinc-faded`}>
            Tinted: what fits the first concert
          </text>
        </g>
      )}

      {/* Plans as bars: the pair's sheet, then the trips */}
      {scene === 'fh' && <PlanBar plan={fh} y={150} t={t} tone="ink" />}
      {scene === 'cf' && (
        <>
          <g opacity={0.35}>
            <PlanBar plan={fh} y={150} t={1} tone="ink" />
          </g>
          <PlanBar plan={cf} y={244} t={t} tone="sage" />
        </>
      )}

      {/* The cards: one per pair, then one for all three */}
      {cards && (
        <g>
          <text x={16} y={CARD_Y - 14} className={label}>
            {words.cards}
          </text>
          {BY_COST.map((plan, k) => {
            const best = compared && plan === cf
            return (
              <g key={k} opacity={scene !== 'pairs' || played > k ? 1 : 0}>
                <rect
                  x={cardX(k)}
                  y={cardY(k)}
                  width={CARD_W}
                  height={CARD_H}
                  rx={10}
                  className={best ? 'fill-sage/10 stroke-sage' : 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25'}
                  strokeWidth={best ? 1.5 : 1}
                />
                <text x={cardX(k) + 12} y={cardY(k) + 22} className={`${mono} fill-zinc-faded`}>
                  {words.pair(plan.pair[0], plan.pair[1])}
                </text>
                <text
                  x={cardX(k) + 12}
                  y={cardY(k) + 64}
                  className={`font-serif text-[30px] ${best ? 'fill-sage-ink' : 'fill-ink'}`}
                >
                  {plan.pairLines}
                </text>
                <text x={cardX(k) + CARD_W - 12} y={cardY(k) + 64} textAnchor="end" className={`${mono} fill-zinc-faded`}>
                  {words.unit}
                </text>
              </g>
            )
          })}
          {(scene === 'triple' || system) && (
            <g>
              <rect x={cardX(3)} y={cardY(3)} width={CARD_W} height={CARD_H} rx={10} className="fill-paper stroke-ink" />
              <text x={cardX(3) + 12} y={cardY(3) + 22} className={`${mono} fill-zinc-faded`}>
                {words.all}
              </text>
              {BY_COST.map((plan, k) => (
                <text
                  key={k}
                  x={cardX(3) + 12}
                  y={cardY(3) + 42 + k * 15}
                  className={`${mono} ${k === 0 && compared ? 'fill-sage-ink' : 'fill-ink'}`}
                  fontWeight={k === 0 && compared ? 600 : 400}
                  opacity={system || played >= k + 0.5 ? 1 : 0}
                >
                  {plan.pairLines} + {plan.trips} = {plan.lines}
                  {k === 0 && compared ? ' ✓' : ''}
                </text>
              ))}
            </g>
          )}
        </g>
      )}
    </svg>
  )
}
