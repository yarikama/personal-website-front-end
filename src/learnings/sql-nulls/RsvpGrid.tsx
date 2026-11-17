import { usePlay } from '../../components/explain/useLoop'
import { keeps, ORDERS, STORY_GRID, type Truth } from './model'

// Story words or SQL words for the same grid: the reveal relabels it
const WORDS = {
  story: {
    people: 'Friend',
    cards: 'RSVP cards',
    card: (v: number | null) => (v === null ? '' : STORY_GRID[v - 1].customer.name),
    person: (name: string) => name,
    cell: { TRUE: 'yes', FALSE: 'no', UNKNOWN: '?' } as Record<Truth, string>,
    verdict: { TRUE: 'yes', FALSE: 'no', UNKNOWN: 'can’t say' } as Record<Truth, string>,
    all: ['Didn’t', 'reply?'],
    kept: ['On the', 'list'],
    tally: (n: number) => (n === 0 ? 'You hand back: nobody' : `You hand back ${n}`),
  },
  sql: {
    people: 'customers',
    cards: 'orders.customer_id',
    card: (v: number | null) => (v === null ? 'NULL' : String(v)),
    person: (name: string) => `${name} · ${STORY_GRID.find((r) => r.customer.name === name)!.customer.id}`,
    cell: { TRUE: 'TRUE', FALSE: 'FALSE', UNKNOWN: 'UNKNOWN' } as Record<Truth, string>,
    verdict: { TRUE: 'TRUE', FALSE: 'FALSE', UNKNOWN: 'UNKNOWN' } as Record<Truth, string>,
    all: ['NOT IN', ''],
    kept: ['WHERE', 'keeps'],
    tally: (n: number) => `Rows returned: ${n}`,
  },
}

const CARD_X = [78, 158, 238]
const CARD_W = 72
const VERDICT = { x: 322, w: 80 }
const KEPT = { x: 412, w: 68 }
const CARDS_Y = 26
const CARD_H = 34
const ROWS_Y = 76
const ROW = 32
const CELL_H = 24
const WIDTH = 480
const HEIGHT = ROWS_Y + 5 * ROW + 6

const clamp = (t: number) => Math.max(0, Math.min(1, t))

function Cell({ x, w, y, truth, text, opacity, strong }: { x: number; w: number; y: number; truth: Truth; text: string; opacity: number; strong?: boolean }) {
  const box =
    truth === 'TRUE'
      ? strong
        ? 'fill-sage/20 stroke-sage'
        : 'fill-none stroke-sage'
      : truth === 'FALSE'
        ? strong
          ? 'fill-ink/10 stroke-ink'
          : 'fill-none stroke-ink'
        : 'fill-none stroke-zinc-400'
  const ink = truth === 'TRUE' ? 'fill-sage-ink' : truth === 'FALSE' ? 'fill-ink' : 'fill-zinc-faded'
  return (
    <g opacity={opacity}>
      <rect
        x={x}
        y={y}
        width={w}
        height={CELL_H}
        rx={7}
        className={box}
        strokeWidth={strong ? 1.6 : 1.2}
        strokeDasharray={truth === 'UNKNOWN' ? '3 3' : undefined}
      />
      <text x={x + w / 2} y={y + CELL_H / 2 + 4} textAnchor="middle" className={`${ink} font-mono text-[11px]`}>
        {text}
      </text>
    </g>
  )
}

