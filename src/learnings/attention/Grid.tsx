import { argmax, pct, shade } from './model'

export const WIDTH = 520
const LABEL = 104
const SUMS = 58
const ROW = 38
const PAD = 3
const SUBSCRIPT = ['₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉']

export interface GridProps {
  source: readonly string[]
  target: readonly string[]
  weights: readonly (readonly number[])[]
  // How far each row has appeared, 0 to 1 (absent rows are empty frames)
  shown: readonly number[]
  // The row being written now: its label in sage
  focus?: number
  // Outline the cell with the most weight in each shown row
  tops?: boolean
  // Show each row's total at the right
  sums?: boolean
  // Relabel as the network: encoder states s_j, steps t, the context c_t
  named?: boolean
}

// The glances as a grid: a column per source word, a row per word written,
// each cell shaded by the share of that row's glance it got
export default function Grid({ source, target, weights, shown, focus, tops = false, sums = false, named = false }: GridProps) {
  const cell = (WIDTH - LABEL - SUMS) / source.length
  const top = named ? 62 : 44
  const height = top + target.length * ROW + (named ? 34 : 6)
  const x = (j: number) => LABEL + j * cell

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="mx-auto w-full max-w-[36rem]"
      role="img"
      aria-label={`A grid with the French words ${source.join(', ')} across the top and the English words ${target.join(
        ', ',
      )} down the side. Each cell is shaded by how much of the English word's glance went to that French word.`}
    >
      {source.map((word, j) => (
        <g key={j}>
          <text x={x(j) + cell / 2} y={24} textAnchor="middle" className="fill-ink font-mono text-[11px]">
            {word}
          </text>
          {named && (
            <text x={x(j) + cell / 2} y={44} textAnchor="middle" className="fill-sage-ink font-mono text-[11px]">
              s{SUBSCRIPT[j]}
            </text>
          )}
        </g>
      ))}

      {target.map((word, t) => {
        const y = top + t * ROW
        const seen = Math.max(0, Math.min(1, shown[t] ?? 0))
        const row = weights[t]
        const best = argmax(row)
        const total = row.reduce((a, b) => a + b, 0)
        return (
          <g key={t}>
            <text
              x={LABEL - 10}
              y={y + ROW / 2 + 4}
              textAnchor="end"
              className={`font-mono text-[11px] ${t === focus ? 'fill-sage-ink' : seen > 0 ? 'fill-ink' : 'fill-zinc-faded'}`}
              fontWeight={t === focus ? 700 : undefined}
            >
              {word}
            </text>
            {row.map((w, j) => (
              <g key={j}>
                <rect
                  x={x(j) + PAD}
                  y={y + PAD}
                  width={cell - 2 * PAD}
                  height={ROW - 2 * PAD}
                  rx={6}
                  className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25"
                />
                {seen > 0 && (
                  <rect
                    x={x(j) + PAD}
                    y={y + PAD}
                    width={cell - 2 * PAD}
                    height={ROW - 2 * PAD}
                    rx={6}
                    className={`fill-sage ${tops && j === best ? 'stroke-ink' : ''}`}
                    fillOpacity={shade(w) * seen}
                    strokeWidth={tops && j === best ? 1.5 : 0}
                  />
                )}
                {seen > 0.5 && (
                  <text
                    x={x(j) + cell / 2}
                    y={y + ROW / 2 + 4}
                    textAnchor="middle"
                    className="fill-ink font-mono text-[11px] tabular-nums"
                    fontWeight={j === best ? 700 : undefined}
                  >
                    {pct(w)}
                  </text>
                )}
              </g>
            ))}
            {sums && seen >= 1 && (
              <text x={WIDTH - SUMS + 12} y={y + ROW / 2 + 4} className="fill-zinc-faded font-mono text-[11px] tabular-nums">
                = {pct(total)}
              </text>
            )}
            {named && seen >= 1 && (
              <text x={WIDTH - SUMS + 12} y={y + ROW / 2 + 4} className="fill-sage-ink font-mono text-[11px]">
                → c{SUBSCRIPT[t]}
              </text>
            )}
          </g>
        )
      })}

      {named && (
        <text x={WIDTH / 2} y={height - 10} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
          cell = weight a
          <tspan dy={3} fontSize="75%">
            tj
          </tspan>
          <tspan dy={-3}>{'\u00a0· row → context c'}</tspan>
          <tspan dy={3} fontSize="75%">
            t
          </tspan>
        </text>
      )}
    </svg>
  )
}
