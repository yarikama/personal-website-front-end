import { lerp, usePlay } from '../../components/explain/useLoop'
import { hits, type Access } from './model'

// Story words or system words for the same drawing: the reveal relabels it
const WORDS = {
  desk: {
    shelf: 'Shelf',
    pool: 'Desk',
    room: (n: number) => `room for ${n}`,
    item: (p: number) => `Vol ${p}`,
    reading: (p: number) => `Reading volume ${p}`,
    hit: 'Already on the desk',
    miss: (out: number | null) => (out === null ? 'Fetch it from the shelf' : `Fetch it; volume ${out} goes back`),
    tally: (hit: number, miss: number) => `${miss} trips to the shelf · ${hit} found on the desk`,
  },
  pool: {
    shelf: 'Disk',
    pool: 'Pool',
    room: (n: number) => `${n} frames`,
    item: (p: number) => `P${p}`,
    reading: (p: number) => `Page ${p} requested`,
    hit: 'Hit',
    miss: (out: number | null) => (out === null ? 'Miss: read from disk' : `Miss: evict page ${out}`),
    tally: (hit: number, miss: number) => `${hit} hits · ${miss} misses`,
  },
}

const LEFT = 84
const STEP = 64
const BOOK = { w: 46, h: 54 }
const SHELF_Y = 26
const DESK_Y = 120
const TAPE_Y = 214
const CELL = 20
const ROW = 26

const shelfX = (page: number) => LEFT + (page - 1) * STEP
const slotX = (frame: number) => LEFT + frame * STEP
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const clamp = (t: number) => Math.max(0, Math.min(1, t))

// When in an access (0 to 1) the book going back leaves, and the one
// fetched arrives
const OUT = 0.42
const IN_END = 0.88

function Book({ x, y, label, tone }: { x: number; y: number; label: string; tone: 'plain' | 'hit' | 'fetched' }) {
  const box =
    tone === 'hit' ? 'fill-sage/20 stroke-sage' : tone === 'fetched' ? 'fill-paper stroke-ink' : 'fill-paper stroke-zinc-400'
  return (
    <g>
      <rect x={x} y={y} width={BOOK.w} height={BOOK.h} rx={7} className={box} strokeWidth={tone === 'plain' ? 1.2 : 2} />
      <text
        x={x + BOOK.w / 2}
        y={y + BOOK.h / 2 + 4}
        textAnchor="middle"
        className={`${tone === 'hit' ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[11px]`}
      >
        {label}
      </text>
    </g>
  )
}

