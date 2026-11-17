import { Readout } from '../../components/explain/figure'
import { at, FACTORED, keptShare, rawSimilarity, SENTENCES, similarity, VOCAB, type Weighting, type Word } from './model'

const WIDTH = 600
const HEIGHT = 300
// The table: a row per word, a column per sentence
const GRID = { left: 74, top: 34, cell: 14, row: 16.4 }
// The map of the first two numbers per word
const MAP = { x: 312, y: 160, right: 588, top: 30, bottom: 288 }
// The singular values, under both
const BARS = { width: 600, height: 120, left: 30, right: 590, top: 28, bottom: 90 }

const CHAR = 6.1 // width of a 10px monospace character
const two = (value: number) => (Number.isNaN(value) ? '—' : (Math.abs(value) < 0.005 ? 0 : value).toFixed(2))
const pct = (share: number) => `${Math.round(100 * share)}%`

interface Box {
  x: number
  y: number
  w: number
  h: number
}
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

// Names beside points: try right, left, above, below; skip a name with no
// room. `lines` are segments a name must not cross.
function place(points: { x: number; y: number; text: string }[], lines: [number, number, number, number][]) {
  const taken: Box[] = points.map((p) => ({ x: p.x - 3, y: p.y - 3, w: 6, h: 6 }))
  for (const [x1, y1, x2, y2] of lines) {
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 4)
    for (let s = 0; s <= steps; s++) taken.push({ x: x1 + ((x2 - x1) * s) / steps - 1, y: y1 + ((y2 - y1) * s) / steps - 1, w: 2, h: 2 })
  }
  return points.map((p) => {
    const w = p.text.length * CHAR
    const tries: { x: number; y: number; anchor: 'start' | 'end' | 'middle' }[] = [
      { x: p.x + 7, y: p.y + 3.5, anchor: 'start' },
      { x: p.x - 7, y: p.y + 3.5, anchor: 'end' },
      { x: p.x, y: p.y - 7, anchor: 'middle' },
      { x: p.x, y: p.y + 14, anchor: 'middle' },
    ]
    for (const t of tries) {
      const left = t.anchor === 'start' ? t.x : t.anchor === 'end' ? t.x - w : t.x - w / 2
      const box = { x: left, y: t.y - 8, w, h: 10 }
      if (box.x < GRID.left + GRID.cell * SENTENCES.length + 6 || box.x + box.w > WIDTH || box.y < MAP.top - 4 || box.y + box.h > HEIGHT) continue
      if (taken.some((b) => overlaps(b, box))) continue
      taken.push(box)
      return t
    }
    return null
  })
}

