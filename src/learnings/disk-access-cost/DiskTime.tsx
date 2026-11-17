import { Readout } from '../../components/explain/figure'
import { formatMs, inOneRunSplit, pagesFor, scatteredSplit, times, type Split } from './model'

const WIDTH = 640
const HEIGHT = 196
const LEFT = 20
const RIGHT = 620
const BAR = 26

// Reading `bytes` from the course's disk in pages of `pageBytes`: scattered
// over the disk, or side by side in one run. Each bar is split into the time
// spent getting there and the time spent reading, on one scale.
export default function DiskTime({ bytes, pageBytes }: { bytes: number; pageBytes: number }) {
  const pages = pagesFor(bytes, pageBytes)
  const scattered = scatteredSplit(pages, pageBytes)
  const run = inOneRunSplit(pages, pageBytes)
  const total = (split: Split) => split.gettingThere + split.reading
  const longest = total(scattered)
  const span = RIGHT - LEFT
  const at = (ms: number) => (ms / longest) * span

  const rows = [
    { name: `${pages.toLocaleString('en-US')} ${pages === 1 ? 'page' : 'pages'}, scattered`, split: scattered, y: 36 },
    { name: 'The same pages in one run', split: run, y: 112 },
  ]

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={`Scattered: ${formatMs(total(scattered))}. In one run: ${formatMs(total(run))}.`}>
        {rows.map((row) => {
          const there = at(row.split.gettingThere)
          const reading = at(row.split.reading)
          return (
            <g key={row.y}>
              <text x={LEFT} y={row.y - 10} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
                {row.name}
              </text>
              <text x={RIGHT} y={row.y - 10} textAnchor="end" className="fill-ink font-mono text-[11px] tabular-nums">
                {formatMs(total(row.split))}
              </text>
              <rect x={LEFT} y={row.y} width={span} height={BAR} rx={6} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
              <rect x={LEFT} y={row.y} width={Math.max(2, there)} height={BAR} className="fill-ink" />
              <rect x={LEFT + there} y={row.y} width={Math.max(2, reading)} height={BAR} className="fill-sage" />
            </g>
          )
        })}
        <g transform={`translate(${LEFT},${HEIGHT - 22})`}>
          <rect width={12} height={12} y={-10} className="fill-ink" />
          <text x={18} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
            Getting there (6 ms a trip)
          </text>
          <rect x={300} width={12} height={12} y={-10} className="fill-sage" />
          <text x={318} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
            Reading (100 MB/s)
          </text>
        </g>
      </svg>
      <div className="mt-5 grid grid-cols-3 gap-4">
        <Readout label="Scattered" value={formatMs(total(scattered))} />
        <Readout label="One run" value={formatMs(total(run))} />
        <Readout label="Slower by" value={times(total(scattered) / total(run))} accent />
      </div>
    </div>
  )
}
