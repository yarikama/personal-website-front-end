import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks/useMediaQuery'
import {
  arranged,
  BOOK,
  byIndex,
  CHAPTER_PAGES,
  CHICKEN_PAGES,
  formatSeconds,
  lastEnd,
  leafing,
  type Visit,
} from './model'

// What the cookbook figure plays: the index's pointers appearing; two
// dishes, then all of them, through the index; leafing through every page;
// the book arranged by ingredient; and the same scene in a database's words
export type Scene = 'pointers' | 'two' | 'all' | 'leaf' | 'arranged' | 'table' | 'indexes'

const WIDTH = 640
const HEIGHT = 300

// The index at the back, on the left
const CARD = { x: 16, y: 8, width: 164, height: 196 }
const ENTRY_Y0 = 50
const ENTRY_STEP = 19
// The first dishes it lists, A to Z
const NAMES = ['Adobo', 'Alfredo', 'Biryani', 'Cacciatore', 'Caesar', 'Curry', 'Fajitas']
// Where every pointer leaves the card
const ORIGIN = { x: CARD.x + CARD.width, y: CARD.y + CARD.height / 2 }

// The book: 400 pages, 25 to a row, page 1 at the top left
const COLUMNS = 25
const GRID = { x: 204, y: 10, step: 16.6, rowStep: 12, cellW: 13, cellH: 9 }
const cellX = (page: number) => GRID.x + (page % COLUMNS) * GRID.step
const cellY = (page: number) => GRID.y + Math.floor(page / COLUMNS) * GRID.rowStep
const cellCentre = (page: number) => ({ x: cellX(page) + GRID.cellW / 2, y: cellY(page) + GRID.cellH / 2 })

// The tally under it: each way's time on one scale, 30 minutes across
const TALLY = { y: 236, rowStep: 24, labelX: 16, barX: 196, barEnd: 520, valueX: 624 }
const TALLY_MAX = lastEnd(byIndex(BOOK.dishes))

const ALL_BY_INDEX = byIndex(BOOK.dishes)
const TWO_BY_INDEX = byIndex(2)
const LEAFING = leafing()
const ARRANGED = arranged()

// What each scene plays, and how long it takes on the screen: longer jobs
// play longer, but none drags
const played = (scene: Scene): Visit[] =>
  scene === 'two' ? TWO_BY_INDEX : scene === 'all' ? ALL_BY_INDEX : scene === 'leaf' ? LEAFING : scene === 'arranged' ? ARRANGED : []
const POINTERS_MS = 2000
const playMs = (seconds: number) => 1500 + 4500 * Math.sqrt(seconds / TALLY_MAX)

// Where a scene's clock stands once it is over
const finished = (scene: Scene) => (scene === 'pointers' ? POINTERS_MS : Math.max(1, ...played(scene).map((v) => v.end)))