// The twelve sentences' table, each word squeezed to k numbers and drawn by
// its first two, and the singular values with the kept ones in sage
export default function Lab({ weighting, k, pair }: { weighting: Weighting; k: number; pair: [Word, Word] }) {
  const { table, factors, vectors } = FACTORED[weighting]
  const W = vectors[k - 1]
  const biggest = Math.max(...table.flat())
  const watched = pair.map(at)

  // Point the map so that car is up, whichever sign the factoring chose
  const flip = (FACTORED[weighting].vectors[1][at('car')][1] ?? 0) < 0 ? -1 : 1
  const coords = W.map((v) => [v[0] ?? 0, k >= 2 ? flip * v[1] : 0])
  // Scale to fit every word but "the", which may run off the edge
  const fit = coords.filter((_, i) => VOCAB[i] !== 'the')
  const scale = Math.min(
    (MAP.right - MAP.x - 50) / Math.max(...fit.map((c) => c[0]), 0.1),
    (MAP.y - MAP.top - 10) / Math.max(...fit.map((c) => c[1]), 0.1),
    (MAP.bottom - MAP.y - 10) / Math.max(...fit.map((c) => -c[1]), 0.1),
  )
  const px = (c: number[]) => Math.min(MAP.right - 4, MAP.x + scale * c[0])
  const py = (c: number[]) => MAP.y - scale * c[1]
  const offMap = (c: number[]) => MAP.x + scale * c[0] > MAP.right - 4

  // Name the watched words first, so they always get room
  const ordered = [...watched, ...VOCAB.map((_, i) => i).filter((i) => !watched.includes(i))]
  const rays = watched.map((i): [number, number, number, number] => [MAP.x, MAP.y, px(coords[i]), py(coords[i])])
  const names = place(
    ordered.map((i) => ({ x: px(coords[i]), y: py(coords[i]), text: offMap(coords[i]) ? `${VOCAB[i]} →` : VOCAB[i] })),
    [...rays, [MAP.x, MAP.y, MAP.right, MAP.y], [MAP.x, MAP.top, MAP.x, MAP.bottom]],
  )
  const nameOf = new Map(ordered.map((i, n) => [i, names[n]]))

  const raw = rawSimilarity(weighting, pair[0], pair[1])
  const squeezed = similarity(weighting, k, pair[0], pair[1])
  const slot = (BARS.right - BARS.left) / factors.values.length
  const top = factors.values[0]

  return (
    <div>
      <ol className="grid list-none grid-cols-1 gap-x-6 gap-y-0.5 p-0 font-mono text-[0.8rem] leading-snug text-ink sm:grid-cols-2">
        {SENTENCES.map((s, j) => (
          <li key={j} className="m-0 p-0">
            <span className="tabular-nums text-zinc-faded">{String(j + 1).padStart(2, ' ')}</span> {s}
          </li>
        ))}
      </ol>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-4 w-full"
        role="img"
        aria-label={`The ${weighting === 'Counts' ? 'counts' : 'TF-IDF weights'} of ${VOCAB.length} words in ${SENTENCES.length} sentences, and a map of each word's first two numbers after keeping ${k} of ${factors.values.length} layers. ${pair[0]} and ${pair[1]} have a cosine of ${two(raw)} in the raw rows and ${two(squeezed)} after.`}
      >
        <text x={GRID.left} y={GRID.top - 18} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          Sentences 1–{SENTENCES.length}
        </text>
        {SENTENCES.map((_, j) => (
          <text key={j} x={GRID.left + GRID.cell * (j + 0.5)} y={GRID.top - 5} textAnchor="middle" className="fill-zinc-faded font-mono text-[8px] tabular-nums">
            {j + 1}
          </text>
        ))}
        {watched.map((i) => (
          <rect key={i} x={2} y={GRID.top + GRID.row * i} width={GRID.left + GRID.cell * SENTENCES.length - 2} height={GRID.row} rx={4} className="fill-none stroke-sage" strokeWidth={1.5} />
        ))}
        {VOCAB.map((word, i) => (
          <g key={word}>
            <text x={GRID.left - 6} y={GRID.top + GRID.row * (i + 0.5) + 3.5} textAnchor="end" className={`font-mono text-[10px] ${watched.includes(i) ? 'fill-ink' : 'fill-zinc-faded'}`}>
              {word}
            </text>
            {table[i].map((value, j) => (
              <rect
                key={j}
                x={GRID.left + GRID.cell * j + 1}
                y={GRID.top + GRID.row * i + 1.5}
                width={GRID.cell - 2}
                height={GRID.row - 3}
                rx={2}
                className={value ? (watched.includes(i) ? 'fill-sage' : 'fill-ink') : 'fill-zinc-400'}
                fillOpacity={value ? 0.2 + (0.8 * value) / biggest : 0.12}
              />
            ))}
          </g>
        ))}

        {/* The map */}
        <text x={MAP.x - 10} y={GRID.top - 18} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          {k >= 2 ? 'Dimensions 1 and 2' : 'Dimension 1 only'}
        </text>
        <line x1={MAP.x} x2={MAP.right} y1={MAP.y} y2={MAP.y} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        <line x1={MAP.x} x2={MAP.x} y1={MAP.top} y2={MAP.bottom} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        {rays.map(([x1, y1, x2, y2], n) => (
          <line key={n} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-sage" strokeWidth={1.8} />
        ))}
        {ordered.map((i) => {
          const c = coords[i]
          const on = watched.includes(i)
          const name = nameOf.get(i)
          return (
            <g key={i}>
              <circle cx={px(c)} cy={py(c)} r={on ? 4.5 : 3.2} className={on ? 'fill-sage stroke-ink' : 'fill-ink'} strokeWidth={on ? 1 : 0} fillOpacity={on ? 1 : 0.7} />
              {name && (
                <text x={name.x} y={name.y} textAnchor={name.anchor} className={`font-mono text-[10px] ${on ? 'fill-ink' : 'fill-zinc-faded'}`}>
                  {offMap(c) ? `${VOCAB[i]} →` : VOCAB[i]}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <svg
        viewBox={`0 0 ${BARS.width} ${BARS.height}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`The ${factors.values.length} singular values, largest first: ${factors.values.map((s) => s.toFixed(1)).join(', ')}. The first ${k} are kept, ${pct(keptShare(factors.values, k))} of the table.`}
      >
        <text x={BARS.left} y={12} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          Singular values · {k} kept
        </text>
        <line x1={BARS.left} x2={BARS.right} y1={BARS.bottom} y2={BARS.bottom} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        {factors.values.map((s, l) => {
          const x = BARS.left + slot * l
          const h = ((BARS.bottom - BARS.top) * s) / top
          const kept = l < k
          return (
            <g key={l}>
              <rect x={x + slot * 0.2} y={BARS.bottom - h} width={slot * 0.6} height={h} rx={3} className={kept ? 'fill-sage' : 'fill-ink'} fillOpacity={kept ? 1 : 0.3} />
              <text x={x + slot / 2} y={BARS.bottom - h - 4} textAnchor="middle" className={`font-mono text-[9px] tabular-nums ${kept ? 'fill-ink' : 'fill-zinc-faded'}`}>
                {s.toFixed(1)}
              </text>
              <text x={x + slot / 2} y={BARS.bottom + 16} textAnchor="middle" className={`font-mono text-[10px] ${kept ? 'fill-ink' : 'fill-zinc-faded'}`}>
                σ{l + 1}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
        <Readout label="Raw rows" value={two(raw)} />
        <Readout label={`LSA, k = ${k}`} value={two(squeezed)} accent />
        <Readout label="Table kept" value={pct(keptShare(factors.values, k))} />
        <Readout label="Pair" value={`${pair[0]} · ${pair[1]}`} />
      </div>
    </div>
  )
}
