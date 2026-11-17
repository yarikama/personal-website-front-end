import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { fetchBooks, formatMinutes, formatMs, GUESS, inOneRunMs, scatteredMs, trips, type Slot } from './model'

// The stacks, seen from above: three shelves of twenty books, the desk on
// the left where the clerk starts
const WIDTH = 640
const HEIGHT = 260
const DESK = { x: 46, y: 130 }
const SHELF_Y = [52, 130, 208]
const FIRST_BOOK_X = 142
const BOOK_STEP = 23
const BOOKS_PER_SHELF = 20
// Real milliseconds per minute in the library: a trip is about a second
const PLAYBACK = 160

const bookX = (at: number) => FIRST_BOOK_X + at * BOOK_STEP
// Where the clerk stands to take a book: in the aisle below it
const standAt = (book: Slot) => ({ x: bookX(book.at), y: SHELF_Y[book.shelf] + 30 })
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const same = (a: Slot, b: Slot) => a.shelf === b.shelf && a.at === b.at

// The clerk fetching `books`, in order, as the clock runs. Plays as soon as
// it is shown; with reduced motion it shows the end.
export function Stacks({ books }: { books: Slot[] }) {
  const reducedMotion = usePrefersReducedMotion()
  const visits = fetchBooks(books)
  const total = visits[visits.length - 1].done
  const started = useRef<number | null>(null)
  const [minute, setMinute] = useState(reducedMotion ? Infinity : 0)

  useAnimationFrame((time) => {
    if (minute >= total) return
    started.current ??= time
    setMinute((time - started.current) / PLAYBACK)
  })

  // Where the clerk is: walking to the next book, or standing at the last
  const now = Math.min(minute, total)
  let clerk = DESK
  for (let i = 0; i < visits.length; i++) {
    const visit = visits[i]
    if (now < visit.leave) break
    const from = i === 0 ? DESK : standAt(visits[i - 1].book)
    const to = standAt(visit.book)
    const t = visit.arrive > visit.leave ? Math.min(1, (now - visit.leave) / (visit.arrive - visit.leave)) : 1
    clerk = { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) }
  }

  const finished = minute >= total
  const tripsTaken = visits.filter((visit) => visit.trip && now >= visit.leave).length
  const allTrips = trips(visits)
  const inHand = visits.filter((visit) => now >= visit.done).length

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className={`shrink-0 tabular-nums ${finished ? 'text-ink' : 'text-zinc-faded'}`}>{formatMinutes(now)}</span>
        <span className={`text-right ${finished ? 'text-sage-ink' : 'text-zinc-faded'}`}>
          {finished
            ? `${books.length} ${books.length === 1 ? 'book' : 'books'}, ${allTrips} ${allTrips === 1 ? 'trip' : 'trips'}`
            : `Trip ${Math.max(1, tripsTaken)} · ${inHand} of ${books.length} in hand`}
        </span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="A clerk walking through library shelves to fetch books">
        {SHELF_Y.map((y) => (
          <rect
            key={y}
            x={FIRST_BOOK_X - 16}
            y={y - 18}
            width={BOOKS_PER_SHELF * BOOK_STEP + 9}
            height={36}
            rx={6}
            className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25"
          />
        ))}
        {SHELF_Y.map((y, shelf) =>
          Array.from({ length: BOOKS_PER_SHELF }, (_, at) => {
            const visit = visits.find((v) => same(v.book, { shelf, at }))
            const taken = visit !== undefined && now >= visit.done
            return (
              <rect
                key={`${shelf}-${at}`}
                x={bookX(at) - 8}
                y={y - 13}
                width={16}
                height={26}
                rx={2}
                className={
                  taken
                    ? 'fill-sage stroke-sage'
                    : visit
                      ? 'fill-sage/15 stroke-sage'
                      : 'fill-zinc-200/60 stroke-zinc-300 dark:fill-zinc-200/10 dark:stroke-zinc-200/20'
                }
                strokeWidth={1}
              />
            )
          })
        )}
        <rect x={DESK.x - 30} y={DESK.y - 20} width={60} height={40} rx={8} className="fill-paper stroke-ink" />
        <text x={DESK.x} y={DESK.y + 34} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          Desk
        </text>
        <circle cx={clerk.x} cy={clerk.y} r={9} className="fill-ink" />
      </svg>
    </div>
  )
}

const RACE = { width: 640, height: 170, left: 20, right: 620 }
// Real milliseconds for the longer bar to fill
const RACE_MS = 4000

// The same 1,000 books (or pages), scattered against side by side, on one
// clock: each bar grows at the same speed and stops when its fetch is done.
// `disk` reads the clock in milliseconds and the books as pages.
export function Race({ disk }: { disk: boolean }) {
  const reducedMotion = usePrefersReducedMotion()
  const scattered = scatteredMs(GUESS.pages, GUESS.pageBytes)
  const run = inOneRunMs(GUESS.pages, GUESS.pageBytes)
  const started = useRef<number | null>(null)
  const [clock, setClock] = useState(reducedMotion ? Infinity : 0)

  useAnimationFrame((time) => {
    if (clock >= scattered) return
    started.current ??= time
    setClock(((time - started.current) / RACE_MS) * scattered)
  })

  const format = disk ? formatMs : formatMinutes
  const span = RACE.right - RACE.left
  const rows = [
    {
      name: disk ? '1,000 pages, scattered' : '1,000 books on 1,000 shelves',
      total: scattered,
      trips: GUESS.pages,
      y: 40,
    },
    { name: disk ? '1,000 pages in one run' : '1,000 books side by side', total: run, trips: 1, y: 116 },
  ]
  const tripWord = disk ? 'seek' : 'trip'

  return (
    <div>
      <svg
        viewBox={`0 0 ${RACE.width} ${RACE.height}`}
        className="w-full"
        role="img"
        aria-label={`${rows[0].name}: ${format(scattered)}. ${rows[1].name}: ${format(run)}.`}
      >
        {rows.map((row) => {
          const now = Math.min(clock, row.total)
          const done = clock >= row.total
          const tripsSoFar = Math.min(row.trips, Math.ceil((now / row.total) * row.trips))
          return (
            <g key={row.name}>
              <text x={RACE.left} y={row.y - 10} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
                {row.name}
              </text>
              <text x={RACE.right} y={row.y - 10} textAnchor="end" className="fill-zinc-faded font-mono text-[11px] tabular-nums">
                {tripsSoFar.toLocaleString('en-US')} {tripsSoFar === 1 ? tripWord : `${tripWord}s`}
              </text>
              <rect x={RACE.left} y={row.y} width={span} height={26} rx={6} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
              <rect
                x={RACE.left}
                y={row.y}
                width={Math.max(3, (now / scattered) * span)}
                height={26}
                rx={6}
                className={row.trips === 1 ? 'fill-sage' : 'fill-ink'}
              />
              <text
                x={RACE.left}
                y={row.y + 46}
                className={`font-serif text-[20px] tabular-nums ${done ? (row.trips === 1 ? 'fill-sage-ink' : 'fill-ink') : 'fill-zinc-faded'}`}
              >
                {format(now)}
                {done && row.trips === 1 ? ': done' : ''}
              </text>
            </g>
          )
        })}
      </svg>
      {disk && (
        <p className="mt-3 font-mono text-[0.8rem] uppercase leading-relaxed tracking-widest text-zinc-faded">
          Clerk = read head · a trip = 6 ms · a book = a 4 KB page, 0.04 ms
        </p>
      )}
    </div>
  )
}
