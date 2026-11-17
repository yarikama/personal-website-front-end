import { two } from './model'

// How alike each other word's vector is to one word's: a bar per word, from
// −0.5 through 0 (unrelated) to 1 (the same direction). The word to watch is
// sage; the others ink.

const WIDTH = 440
const ROW = 19
const TOP = 26
const NAMES = 78
const LOW = 96
const HIGH = 396
// The scale runs from FLOOR to 1; a word below FLOOR is drawn at FLOOR
const FLOOR = -0.5

const x = (value: number) => LOW + ((Math.max(FLOOR, value) - FLOOR) / (1 - FLOOR)) * (HIGH - LOW)

export default function Alike({
  words,
  values,
  watch,
  label,
}: {
  words: string[]
  values: number[]
  // The word to pick out
  watch: string | null
  label: string
}) {
  const height = TOP + ROW * words.length + 6
  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full" role="img" aria-label={label}>
      {[FLOOR, 0, 0.5, 1].map((tick) => (
        <g key={tick}>
          <line
            x1={x(tick)}
            x2={x(tick)}
            y1={TOP - 6}
            y2={height - 4}
            className="stroke-zinc-300 dark:stroke-zinc-200/25"
            strokeDasharray={tick ? '2 4' : undefined}
          />
          <text x={x(tick)} y={TOP - 12} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] tabular-nums">
            {tick < 0 ? `−${-tick}` : tick}
          </text>
        </g>
      ))}
      {words.map((word, i) => {
        const value = values[i]
        const y = TOP + i * ROW
        const watched = word === watch
        return (
          <g key={word}>
            <text x={NAMES} y={y + 13} textAnchor="end" className={`font-mono text-[12px] ${watched ? 'fill-sage-ink' : 'fill-ink'}`}>
              {word}
            </text>
            <rect
              x={Math.min(x(0), x(value))}
              y={y + 3}
              width={Math.abs(x(value) - x(0))}
              height={ROW - 6}
              rx={2}
              className={watched ? 'fill-sage' : 'fill-ink'}
              fillOpacity={watched ? 1 : 0.45}
            />
            {/* The number to the right of the bar, or of 0 for a bar to the left */}
            <text x={x(Math.max(0, value)) + 5} y={y + 13} className="fill-zinc-faded font-mono text-[11px] tabular-nums">
              {value < 0 ? `−${two(-value)}` : two(value)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
