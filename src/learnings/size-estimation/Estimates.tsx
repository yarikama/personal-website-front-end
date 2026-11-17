import { errorFactor, formatFactor, formatRows, isOff, type Comparison } from './model'

// The drawing, in SVG units: one row per operator, the estimate's bar over
// the true count's, on a log scale from 0.1 to 10 million rows
const WIDTH = 640
const ROW = 64
const TOP = 8
const TRACK_LEFT = 0
const TRACK_RIGHT = 470
const NUMBERS_X = 486
const BAR = 13
const LOW = -1
const HIGH = 7
const AXIS = [0, 2, 4, 6]

const atRows = (n: number) => {
  if (n <= 0) return TRACK_LEFT
  const at = (Math.log10(Math.max(n, 10 ** LOW)) - LOW) / (HIGH - LOW)
  return TRACK_LEFT + Math.min(1, at) * (TRACK_RIGHT - TRACK_LEFT)
}

const tick = (power: number) => (power === 0 ? '1' : power === 2 ? '100' : power === 4 ? '10,000' : '1 million')

const label = 'font-mono text-[11px] uppercase tracking-widest'

// Each operator's estimate, from T and V measured on the rows, beside what
// it really returns
export default function Estimates({ rows }: { rows: Comparison[] }) {
  const height = TOP + rows.length * ROW + 24
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="w-full"
      role="img"
      aria-label={rows
        .map((row) => `${row.name}: estimated ${formatRows(row.estimate)}, actually ${formatRows(row.actual)}`)
        .join('; ')}
    >
      {rows.map((row, i) => {
        const y = TOP + i * ROW
        const factor = errorFactor(row)
        const off = isOff(factor)
        return (
          <g key={row.name}>
            <text x={TRACK_LEFT} y={y + 10} className={`${label} fill-ink`}>
              {row.name}
            </text>
            <text x={WIDTH} y={y + 10} textAnchor="end" className={`${label} ${off ? 'fill-sage-ink' : 'fill-zinc-faded'}`}>
              {formatFactor(factor)}
            </text>

            {/* The estimate, outlined */}
            <rect
              x={TRACK_LEFT}
              y={y + 18}
              width={Math.max(2, atRows(row.estimate) - TRACK_LEFT)}
              height={BAR}
              rx={3}
              className="fill-paper stroke-ink"
              strokeWidth={1.5}
            />
            <text x={NUMBERS_X} y={y + 29} className="fill-zinc-faded font-mono text-[11px]">
              guess <tspan className="fill-ink">{formatRows(row.estimate)}</tspan>
            </text>

            {/* What the rows really give, filled */}
            {row.actual > 0 && (
              <rect x={TRACK_LEFT} y={y + 35} width={Math.max(2, atRows(row.actual) - TRACK_LEFT)} height={BAR} rx={3} className="fill-sage" />
            )}
            <text x={NUMBERS_X} y={y + 46} className="fill-zinc-faded font-mono text-[11px]">
              counted <tspan className="fill-sage-ink">{formatRows(row.actual)}</tspan>
            </text>
          </g>
        )
      })}

      {/* The scale */}
      {AXIS.map((power) => (
        <g key={power}>
          <line
            x1={atRows(10 ** power)}
            x2={atRows(10 ** power)}
            y1={TOP + rows.length * ROW - 6}
            y2={TOP + rows.length * ROW}
            className="stroke-zinc-400"
          />
          <text x={atRows(10 ** power)} y={TOP + rows.length * ROW + 14} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
            {tick(power)}
          </text>
        </g>
      ))}
      <text x={TRACK_RIGHT} y={TOP + rows.length * ROW + 14} textAnchor="end" className="fill-zinc-faded font-mono text-[11px]">
        rows
      </text>
    </svg>
  )
}
