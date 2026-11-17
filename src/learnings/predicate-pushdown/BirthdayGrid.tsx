import { usePlay } from '../../components/explain/useLoop'
import { BIRTHDAY, BUDGET, FRIEND, GIFT, showClause, STORY, SUITS } from './model'

// The story's grid: a row per friend, a column per gift, and a card in a
// cell once that pair is written down. Pairing everything is the whole
// grid; checking a friend's own rule first crosses out a row before any of
// its cards are written.

const WIDTH = 360
const LEFT = 96
const COL_W = 32
const ROW_H = 28
const TOP = 42
const HEIGHT = TOP + FRIEND.rows.length * ROW_H + 6
const CELL_W = COL_W - 6
const CELL_H = ROW_H - 6

const label = 'font-mono text-[11px]'
const header = 'flex min-h-[1.5rem] flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-[0.875rem] uppercase tracking-widest'

export type Scene = 'lists' | 'rules' | 'late' | 'friends' | 'gifts' | 'early' | 'plan'

type Cell = 'none' | 'gone' | 'written' | 'dropped' | 'kept'

const FRIENDS = FRIEND.rows.map(([name, hobby, soon]) => ({ name: String(name), hobby: String(hobby), soon: soon === 'yes' }))
const GIFTS = GIFT.rows.map(([, hobby, price]) => ({ hobby: String(hobby), price: Number(price) }))
// The kinds of gift, each over its two columns
const KINDS = GIFTS.filter((_, j) => j % 2 === 0).map((g) => g.hobby)

// The cells the early way writes, row by row
const EARLY = STORY.friendOk.flatMap((f, i) => (f ? STORY.giftOk.flatMap((g, j) => (g ? [[i, j] as const] : [])) : []))

function CellView({ i, j, state }: { i: number; j: number; state: Cell }) {
  const x = LEFT + j * COL_W + 3
  const y = TOP + i * ROW_H + 3
  if (state === 'none' || state === 'gone')
    return (
      <rect
        x={x}
        y={y}
        width={CELL_W}
        height={CELL_H}
        rx={5}
        fill="none"
        className="stroke-zinc-300 dark:stroke-zinc-200/25"
        strokeDasharray="3 3"
        opacity={state === 'gone' ? 0.35 : 1}
      />
    )
  return (
    <rect
      x={x}
      y={y}
      width={CELL_W}
      height={CELL_H}
      rx={5}
      strokeWidth={1.2}
      className={state === 'kept' ? 'fill-sage stroke-sage' : 'fill-paper stroke-ink'}
      opacity={state === 'dropped' ? 0.22 : 1}
    />
  )
}

// A friend's row label, crossed out once their rule has failed
function FriendLabel({ i, out }: { i: number; out: boolean }) {
  const f = FRIENDS[i]
  const y = TOP + i * ROW_H + ROW_H / 2 + 4
  return (
    <g opacity={out ? 0.35 : 1}>
      <text x={6} y={y} className={`${label} fill-ink`}>
        {f.name}
      </text>
      <text x={34} y={y} className={`${label} fill-zinc-faded`}>
        {f.hobby}
      </text>
      <circle cx={LEFT - 10} cy={y - 4} r={3.5} strokeWidth={1.2} className={f.soon ? 'fill-ink stroke-ink' : 'fill-none stroke-ink'} />
      {out && <line x1={4} x2={LEFT - 4} y1={y - 4} y2={y - 4} className="stroke-ink" strokeWidth={1.2} />}
    </g>
  )
}

function GiftLabel({ j, out }: { j: number; out: boolean }) {
  const x = LEFT + j * COL_W + COL_W / 2
  return (
    <g opacity={out ? 0.35 : 1}>
      <text x={x} y={TOP - 8} textAnchor="middle" className={`${label} fill-ink`}>
        ${GIFTS[j].price}
      </text>
      {out && <line x1={x - 13} x2={x + 13} y1={TOP - 12} y2={TOP - 12} className="stroke-ink" strokeWidth={1.2} />}
    </g>
  )
}

// How far each scene's animation runs, and how fast
const SPAN: Record<Scene, number> = {
  lists: 0,
  rules: 0,
  late: STORY.cards * 2,
  friends: FRIENDS.length,
  gifts: GIFTS.length,
  early: EARLY.length * 2,
  plan: 0,
}
const PACE: Record<Scene, number> = { lists: 1, rules: 1, late: 45, friends: 260, gifts: 220, early: 140, plan: 1 }

