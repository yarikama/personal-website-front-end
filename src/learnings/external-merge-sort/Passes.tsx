import { Readout } from '../../components/explain/figure'
import {
  formatBytes,
  formatCount,
  GB,
  ioCount,
  MB,
  PAGE_BYTES,
  pagesIn,
  passes,
  passLimit,
  PB,
  runChain,
  TB,
  twoPassLimit,
} from './model'

// The drawing, in SVG units
const WIDTH = 640
const HEIGHT = 150
const LEFT = 24
const RIGHT = 616
const BAND_Y = 52
const BAND_H = 46
const LOW = Math.log2(MB)
const HIGH = Math.log2(PB)

// Where a size in bytes sits on the axis, from 1 MB to 1 PB
const atSize = (bytes: number) => LEFT + ((Math.log2(bytes) - LOW) / (HIGH - LOW)) * (RIGHT - LEFT)
// A run count, short enough for a readout
const count = (n: number) => (n < 1e6 ? n.toLocaleString('en-US') : formatCount(n))

// The runs left after each pass: all of them, or the first and last of a long chain
const chain = (runs: number[]) => (runs.length <= 3 ? runs.map(count) : [count(runs[0]), '…', '1']).join(' → ')

// A label's x, moved off the marker's line if it sits on it
const aside = (x: number, marker: number) => (Math.abs(x - marker) >= 14 ? x : marker + (x >= marker ? 14 : -14))

const clamp = (x: number) => Math.max(LEFT, Math.min(RIGHT, x))

// Every data size from 1 MB to 1 PB, coloured by how many passes it needs
// with `memory` bytes; the data to sort marked on it. Then the numbers.
export default function Passes({ data, memory, written }: { data: number; memory: number; written: boolean }) {
  const m = pagesIn(memory)
  const b = pagesIn(data)
  const needed = passes(b, m)
  const io = ioCount(b, m, written)

  // The stretch of sizes each number of passes covers
  const zones: { k: number; from: number; to: number }[] = []
  let from = LEFT
  for (let k = 1; from < RIGHT; k++) {
    const to = clamp(atSize(passLimit(m, k) * PAGE_BYTES))
    if (to > from) zones.push({ k, from, to })
    from = Math.max(from, to)
  }
  const marker = atSize(data)

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={`Data sizes from 1 MB to 1 PB, by passes needed with ${formatBytes(memory)} of memory`}>
        <text x={LEFT} y={BAND_Y - 32} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          Passes needed, by size of the data
        </text>
        {zones.map(({ k, from, to }) => (
          <g key={k}>
            <rect
              x={from}
              y={BAND_Y}
              width={to - from}
              height={BAND_H}
              className={
                k === needed
                  ? 'fill-sage/30 stroke-paper'
                  : k % 2
                    ? 'fill-zinc-200 dark:fill-zinc-200/10 stroke-paper'
                    : 'fill-zinc-300 dark:fill-zinc-200/20 stroke-paper'
              }
              strokeWidth={2}
            />
          </g>
        ))}

        {/* The data to sort */}
        <line x1={marker} y1={BAND_Y - 14} x2={marker} y2={BAND_Y + BAND_H + 6} className="stroke-ink" strokeWidth={2} />
        <text
          x={marker}
          y={BAND_Y - 18}
          textAnchor={marker > RIGHT - 60 ? 'end' : marker < LEFT + 60 ? 'start' : 'middle'}
          className="fill-ink font-mono text-[11px] uppercase tracking-widest"
        >
          {formatBytes(data)}
        </text>

        {/* How many passes, stepped aside when the marker would cross it */}
        {zones.map(({ k, from, to }) =>
          to - from >= 16 ? (
            <text
              key={k}
              x={aside((from + to) / 2, marker)}
              y={BAND_Y + BAND_H / 2 + 5}
              textAnchor="middle"
              className={`fill-ink font-mono text-[13px] ${k === needed ? 'font-semibold' : ''}`}
            >
              {k}
            </text>
          ) : null
        )}

        {/* The axis */}
        {[MB, GB, TB, PB].map((size) => (
          <g key={size}>
            <line x1={atSize(size)} y1={BAND_Y + BAND_H} x2={atSize(size)} y2={BAND_Y + BAND_H + 6} className="stroke-zinc-400" />
            <text
              x={atSize(size)}
              y={BAND_Y + BAND_H + 22}
              textAnchor={size === MB ? 'start' : size === PB ? 'end' : 'middle'}
              className="fill-zinc-faded font-mono text-[11px]"
            >
              {formatBytes(size)}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5">
        <Readout label="Runs after each pass" value={chain(runChain(b, m))} />
        <Readout label="Passes" value={needed} accent />
        <Readout label={`Page I/Os · ${io / b} × B`} value={formatCount(io)} />
        <Readout label="Two passes reach" value={formatBytes(twoPassLimit(m) * PAGE_BYTES)} />
      </div>
    </div>
  )
}
