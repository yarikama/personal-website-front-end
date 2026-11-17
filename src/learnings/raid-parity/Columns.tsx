import { usePlay } from '../../components/explain/useLoop'

const WIDTH = 460
const COLUMN = 76
const GAP = 12
const LEFT = (WIDTH - 5 * COLUMN - 4 * GAP) / 2
const TOP = 52

const x = (column: number) => LEFT + column * (COLUMN + GAP)

// Friends (or disks) side by side, each with what they hold, and one more
// on the right who holds only the total (or the parity) of each row. When
// one of them loses what they held, it comes back a row at a time, rebuilt
// from everyone else's (`sum` says how). It plays as soon as it is shown;
// give it a `key`.
export default function Columns({
  names,
  rows,
  keeper = true,
  note,
  lost = null,
  lostWord = 'forgot',
  format = String,
  sum,
}: {
  // One per column; the last is the keeper
  names: string[]
  // Each row's values, the keeper's last
  rows: number[][]
  // Whether the keeper is there yet
  keeper?: boolean
  // What the keeper keeps, under its name
  note?: string
  // The column whose values are lost and rebuilt
  lost?: number | null
  lostWord?: string
  format?: (value: number) => string
  // How a lost value comes back, in words, for row `row`
  sum?: (row: number[], lost: number) => string
}) {
  const many = rows.length > 1
  // A beat to forget, then one per row to rebuild
  const span = lost === null ? 0 : 1 + rows.length
  const played = usePlay(span, many ? 650 : 1500)
  const row = Math.min(rows.length - 1, Math.floor(played - 1))
  const height = many ? 22 : 64
  const pitch = height + (many ? 4 : 0)
  const bottom = TOP + rows.length * pitch
  const HEIGHT = bottom + 44
  const columns = keeper ? names.length : names.length - 1

  // How far the lost column has faded, and how far row r is rebuilt
  const forgotten = lost === null ? 0 : Math.min(1, played)
  const rebuilt = (r: number) => (lost === null ? 0 : Math.max(0, Math.min(1, played - 1 - r)))
  const done = lost !== null && played >= span

  const formula =
    lost === null || !sum
      ? null
      : played < 1
        ? null
        : done && many
          ? `All ${rows.length} rows rebuilt`
          : `${many ? `Row ${row + 1}: ` : ''}${sum(rows[row], lost)}`

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto w-full max-w-[34rem]"
      role="img"
      aria-label={
        lost === null
          ? `${names.slice(0, columns).join(', ')}, each holding a value`
          : `${names[lost]} loses ${many ? 'every value' : 'its value'}, and it is rebuilt from everyone else's`
      }
    >
      {names.slice(0, columns).map((name, c) => {
        const isKeeper = c === names.length - 1
        const isLost = c === lost
        return (
          <g key={name}>
            <text
              x={x(c) + COLUMN / 2}
              y={18}
              textAnchor="middle"
              className={`${isLost && forgotten > 0.5 ? 'fill-ink' : isKeeper ? 'fill-sage-ink' : 'fill-zinc-faded'} font-mono text-[11px] uppercase tracking-widest`}
            >
              {name}
            </text>
            <text x={x(c) + COLUMN / 2} y={36} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
              {isLost && forgotten > 0.5 ? (done ? 'rebuilt' : lostWord) : isKeeper ? note : ''}
            </text>
          </g>
        )
      })}

      {rows.map((values, r) => {
        const y = TOP + r * pitch
        const active = lost !== null && !done && r === row && played >= 1
        return (
          <g key={r}>
            {active && (
              <rect x={LEFT - 6} y={y - 3} width={x(columns - 1) + COLUMN - LEFT + 12} height={height + 6} rx={8} className="fill-sage/15" />
            )}
            {values.slice(0, columns).map((value, c) => {
              const isKeeper = c === names.length - 1
              const isLost = c === lost
              const back = isLost ? rebuilt(r) : 0
              const gone = isLost && forgotten > 0 && back < 0.5
              const cell = isLost
                ? back >= 0.5
                  ? 'fill-sage/20 stroke-sage'
                  : 'fill-paper stroke-ink'
                : isKeeper
                  ? 'fill-sage/15 stroke-sage'
                  : 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25'
              return (
                <g key={c}>
                  <rect
                    x={x(c)}
                    y={y}
                    width={COLUMN}
                    height={height}
                    rx={many ? 6 : 12}
                    className={cell}
                    strokeWidth={1.5}
                    strokeDasharray={gone ? '4 4' : undefined}
                  />
                  <text
                    x={x(c) + COLUMN / 2}
                    y={y + height / 2 + (many ? 4.5 : 8)}
                    textAnchor="middle"
                    opacity={isLost && back < 0.5 ? 1 - forgotten : 1}
                    className={`${isLost && back >= 0.5 ? 'fill-sage-ink' : isKeeper ? 'fill-sage-ink' : 'fill-ink'} font-mono ${many ? 'text-[13px]' : 'text-[22px]'}`}
                  >
                    {format(value)}
                  </text>
                  {gone && (
                    <text
                      x={x(c) + COLUMN / 2}
                      y={y + height / 2 + (many ? 4.5 : 8)}
                      textAnchor="middle"
                      opacity={forgotten}
                      className={`fill-zinc-faded font-mono ${many ? 'text-[13px]' : 'text-[22px]'}`}
                    >
                      ?
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        )
      })}

      {formula && (
        <text x={WIDTH / 2} y={bottom + 28} textAnchor="middle" className={`${done ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[13px]`}>
          {formula}
        </text>
      )}
    </svg>
  )
}
