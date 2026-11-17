import type { KeyboardEvent } from 'react'
import { verdict, type Question, type World } from './model'

const NAME_W = 48
const CELL = { w: 46, h: 30 }
const COL = 52
const ROW = 42
const TOP = 64
// A box or label pressed from the keyboard acts like one tapped
function press(event: KeyboardEvent, act: () => void) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  act()
}

// Why a person is in or out, in a few words
function reason(world: World, question: Question, x: number): string {
  const v = verdict(world, question, x)
  const item = v.cell === null ? '' : world.items[v.cell]
  if (question === 'all') return v.in ? 'misses none' : `skips ${item}`
  if (question === 'only') return v.in ? (world.likes[x].some(Boolean) ? 'nothing bad' : 'likes nothing') : `likes ${item}`
  return v.in ? `likes ${item}` : 'no good one'
}

// People down the side, cafés along the top. Tap a box to change who likes
// what, or a café's label to make it good or bad. Each row says whether
// that person is in the answer to `question`, and the box that decides it
// is ringed: in ink, the counterexample that keeps them out of "all" or
// "only"; in sage, the good café that lets them into "some".
export default function LikesLab({
  world,
  question,
  onLike,
  onGood,
}: {
  world: World
  question: Question
  onLike: (x: number, y: number) => void
  onGood: (y: number) => void
}) {
  const verdictX = NAME_W + world.items.length * COL + 10
  const width = verdictX + 120
  const height = TOP + world.people.length * ROW
  const cellX = (y: number) => NAME_W + y * COL
  const rowY = (x: number) => TOP + x * ROW

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto w-full max-w-[34rem]" aria-label="People and the cafés they like">
      {world.items.map((item, y) => {
        const good = world.good[y]
        const cx = cellX(y) + CELL.w / 2
        return (
          <g
            key={item}
            role="button"
            tabIndex={0}
            aria-pressed={good}
            aria-label={`${item}: ${good ? 'good' : 'bad'}. Press to make it ${good ? 'bad' : 'good'}.`}
            onClick={() => onGood(y)}
            onKeyDown={(event) => press(event, () => onGood(y))}
            className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-ink"
          >
            <rect x={cellX(y) - 2} y={2} width={CELL.w + 4} height={44} rx={8} className="fill-transparent stroke-transparent" />
            <text x={cx} y={18} textAnchor="middle" className="fill-ink font-mono text-[11px]">
              {item}
            </text>
            <rect
              x={cx - 22}
              y={26}
              width={44}
              height={16}
              rx={8}
              className={good ? 'fill-sage/20 stroke-sage' : 'fill-paper stroke-ink'}
              strokeWidth={1}
            />
            <text
              x={cx}
              y={37.5}
              textAnchor="middle"
              className="fill-ink font-mono text-[10px] uppercase tracking-widest"
            >
              {good ? 'good' : 'bad'}
            </text>
          </g>
        )
      })}

      {world.people.map((name, x) => {
        const v = verdict(world, question, x)
        const cy = rowY(x) + CELL.h / 2
        return (
          <g key={name}>
            <text x={0} y={cy + 4} className="fill-ink font-mono text-[11px]">
              {name}
            </text>
            {world.items.map((item, y) => {
              const liked = world.likes[x][y]
              const decides = v.cell === y
              return (
                <g
                  key={item}
                  role="button"
                  tabIndex={0}
                  aria-pressed={liked}
                  aria-label={`${name} ${liked ? 'likes' : 'does not like'} ${item}`}
                  onClick={() => onLike(x, y)}
                  onKeyDown={(event) => press(event, () => onLike(x, y))}
                  className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-ink"
                >
                  <rect
                    x={cellX(y)}
                    y={rowY(x)}
                    width={CELL.w}
                    height={CELL.h}
                    rx={7}
                    className={
                      liked
                        ? world.good[y]
                          ? 'fill-sage/25 stroke-sage'
                          : 'fill-ink/15 stroke-ink'
                        : 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25'
                    }
                    strokeWidth={1.2}
                    strokeDasharray={liked ? undefined : '3 4'}
                  />
                  {liked && (
                    <path
                      d={`M${cellX(y) + CELL.w / 2 - 8},${cy} l5,6 l11,-12`}
                      className={`fill-none ${world.good[y] ? 'stroke-sage' : 'stroke-ink'}`}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {decides && (
                    <rect
                      x={cellX(y) - 4}
                      y={rowY(x) - 4}
                      width={CELL.w + 8}
                      height={CELL.h + 8}
                      rx={10}
                      className={`fill-none ${v.kind === 'witness' ? 'stroke-sage' : 'stroke-ink'}`}
                      strokeWidth={2.2}
                    />
                  )}
                </g>
              )
            })}
            <text
              x={verdictX}
              y={cy - 2}
              className={`${v.in ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[11px] uppercase tracking-widest`}
            >
              {v.in ? 'in' : 'out'}
            </text>
            <text x={verdictX} y={cy + 11} className="fill-zinc-faded font-mono text-[10px]">
              {reason(world, question, x)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