export default function Cookbook({ scene }: { scene: Scene }) {
  const reducedMotion = usePrefersReducedMotion()
  const visits = played(scene)
  const end = finished(scene)
  const started = useRef<number | null>(null)
  const [clock, setClock] = useState(reducedMotion ? Infinity : 0)

  useAnimationFrame((time) => {
    if (clock >= end) return
    started.current ??= time
    const elapsed = time - started.current
    setClock(scene === 'pointers' ? elapsed : (elapsed / playMs(end)) * end)
  })

  const now = Math.min(clock, end)
  const done = clock >= end
  // Where the chicken dishes are: anywhere, or one after another in the
  // book arranged by ingredient (where its index lists them in page order)
  const inBook = scene === 'arranged' ? CHAPTER_PAGES : CHICKEN_PAGES
  const chicken = new Set(inBook)
  const current = visits.find((v) => now >= v.start && now < v.end)
  const seen = new Set(visits.filter((v) => now >= v.end).map((v) => v.page))
  const disk = scene === 'table' || scene === 'indexes'
  const named = scene === 'indexes'

  // How many of the index's pointers are drawn: they appear one by one at
  // first, and stay once shown
  const pointersShown =
    scene === 'pointers' ? Math.floor((now / POINTERS_MS) * BOOK.dishes) : scene === 'two' || scene === 'all' || disk ? BOOK.dishes : 0
  const huntingIndex = current?.hunt && scene !== 'arranged' ? CHICKEN_PAGES.indexOf(current.page) : -1

  // The tally: each way's time so far, once its scene has come
  const order: Scene[] = ['pointers', 'two', 'all', 'leaf', 'arranged', 'table', 'indexes']
  const at = order.indexOf(scene)
  const sofar = (own: Scene, total: number) => (at > order.indexOf(own) ? total : at === order.indexOf(own) ? now : null)
  const tally = [
    {
      name: named ? 'Unclustered index' : scene === 'two' ? 'By the index · 2' : 'By the index · 60',
      seconds: scene === 'two' ? now : sofar('all', TALLY_MAX),
      bad: true,
    },
    { name: named ? 'Full table scan' : 'Leafing through', seconds: sofar('leaf', lastEnd(LEAFING)), bad: false },
    { name: named ? 'Clustered index' : 'Arranged book', seconds: sofar('arranged', lastEnd(ARRANGED)), bad: false },
  ]

  const status = (() => {
    if (scene === 'pointers') return `${pointersShown} dishes, ${pointersShown} page numbers`
    if (disk) return named ? 'Index entries are (key, pointer)' : 'Recipe = row · page = 4 KB disk page'
    const total = visits.length
    const hunts = visits.filter((v) => v.hunt && now >= v.start).length
    if (scene === 'leaf') return done ? `${total} pages, no hunts` : `Page ${Math.min(total, Math.floor(now / BOOK.glanceS) + 1)} of ${total}`
    if (done) return `${scene === 'arranged' ? BOOK.dishes : total} dishes, ${hunts} ${hunts === 1 ? 'hunt' : 'hunts'}`
    return `${hunts} ${hunts === 1 ? 'hunt' : 'hunts'} · ${seen.size} of ${total} pages`
  })()

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className={`shrink-0 tabular-nums ${done ? 'text-ink' : 'text-zinc-faded'}`}>
          {scene === 'pointers' || disk ? '' : formatSeconds(now)}
        </span>
        <span className={`text-right ${done ? 'text-sage-ink' : 'text-zinc-faded'}`}>{status}</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={
          disk
            ? 'The cookbook as a table on disk: an index of key and pointer entries, and pages of rows'
            : 'A cookbook of 400 pages with its chicken dishes marked, and the index at the back pointing to them'
        }
      >
        {/* The index card */}
        <rect {...CARD} rx={10} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
        <text x={CARD.x + 12} y={CARD.y + 22} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {disk ? 'Key, pointer' : 'Index · chicken'}
        </text>
        {NAMES.map((name, i) => (
          <g key={name} className={i === huntingIndex ? 'fill-sage-ink' : 'fill-ink'}>
            <text x={CARD.x + 12} y={ENTRY_Y0 + i * ENTRY_STEP} className="font-mono text-[11px]">
              {disk ? `(${name.slice(0, 5)}, p${inBook[i] + 1})` : name}
            </text>
            {!disk && (
              <text x={CARD.x + CARD.width - 12} y={ENTRY_Y0 + i * ENTRY_STEP} textAnchor="end" className="font-mono text-[11px] tabular-nums">
                {inBook[i] + 1}
              </text>
            )}
          </g>
        ))}
        <text
          x={CARD.x + 12}
          y={ENTRY_Y0 + NAMES.length * ENTRY_STEP}
          className={`font-mono text-[11px] ${huntingIndex >= NAMES.length ? 'fill-sage-ink' : 'fill-zinc-faded'}`}
        >
          … {BOOK.dishes - NAMES.length} more
        </text>

        {/* The pointers from the index into the book */}
        {CHICKEN_PAGES.slice(0, pointersShown).map((page) => {
          const to = cellCentre(page)
          return (
            <line
              key={page}
              x1={ORIGIN.x}
              y1={ORIGIN.y}
              x2={to.x}
              y2={to.y}
              className="stroke-zinc-300 dark:stroke-zinc-200/20"
              strokeWidth={0.8}
            />
          )
        })}

        {/* The pages */}
        {Array.from({ length: BOOK.pages }, (_, page) => {
          const isChicken = chicken.has(page)
          const looked = seen.has(page)
          const here = current?.page === page
          const tone = isChicken
            ? looked
              ? 'fill-sage stroke-sage'
              : 'fill-sage/15 stroke-sage'
            : looked
              ? 'fill-zinc-400/50 stroke-zinc-400 dark:fill-zinc-200/30'
              : 'fill-zinc-200/60 stroke-zinc-300 dark:fill-zinc-200/10 dark:stroke-zinc-200/20'
          return (
            <rect
              key={page}
              x={cellX(page)}
              y={cellY(page)}
              width={GRID.cellW}
              height={GRID.cellH}
              rx={1.5}
              className={here ? 'fill-ink stroke-ink' : tone}
              strokeWidth={0.8}
            />
          )
        })}

        {/* The hunt under way: the reader's path from the index to the page */}
        {current?.hunt &&
          (() => {
            const to = cellCentre(current.page)
            const t = Math.min(1, (now - current.start) / (current.end - current.start) / 0.8)
            return (
              <g>
                <line
                  x1={ORIGIN.x}
                  y1={ORIGIN.y}
                  x2={ORIGIN.x + (to.x - ORIGIN.x) * t}
                  y2={ORIGIN.y + (to.y - ORIGIN.y) * t}
                  className="stroke-ink"
                  strokeWidth={1.6}
                />
                <circle cx={ORIGIN.x + (to.x - ORIGIN.x) * t} cy={ORIGIN.y + (to.y - ORIGIN.y) * t} r={4} className="fill-ink" />
              </g>
            )
          })()}

        <text x={GRID.x} y={GRID.y + 16 * GRID.rowStep + 12} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {disk
            ? 'Table on disk · each cell one 4 KB page'
            : scene === 'arranged'
              ? 'Arranged by ingredient · chicken is one chapter'
              : 'Cookbook · 400 pages, 1 at top left'}
        </text>

        {/* The tally */}
        {tally.map((row, i) => {
          const y = TALLY.y + i * TALLY.rowStep
          const span = TALLY.barEnd - TALLY.barX
          return (
            <g key={i}>
              <text x={TALLY.labelX} y={y + 10} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
                {row.name}
              </text>
              <rect x={TALLY.barX} y={y} width={span} height={12} rx={4} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
              {row.seconds !== null && (
                <>
                  <rect
                    x={TALLY.barX}
                    y={y}
                    width={Math.max(3, (row.seconds / TALLY_MAX) * span)}
                    height={12}
                    rx={4}
                    className={row.bad ? 'fill-ink' : 'fill-sage'}
                  />
                  <text x={TALLY.valueX} y={y + 10} textAnchor="end" className="fill-ink font-mono text-[11px] tabular-nums">
                    {formatSeconds(row.seconds)}
                  </text>
                </>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
