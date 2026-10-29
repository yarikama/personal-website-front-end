import { CITY, guess, valuesAfter, WALKING } from './model'

// The city drawn: a hundred blocks by a hundred, the river down the middle
// with its bridges, the hotel and the station, the corners backed up so far
// (deeper where the river cost more than the guess said), and a walk's
// route. It only draws: the walks are worked out in model.ts.

const CELL = 5
const MARGIN = 4

// The corners backed up, in the order walks first reached them, so the
// first `n` walks' corners are a prefix
const ORDER = (() => {
  const { first } = WALKING()
  return CITY()
    .corners.filter((corner) => first[corner] > 0)
    .sort((a, b) => first[a] - first[b])
})()

const reachedBy = (n: number) => {
  const { first } = WALKING()
  let count = 0
  while (count < ORDER.length && first[ORDER[count]] <= n) count++
  return ORDER.slice(0, count)
}

// The deepest any corner falls below its guess, by the last walk
const DEEPEST = (() => {
  const c = CITY()
  const values = valuesAfter(WALKING().walks.length)
  return Math.max(1, ...ORDER.map((corner) => guess(c, corner) - values[corner]))
})()

const centre = (corner: number) => {
  const c = CITY()
  return { x: MARGIN + c.x(corner) * CELL + CELL / 2, y: MARGIN + c.y(corner) * CELL + CELL / 2 }
}

// The river as runs of wet corners between the bridges
const RIVER = (() => {
  const c = CITY()
  const runs: [number, number][] = []
  let start: number | null = null
  for (let row = 0; row <= c.size; row++) {
    const wet = row < c.size && !c.bridge(row)
    if (wet && start === null) start = row
    if (!wet && start !== null) {
      runs.push([start, row - 1])
      start = null
    }
  }
  return runs
})()

export interface CityMapProps {
  label: string
  // Walks done: their corners show as backed up, shaded by their values then
  walks?: number
  // A route to draw, and how much of it (in blocks) so far; the corners it
  // has passed count as backed up too
  path?: number[] | null
  along?: number
  // Whether to shade the corners backed up at all
  shade?: boolean
}

export default function CityMap({ label, walks = 0, path = null, along, shade = true }: CityMapProps) {
  const c = CITY()
  const size = MARGIN * 2 + c.size * CELL
  const shown = path ? path.slice(0, (along ?? path.length - 1) + 1) : []
  const done = reachedBy(walks)
  const seen = new Set(done)
  const fresh = shown.filter((corner) => corner !== c.station && !seen.has(corner) && seen.add(corner))
  const values = valuesAfter(Math.max(walks, fresh.length > 0 ? walks + 1 : walks))
  const walker = shown.length > 0 ? centre(shown[shown.length - 1]) : null
  const hotel = centre(c.hotel)
  const station = centre(c.station)

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full" style={{ maxWidth: '30rem' }} role="img" aria-label={label}>
      <rect x={MARGIN} y={MARGIN} width={c.size * CELL} height={c.size * CELL} className="fill-paper" />
      {Array.from({ length: c.size / 10 + 1 }, (_, i) => (
        <g key={i} className="stroke-zinc-300 dark:stroke-zinc-200/15" strokeWidth={0.5}>
          <line x1={MARGIN + i * 10 * CELL} x2={MARGIN + i * 10 * CELL} y1={MARGIN} y2={MARGIN + c.size * CELL} />
          <line y1={MARGIN + i * 10 * CELL} y2={MARGIN + i * 10 * CELL} x1={MARGIN} x2={MARGIN + c.size * CELL} />
        </g>
      ))}

      {shade &&
        [...done, ...fresh].map((corner) => {
          const drop = Math.max(0, guess(c, corner) - values[corner])
          return (
            <rect
              key={corner}
              x={MARGIN + c.x(corner) * CELL}
              y={MARGIN + c.y(corner) * CELL}
              width={CELL}
              height={CELL}
              className="fill-sage"
              opacity={0.22 + 0.6 * (drop / DEEPEST)}
            />
          )
        })}

      {RIVER.map(([from, to]) => (
        <rect
          key={from}
          x={MARGIN + c.river * CELL + 0.5}
          y={MARGIN + from * CELL}
          width={CELL - 1}
          height={(to - from + 1) * CELL}
          className="fill-ink"
          opacity={0.75}
        />
      ))}

      {shown.length > 1 && (
        <polyline
          points={shown.map((corner) => `${centre(corner).x},${centre(corner).y}`).join(' ')}
          fill="none"
          className="stroke-ink"
          strokeWidth={1.3}
          strokeLinejoin="round"
          opacity={0.8}
        />
      )}

      <circle cx={hotel.x} cy={hotel.y} r={5} className="fill-ink" />
      <text x={hotel.x} y={hotel.y + 18} textAnchor="middle" className="fill-ink font-mono text-[11px] uppercase tracking-widest">
        hotel
      </text>
      <rect x={station.x - 5} y={station.y - 5} width={10} height={10} className="fill-sage" />
      <text x={station.x} y={station.y - 11} textAnchor="middle" className="fill-sage font-mono text-[11px] uppercase tracking-widest">
        station
      </text>
      <text
        x={MARGIN + c.river * CELL + CELL + 4}
        y={MARGIN + c.size * CELL - 6}
        className="fill-zinc-400 font-mono text-[11px] uppercase tracking-widest"
      >
        river
      </text>

      {walker && <circle cx={walker.x} cy={walker.y} r={4} className="fill-ink stroke-paper" strokeWidth={1.5} />}
    </svg>
  )
}
