import type { HeadOut, Matrix } from './model'
import { ASKER, short, WORDS } from './model'

const WIDTH = 470
const CELL = 36
const LABEL = 40
const GAP = 18
const TOP = 52
const GRID = LABEL + WORDS.length * CELL
// Where the output bars start, under the grids
const OUT_GAP = 30
const OUT_BAR = 56

// A cell's sage: kept below 0.4 under light-text weights and above 0.6
// under dark-text ones, so its number reads in both themes
const tint = (w: number) => (w > 0.5 ? 0.6 + 0.4 * w : 0.06 + 0.6 * w)

// Each head's table of weights, every word (row) over every word (column),
// with the row of “cooks” outlined; then what “cooks” passes on: each
// head's output laid side by side, a number for each feature it carries.
export default function Heads({ heads, names, out, slots }: { heads: HeadOut[]; names: string[]; out: Matrix; slots: readonly string[] }) {
  const gridsWidth = heads.length * GRID + (heads.length - 1) * GAP
  const left = (WIDTH - gridsWidth) / 2
  const gridBottom = TOP + WORDS.length * CELL
  const outTop = gridBottom + OUT_GAP
  const height = outTop + 24 + OUT_BAR + (heads.length > 1 ? 56 : 40)
  const row = out[ASKER]
  const perHead = row.length / heads.length
  const barW = 44
  const barGap = 10
  const headGap = 34
  const outWidth = row.length * barW + (row.length - heads.length) * barGap + (heads.length - 1) * headGap
  const outLeft = (WIDTH - outWidth) / 2
  const barX = (i: number) => outLeft + i * (barW + barGap) + Math.floor(i / perHead) * (headGap - barGap)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="mx-auto w-full max-w-[36rem]"
      role="img"
      aria-label={`${heads.length === 1 ? 'One head' : `${heads.length} heads`} on “${WORDS.join(' ')}”. For “cooks”: ${heads
        .map((h, n) => `${names[n]} gives ${WORDS.map((w, j) => `${w} ${short(h.weights[ASKER][j])}`).join(', ')}`)
        .join('; ')}. It passes on ${row.map((x, i) => `${slots[i]} ${short(x)}`).join(', ')}.`}
    >
      {heads.map((head, n) => {
        const x0 = left + n * (GRID + GAP)
        const gx = x0 + LABEL
        return (
          <g key={n}>
            <text x={gx + (WORDS.length * CELL) / 2} y={14} textAnchor="middle" className="fill-ink font-mono text-[11px] uppercase tracking-widest">
              {names[n]}
            </text>
            {WORDS.map((w, j) => (
              <text
                key={w}
                x={gx + j * CELL + CELL / 2}
                y={TOP - 10}
                textAnchor="middle"
                className={`font-mono text-[10px] ${j === ASKER ? 'fill-ink' : 'fill-zinc-faded'}`}
              >
                {w}
              </text>
            ))}
            {head.weights.map((weights, i) => (
              <g key={i}>
                <text
                  x={gx - 6}
                  y={TOP + i * CELL + CELL / 2 + 4}
                  textAnchor="end"
                  className={`font-mono text-[10px] ${i === ASKER ? 'fill-ink' : 'fill-zinc-faded'}`}
                >
                  {WORDS[i]}
                </text>
                {weights.map((w, j) => (
                  <g key={j}>
                    <rect
                      x={gx + j * CELL + 1}
                      y={TOP + i * CELL + 1}
                      width={CELL - 2}
                      height={CELL - 2}
                      rx={3}
                      className="fill-sage"
                      fillOpacity={tint(w)}
                    />
                    <text
                      x={gx + j * CELL + CELL / 2}
                      y={TOP + i * CELL + CELL / 2 + 4}
                      textAnchor="middle"
                      className={`font-mono text-[10px] tabular-nums ${w > 0.5 ? 'fill-ink dark:fill-paper' : 'fill-ink'}`}
                    >
                      {short(w)}
                    </text>
                  </g>
                ))}
              </g>
            ))}
            <rect
              x={gx - 1}
              y={TOP + ASKER * CELL - 1}
              width={WORDS.length * CELL + 2}
              height={CELL + 2}
              rx={4}
              className="fill-none stroke-ink"
              strokeWidth={1.5}
            />
          </g>
        )
      })}

      <text x={WIDTH / 2} y={outTop + 8} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        What “cooks” passes on
      </text>
      {row.map((x, i) => {
        const base = outTop + 24 + OUT_BAR
        const h = x * OUT_BAR
        return (
          <g key={i}>
            <rect x={barX(i)} y={outTop + 24} width={barW} height={OUT_BAR} rx={3} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
            <rect x={barX(i)} y={base - h} width={barW} height={h} rx={3} className={x > 0.3 ? 'fill-sage' : 'fill-ink'} fillOpacity={x > 0.3 ? 1 : 0.45} />
            <text x={barX(i) + barW / 2} y={base + 14} textAnchor="middle" className="fill-ink font-mono text-[10px] tabular-nums">
              {short(x)}
            </text>
            <text x={barX(i) + barW / 2} y={base + 28} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
              {slots[i]}
            </text>
          </g>
        )
      })}
      {heads.length > 1 &&
        heads.map((_, n) => (
          <text
            key={n}
            x={(barX(n * perHead) + barX((n + 1) * perHead - 1) + barW) / 2}
            y={outTop + 24 + OUT_BAR + 44}
            textAnchor="middle"
            className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest"
          >
            from head {n + 1}
          </text>
        ))}
    </svg>
  )
}