// A file read in order, pass after pass, through a pool too small for it:
// the shelf (or disk) holds every page, the desk (or pool) a few, and the
// tape underneath marks each read, sage when the page was already there and
// ink when it had to be fetched. It plays the reads from `from` up to `to`
// of `run`, with the ones before `from` already done; give it a `key` to
// play again.
export default function Desk({
  run,
  pages,
  frames,
  from,
  to,
  words,
  pace = 650,
}: {
  run: Access[]
  pages: number
  frames: number
  from: number
  to: number
  words: keyof typeof WORDS
  pace?: number
}) {
  const say = WORDS[words]
  const played = usePlay(to - from, pace)
  const finished = played >= to - from
  const current = finished ? to : from + Math.floor(played)
  const f = finished ? 0 : played - Math.floor(played)
  const access = finished ? undefined : run[current]
  const before = current > 0 ? run[current - 1].slots : Array.from({ length: frames }, () => null)

  // Reads finished so far, counting the current one once its cell is shown
  const shown = (k: number) => k < current || (k === current && !!access && f >= 0.5)
  const done = run.filter((_, k) => shown(k))
  const hitCount = done.filter((a) => a.hit).length
  const missCount = done.length - hitCount

  const fetching = access && !access.hit
  const backOnShelf = fetching && access.evicted !== null && f >= OUT ? access.evicted : null
  const leftShelf = fetching && f >= OUT ? access.page : null
  const onDesk = new Set(before.filter((p): p is number => p !== null))
  if (backOnShelf !== null) onDesk.delete(backOnShelf)
  if (leftShelf !== null) onDesk.add(leftShelf)

  const passes = Math.ceil(run.length / pages)
  const width = LEFT + pages * STEP - (STEP - BOOK.w) + 4
  const height = TAPE_Y + passes * ROW + 4

  const status = access ? (access.hit ? say.hit : say.miss(access.evicted)) : say.tally(hitCount, missCount)

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="text-zinc-faded">{access ? say.reading(access.page) : 'Done'}</span>
        <span className={access ? (access.hit ? 'text-sage-ink' : 'text-ink') : 'text-ink'}>{status}</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto mt-3 w-full max-w-[34rem]"
        role="img"
        aria-label={`${say.pool} with room for ${frames} of ${pages} pages, read ${passes} times over: ${say.tally(hits(run, 0, to), to - hits(run, 0, to))}`}
      >
        <text x={0} y={SHELF_Y + BOOK.h / 2 + 4} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {say.shelf}
        </text>
        <text x={0} y={DESK_Y + BOOK.h / 2 - 3} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {say.pool}
        </text>
        <text x={0} y={DESK_Y + BOOK.h / 2 + 12} className="fill-zinc-faded font-mono text-[10px]">
          {say.room(frames)}
        </text>

        {/* What is being read now */}
        {access && (
          <path
            d={`M${shelfX(access.page) + BOOK.w / 2 - 6},${SHELF_Y - 14} l12,0 l-6,8 z`}
            className={access.hit ? 'fill-sage' : 'fill-ink'}
          />
        )}

        {/* The shelf: a gap where a volume is out on the desk */}
        {Array.from({ length: pages }, (_, j) => j + 1).map((page) =>
          onDesk.has(page) ? (
            <rect
              key={page}
              x={shelfX(page)}
              y={SHELF_Y}
              width={BOOK.w}
              height={BOOK.h}
              rx={7}
              className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25"
              strokeDasharray="3 4"
            />
          ) : (
            <Book key={page} x={shelfX(page)} y={SHELF_Y} label={say.item(page)} tone="plain" />
          ),
        )}

        {/* The desk's places */}
        {Array.from({ length: frames }, (_, i) => (
          <rect
            key={i}
            x={slotX(i)}
            y={DESK_Y}
            width={BOOK.w}
            height={BOOK.h}
            rx={7}
            className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25"
            strokeDasharray="3 4"
          />
        ))}
        {before.map((page, i) => {
          if (page === null || (fetching && i === access.frame)) return null
          const tone = access?.hit && access.page === page ? 'hit' : 'plain'
          return <Book key={page} x={slotX(i)} y={DESK_Y} label={say.item(page)} tone={tone} />
        })}

        {/* The volume going back, then the one fetched */}
        {fetching && access.evicted !== null && f < OUT && (
          <Book
            x={lerp(slotX(access.frame), shelfX(access.evicted), ease(clamp(f / OUT)))}
            y={lerp(DESK_Y, SHELF_Y, ease(clamp(f / OUT)))}
            label={say.item(access.evicted)}
            tone="plain"
          />
        )}
        {fetching && f >= OUT && (
          <Book
            x={lerp(shelfX(access.page), slotX(access.frame), ease(clamp((f - OUT) / (IN_END - OUT))))}
            y={lerp(SHELF_Y, DESK_Y, ease(clamp((f - OUT) / (IN_END - OUT))))}
            label={say.item(access.page)}
            tone="fetched"
          />
        )}

        {/* The tape: one cell per read, a row per pass */}
        {Array.from({ length: passes }, (_, pass) => (
          <text
            key={pass}
            x={0}
            y={TAPE_Y + pass * ROW + CELL / 2 + 4}
            className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest"
          >
            Pass {pass + 1}
          </text>
        ))}
        {run.map((a, k) => {
          const x = shelfX((k % pages) + 1) + (BOOK.w - CELL) / 2
          const y = TAPE_Y + Math.floor(k / pages) * ROW
          return (
            <rect
              key={k}
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              rx={5}
              className={
                shown(k)
                  ? a.hit
                    ? 'fill-sage stroke-sage'
                    : 'fill-ink stroke-ink'
                  : k === current
                    ? 'fill-none stroke-ink'
                    : 'fill-none stroke-zinc-300 dark:stroke-zinc-200/25'
              }
              strokeWidth={1.2}
            />
          )
        })}
      </svg>
      <p className="mt-2 text-center font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">
        {access ? say.tally(hitCount, missCount) : ' '}
      </p>
    </div>
  )
}
