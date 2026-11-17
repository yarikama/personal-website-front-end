import { useId } from 'react'
import { usePlay } from '../../components/explain/useLoop'
import { descend, lowest, minima, trapped, type Landscape } from './model'
import { pile, placer } from './plot'

const WIDTH = 560
const HEIGHT = 300
const BOX = { left: 28, right: 532, top: 70, bottom: 262 }
// How long a walk takes, whatever its length, in ms
const WALK_MS = 2600
// How far the hiker can feel the ground, either way, and see through the fog
const FEEL = 0.15
const SIGHT = 62

const label = 'font-mono text-[11px] uppercase tracking-widest'

export type Show = 'feel' | 'walk' | 'crowd' | 'rope' | 'named'

// The story's hillside: the ground, a hiker in the fog who only walks
// downhill, then a crowd of walkers dropped anywhere, a rope between the
// two flat spots, and at last the names. `show` says which; give it a key
// per step so it plays again.
export default function Valley({
  landscape,
  show,
  start = 0,
  starts = [],
  label: aria,
}: {
  landscape: Landscape
  show: Show
  start?: number
  starts?: number[]
  label: string
}) {
  const fogId = `fog-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const place = placer(landscape, BOX)
  const { f } = landscape
  const best = lowest(f)
  const flats = minima(f)

  const single = show === 'feel' || show === 'walk'
  const ways = single ? [descend(f, start)] : starts.map((s) => descend(f, s))
  const span = Math.max(...ways.map((w) => w.length - 1))
  const animate = show === 'walk' || show === 'crowd'
  const played = usePlay(animate ? span : 0, WALK_MS / Math.max(1, span))
  const progress = show === 'feel' ? 0 : animate ? played : span
  const done = progress >= span

  const position = (way: number[]) => way[Math.min(way.length - 1, Math.floor(progress))]
  const hiker = single ? position(ways[0]) : null
  const fog = single
  const stuck = hiker !== null && done && show === 'walk' && trapped(f, hiker)

  // Where each walker stopped, piled at its flat spot
  const ends = ways.map((w) => w.at(-1)!)
  const piles = flats.map((m) => {
    const count = ends.filter((e) => Math.abs(e - m.x) < 0.05).length
    const { x, y } = place.at(m.x)
    return { at: m, low: !trapped(f, m.x), count, dots: pile(x, y, count) }
  })

  const roped = show === 'rope' || show === 'named'
  const [a, b] = flats.length > 1 ? [flats[0].x, flats[flats.length - 1].x] : [0, 0]
  // Where the ground stands above the rope between the two flat spots
  const ropeAt = (v: number) => f(a) + ((v - a) / (b - a)) * (f(b) - f(a))
  const hump: [number, number] | null = roped ? [a, b] : null

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={aria}>
      {fog && hiker !== null && (
        <defs>
          <mask id={fogId}>
            <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="white" />
            <circle cx={place.at(hiker).x} cy={place.at(hiker).y} r={SIGHT} fill="black" />
          </mask>
        </defs>
      )}

      <path d={place.under()} className="fill-zinc-400/10" />
      <path d={place.path()} className="fill-none stroke-zinc-400" strokeWidth={2} />

      {/* The rope between the two flat spots, and the hump that pokes above it */}
      {hump && (
        <g>
          <path
            d={place.path(...narrowTo(hump, (v) => f(v) > ropeAt(v)))}
            className="fill-none stroke-ink"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <line
            x1={place.at(a).x}
            y1={place.at(a).y}
            x2={place.at(b).x}
            y2={place.at(b).y}
            className="stroke-sage"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <text
            x={place.x((a + b) / 2) + 6}
            y={place.y(f((a + b) / 2)) - 14}
            textAnchor="middle"
            className={`fill-ink ${label}`}
          >
            Ground above the rope
          </text>
        </g>
      )}

      {/* Walkers on their way, then piled where they stopped */}
      {!single &&
        (done
          ? piles.map((p) =>
              p.dots.map((d, i) => (
                <circle key={`${p.at.x}-${i}`} cx={d.x} cy={d.y} r={5} className={p.low ? 'fill-sage' : 'fill-ink'} />
              )),
            )
          : ways.map((w, i) => {
              const at = place.at(position(w))
              return <circle key={i} cx={at.x} cy={at.y - 6} r={5} className="fill-zinc-400" />
            }))}
      {!single &&
        done &&
        piles
          .filter((p) => p.count > 0)
          .map((p) => {
            const top = p.dots.at(-1)!
            return (
              <text
                key={p.at.x}
                x={place.x(p.at.x)}
                y={top.y - 12}
                textAnchor="middle"
                className={`${p.low ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[13px] tabular-nums`}
              >
                {p.count}
              </text>
            )
          })}

      {/* The fog: everything but what the hiker can see */}
      {fog && hiker !== null && (
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} className="fill-paper" opacity={0.82} mask={`url(#${fogId})`} />
      )}

      {/* The hiker, and the bit of ground she can feel */}
      {hiker !== null && (
        <g>
          <path
            d={place.path(hiker - FEEL, hiker + FEEL, 20)}
            className="fill-none stroke-sage"
            strokeWidth={5}
            strokeLinecap="round"
          />
          <circle cx={place.at(hiker).x} cy={place.at(hiker).y - 10} r={8} className={stuck ? 'fill-ink' : 'fill-sage'} />
          {show === 'feel' && (
            <text
              x={place.at(hiker).x - 22}
              y={place.at(hiker).y - 6}
              textAnchor="end"
              className={`fill-sage-ink ${label}`}
            >
              {f(hiker - 0.01) < f(hiker) ? '← downhill' : 'downhill →'}
            </text>
          )}
          {done && show === 'walk' && (
            <text
              x={place.at(hiker).x}
              y={place.at(hiker).y - 28}
              textAnchor="middle"
              className={`${stuck ? 'fill-ink' : 'fill-sage-ink'} ${label}`}
            >
              Flat: stop
            </text>
          )}
        </g>
      )}

      {/* The real bottom, which the stuck hiker cannot see */}
      {stuck && (
        <g>
          <circle cx={place.at(best.x).x} cy={place.at(best.x).y} r={6} className="fill-none stroke-ink" strokeWidth={2} />
          <text x={place.at(best.x).x} y={place.at(best.x).y - 16} textAnchor="middle" className={`fill-ink ${label}`}>
            The real bottom
          </text>
        </g>
      )}

      {/* The names */}
      {show === 'named' && (
        <g>
          <text x={BOX.left} y={22} className={`fill-zinc-faded ${label}`}>
            ↑ Loss
          </text>
          <text x={BOX.right} y={HEIGHT - 6} textAnchor="end" className={`fill-zinc-faded ${label}`}>
            Parameter θ →
          </text>
          {piles.map((p) => (
            <text
              key={p.at.x}
              x={place.x(p.at.x)}
              y={place.y(p.at.y) + 22}
              textAnchor="middle"
              className={`${p.low ? 'fill-sage-ink' : 'fill-ink'} ${label}`}
            >
              {p.low ? 'Global minimum' : 'Local minimum'}
            </text>
          ))}
        </g>
      )}
    </svg>
  )
}

// The part of [from, to] where `above` holds, as one stretch (the hump
// between two valleys is one piece)
function narrowTo([from, to]: [number, number], above: (v: number) => boolean): [number, number] {
  const n = 400
  let lo = to
  let hi = from
  for (let i = 0; i <= n; i++) {
    const v = from + ((to - from) * i) / n
    if (above(v)) {
      lo = Math.min(lo, v)
      hi = Math.max(hi, v)
    }
  }
  return lo <= hi ? [lo, hi] : [from, from]
}