function Rules({ scene }: { scene: Scene }) {
  if (scene === 'lists') return null
  const system = scene === 'plan'
  const rules = [
    { words: 'birthday this month', reads: 'friend', plan: `σ ${showClause(BIRTHDAY)}`, on: 'on FRIEND', now: ['late', 'friends'] },
    { words: 'under $30', reads: 'gift', plan: `σ ${showClause(BUDGET)}`, on: 'on GIFT', now: ['late', 'gifts'] },
    { words: 'suits their hobby', reads: 'both', plan: `⋈ ${showClause(SUITS)}`, on: 'the join', now: ['late', 'early'] },
  ]
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {rules.map((rule) => {
        const now = rule.now.includes(scene)
        return (
          <span
            key={rule.words}
            className={`rounded-xl border px-3 py-1.5 font-mono text-[0.875rem] ${
              now ? 'border-sage bg-sage/15 text-sage-ink' : 'border-zinc-300 dark:border-zinc-200/20 text-ink'
            }`}
          >
            {system ? rule.plan : rule.words}
            <span className={now ? 'text-sage-ink' : 'text-zinc-faded'}> · {system ? rule.on : `reads ${rule.reads}`}</span>
          </span>
        )
      })}
    </div>
  )
}

// The story, one scene of it; give it a `key` per step so it plays again
export default function BirthdayGrid({ scene }: { scene: Scene }) {
  const played = usePlay(SPAN[scene], PACE[scene])
  const system = scene === 'plan'

  // Who is crossed out so far
  const friendOut = (i: number) =>
    !STORY.friendOk[i] && (scene === 'friends' ? played > i : ['gifts', 'early', 'plan'].includes(scene))
  const giftOut = (j: number) => !STORY.giftOk[j] && (scene === 'gifts' ? played > j : ['early', 'plan'].includes(scene))

  let written = 0
  let kept = 0
  const cell = (i: number, j: number): Cell => {
    if (scene === 'late') {
      const k = i * GIFTS.length + j
      if (played <= k) return 'none'
      written++
      if (played <= STORY.cards + k) return 'written'
      if (STORY.kept[i][j]) kept++
      return STORY.kept[i][j] ? 'kept' : 'dropped'
    }
    if (scene === 'early' || scene === 'plan') {
      const k = EARLY.findIndex(([a, b]) => a === i && b === j)
      if (k < 0) return 'gone'
      const at = scene === 'plan' ? SPAN.early : played
      if (at <= k) return 'none'
      written++
      if (at <= EARLY.length + k) return 'written'
      if (STORY.kept[i][j]) kept++
      return STORY.kept[i][j] ? 'kept' : 'dropped'
    }
    return friendOut(i) || giftOut(j) ? 'gone' : 'none'
  }
  const cells = FRIENDS.flatMap((_, i) => GIFTS.map((_, j) => ({ i, j, state: cell(i, j) })))
  const friendsLeft = FRIENDS.filter((_, i) => !friendOut(i)).length
  const giftsLeft = GIFTS.filter((_, j) => !giftOut(j)).length

  const count =
    scene === 'late' || scene === 'early'
      ? `${written} cards written · ${kept} kept`
      : scene === 'friends'
        ? `${friendsLeft} of ${FRIENDS.length} friends left`
        : scene === 'gifts'
          ? `${giftsLeft} of ${GIFTS.length} gifts left`
          : scene === 'plan'
            ? `${written} rows, not ${STORY.cards} · ${kept} kept`
            : `${FRIENDS.length} friends · ${GIFTS.length} gifts`

  return (
    <div>
      <div className={header}>
        <span className={`tabular-nums ${system ? 'text-sage-ink' : 'text-ink'}`}>{count}</span>
        <span className="flex items-center gap-2 text-zinc-faded">
          <svg width="8" height="8" aria-hidden>
            <circle cx={4} cy={4} r={3.5} className="fill-ink" />
          </svg>
          birthday this month
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto mt-3 w-full max-w-[30rem]"
        role="img"
        aria-label={
          system
            ? 'The grid as a query plan: FRIEND down the side, GIFT along the top, rows and columns removed by the two filters, and 12 cells written, of which 3 pass the join condition'
            : 'A grid with six friends down the side and eight gifts along the top; each cell is a card pairing one friend with one gift'
        }
      >
        <text x={6} y={12} className={`${label} uppercase tracking-widest ${system ? 'fill-sage-ink' : 'fill-zinc-faded'}`}>
          {system ? 'GIFT →' : 'gifts →'}
        </text>
        <text x={6} y={TOP - 8} className={`${label} uppercase tracking-widest ${system ? 'fill-sage-ink' : 'fill-zinc-faded'}`}>
          {system ? 'FRIEND ↓' : 'friends ↓'}
        </text>
        {KINDS.map((kind, k) => (
          <text key={kind} x={LEFT + (k * 2 + 1) * COL_W} y={12} textAnchor="middle" className={`${label} fill-zinc-faded`}>
            {kind}
          </text>
        ))}
        {GIFTS.map((_, j) => (
          <GiftLabel key={j} j={j} out={giftOut(j)} />
        ))}
        {FRIENDS.map((_, i) => (
          <FriendLabel key={i} i={i} out={friendOut(i)} />
        ))}
        {cells.map(({ i, j, state }) => (
          <CellView key={`${i}-${j}`} i={i} j={j} state={state} />
        ))}
      </svg>
      <Rules scene={scene} />
    </div>
  )
}