// Five friends checked against three RSVP cards, one of them smudged. Each
// cell asks "is this card someone else?"; the friend didn't reply only if
// every card is someone else. Rows `from` to `to` play in, the ones before
// are already done; `kept` shows who makes the list. Give it a `key` to
// play again.
export default function RsvpGrid({
  from,
  to,
  kept,
  words,
}: {
  from: number
  to: number
  kept: 'hidden' | 'play' | 'shown'
  words: keyof typeof WORDS
}) {
  const say = WORDS[words]
  const cellSpan = (to - from) * 4
  const played = usePlay(cellSpan + (kept === 'play' ? 2 : 0), 320)
  const keptShown = kept === 'shown' ? 1 : kept === 'play' ? clamp(played - cellSpan) : 0
  const listed = STORY_GRID.filter((r) => keeps(r.all)).length

  // How far in a row's piece k (three cards, then the verdict) is
  const shown = (row: number, k: number) => (row < from ? 1 : row >= to ? 0 : clamp(played - ((row - from) * 4 + k)))

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto w-full max-w-[36rem]"
        role="img"
        aria-label={`Five ${say.people} checked against three ${say.cards}, one of them missing: ${STORY_GRID.map(
          (r) => `${r.customer.name} ${say.verdict[r.all]}`,
        ).join(', ')}. ${say.tally(listed)}.`}
      >
        <text x={0} y={CARDS_Y + CARD_H / 2 + 4} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          {say.people}
        </text>
        <text x={CARD_X[0]} y={12} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          {say.cards}
        </text>

        {/* The cards: the third one's name is lost */}
        {STORY_GRID[0].cells.map((_, k) => {
          const value = ORDERS[k]
          return (
            <g key={k}>
              <rect
                x={CARD_X[k]}
                y={CARDS_Y}
                width={CARD_W}
                height={CARD_H}
                rx={8}
                className={value === null ? 'fill-paper stroke-zinc-400' : 'fill-paper stroke-ink'}
                strokeWidth={1.4}
                strokeDasharray={value === null && words === 'sql' ? '3 3' : undefined}
              />
              {value === null && words === 'story' && (
                <g className="fill-zinc-400" opacity={0.55}>
                  <ellipse cx={CARD_X[k] + 30} cy={CARDS_Y + 17} rx={18} ry={7} />
                  <ellipse cx={CARD_X[k] + 44} cy={CARDS_Y + 15} rx={12} ry={6} />
                  <ellipse cx={CARD_X[k] + 38} cy={CARDS_Y + 21} rx={14} ry={5} />
                </g>
              )}
              <text
                x={CARD_X[k] + CARD_W / 2}
                y={CARDS_Y + CARD_H / 2 + 4}
                textAnchor="middle"
                className={`${value === null ? 'fill-zinc-faded' : 'fill-ink'} font-mono text-[12px]`}
              >
                {say.card(value)}
              </text>
            </g>
          )
        })}

        {/* Column heads for the verdict and the list */}
        {[
          { x: VERDICT.x + VERDICT.w / 2, lines: say.all },
          { x: KEPT.x + KEPT.w / 2, lines: say.kept },
        ].map(({ x, lines }) => (
          <text key={x} x={x} y={CARDS_Y + 14} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
            <tspan x={x}>{lines[0]}</tspan>
            <tspan x={x} dy={13}>
              {lines[1]}
            </tspan>
          </text>
        ))}

        {STORY_GRID.map((r, row) => {
          const y = ROWS_Y + row * ROW
          const isKept = keeps(r.all)
          return (
            <g key={r.customer.id}>
              <text x={0} y={y + CELL_H / 2 + 4} className="fill-ink font-mono text-[12px]">
                {say.person(r.customer.name)}
              </text>
              {/* Empty places, filled as the row is checked */}
              {[...CARD_X.map((x) => ({ x, w: CARD_W })), VERDICT].map(({ x, w }) => (
                <rect
                  key={x}
                  x={x}
                  y={y}
                  width={w}
                  height={CELL_H}
                  rx={7}
                  className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25"
                  opacity={shown(row, 0) > 0 ? 0 : 1}
                />
              ))}
              {r.cells.map((truth, k) => (
                <Cell key={k} x={CARD_X[k]} w={CARD_W} y={y} truth={truth} text={say.cell[truth]} opacity={shown(row, k)} />
              ))}
              <Cell x={VERDICT.x} w={VERDICT.w} y={y} truth={r.all} text={say.verdict[r.all]} opacity={shown(row, 3)} strong />
              <g opacity={keptShown}>
                {isKept ? (
                  <circle cx={KEPT.x + KEPT.w / 2} cy={y + CELL_H / 2} r={8} className="fill-sage" />
                ) : (
                  <line
                    x1={KEPT.x + KEPT.w / 2 - 7}
                    x2={KEPT.x + KEPT.w / 2 + 7}
                    y1={y + CELL_H / 2}
                    y2={y + CELL_H / 2}
                    className="stroke-zinc-400"
                    strokeWidth={1.6}
                    strokeLinecap="round"
                  />
                )}
              </g>
            </g>
          )
        })}
      </svg>
      <p
        className="mt-3 text-center font-mono text-[0.875rem] uppercase tracking-widest text-ink"
        style={{ opacity: keptShown }}
      >
        {say.tally(listed)}
      </p>
    </div>
  )
}
