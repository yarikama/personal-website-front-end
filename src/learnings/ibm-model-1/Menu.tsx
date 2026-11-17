import { links, NONE, withNone, type Pair, type Table } from './model'

// Narrow, so the words stay large on a phone
const WIDTH = 360
const SLOT = 80
const BLOCK = 90
const ENGLISH_Y = 24
const FRENCH_Y = 76

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// Where each of k words sits across the width, centred
const xs = (k: number) => Array.from({ length: k }, (_, i) => WIDTH / 2 + (i - (k - 1) / 2) * SLOT)

// The links of one line `round` rounds in, between whole rounds if it
// falls between them
function sharesAt(tables: Table[], line: Pair, round: number): number[][] {
  const low = Math.max(0, Math.min(tables.length - 1, Math.floor(round)))
  const high = Math.min(tables.length - 1, low + 1)
  const from = links(tables[low], line)
  const to = links(tables[high], line)
  const t = Math.min(1, Math.max(0, round - low))
  return from.map((row, j) => row.map((share, i) => lerp(share, to[j][i], t)))
}

// The menu: each line's English above its French, with "none" in front of
// the English. Each French word has a line to every English place it could
// have come from, as thick as that link is likely; a link likelier than
// not is sage. `marked` words get a sage tint behind them.
export default function Menu({
  pairs,
  tables,
  round,
  lines = true,
  marked = [],
}: {
  pairs: Pair[]
  tables: Table[]
  round: number
  lines?: boolean
  marked?: string[]
}) {
  const height = pairs.length * BLOCK
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="mx-auto w-full max-w-[26rem]"
      role="img"
      aria-label={`A menu of ${pairs.length} lines, each in English above French: ${pairs
        .map((p) => `${p.english.join(' ')} over ${p.french.join(' ')}`)
        .join('; ')}. Lines link each French word to the English words it could have come from.`}
    >
      {pairs.map((line, row) => {
        const top = row * BLOCK
        const from = withNone(line.english)
        const ex = xs(from.length)
        const fx = xs(line.french.length)
        const shares = lines ? sharesAt(tables, line, round) : []
        const word = (text: string, x: number, y: number, key: string) => {
          const none = text === NONE
          const shown = none ? 'none' : text
          const tinted = marked.includes(text)
          return (
            <g key={key}>
              {tinted && (
                <rect
                  x={x - shown.length * 3.9 - 6}
                  y={y - 14}
                  width={shown.length * 7.8 + 12}
                  height={20}
                  rx={6}
                  className="fill-sage"
                  fillOpacity={0.3}
                />
              )}
              <text
                x={x}
                y={y}
                textAnchor="middle"
                className={`font-mono text-[13px] ${none ? 'fill-zinc-faded' : 'fill-ink'}`}
              >
                {shown}
              </text>
            </g>
          )
        }
        return (
          <g key={row} transform={`translate(0 ${top})`}>
            {shares.map((row_, j) =>
              row_.map((share, i) => {
                const strong = share >= 0.5
                return (
                  <line
                    key={`${j}-${i}`}
                    x1={fx[j]}
                    y1={FRENCH_Y - 14}
                    x2={ex[i]}
                    y2={ENGLISH_Y + 6}
                    className={strong ? 'stroke-sage' : 'stroke-ink'}
                    strokeOpacity={strong ? 1 : 0.12 + 0.6 * share}
                    strokeWidth={0.75 + 3.5 * share}
                    strokeLinecap="round"
                  />
                )
              }),
            )}
            {from.map((e, i) => word(e, ex[i], ENGLISH_Y, `e${i}`))}
            {line.french.map((f, j) => word(f, fx[j], FRENCH_Y, `f${j}`))}
          </g>
        )
      })}
    </svg>
  )
}

// The line over the menu: where the rounds are, and what is happening
export function MenuHeader({ left, right }: { left: string; right: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
      <span className="shrink-0 text-zinc-faded">{left}</span>
      <span className="text-right text-ink">{right}</span>
    </div>
  )
}
