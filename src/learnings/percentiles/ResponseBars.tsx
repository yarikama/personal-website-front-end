import { useMemo } from 'react'
import { Readout } from '../../components/explain/figure'
import { seeded } from '../../components/explain/random'
import { mean, percentile, sampleResponses, withSlowest } from './model'

const WIDTH = 640
const HEIGHT = 240
const LEFT = 44
const RIGHT = 630
const TOP = 14
const BASE = 210
// The chart's top: a slower request runs off it, with its time written above
const CEILING = 1000

const y = (ms: number) => BASE - (Math.min(ms, CEILING) / CEILING) * (BASE - TOP)

// A hundred requests to one server, as they came, with the average and the
// percentiles drawn across. `slowest` sets how long the slowest one took.
export default function ResponseBars({ slowest }: { slowest: number }) {
  const base = useMemo(() => sampleResponses(seeded(21), 100), [])
  const responses = withSlowest(base, slowest)
  const lines = [
    { name: 'Average', ms: mean(responses), tone: 'stroke-ink', text: 'fill-ink', dash: '5 4' },
    { name: 'p50', ms: percentile(responses, 0.5), tone: 'stroke-sage', text: 'fill-sage', dash: undefined },
    { name: 'p99', ms: percentile(responses, 0.99), tone: 'stroke-sage', text: 'fill-sage', dash: '2 3' },
  ]
  const step = (RIGHT - LEFT) / responses.length

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="A hundred response times with the average and percentiles">
        {[0, 250, 500, 750, 1000].map((ms) => (
          <g key={ms}>
            <line x1={LEFT} x2={RIGHT} y1={y(ms)} y2={y(ms)} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
            <text x={LEFT - 6} y={y(ms) + 3} textAnchor="end" className="fill-zinc-400 font-mono text-[9px]">
              {ms}
            </text>
          </g>
        ))}
        {responses.map((ms, i) => (
          <g key={i}>
            <rect x={LEFT + i * step + 1} width={Math.max(1, step - 2)} y={y(ms)} height={BASE - y(ms)} className="fill-zinc-300 dark:fill-zinc-200/25" />
            {ms > CEILING && (
              <text x={LEFT + i * step + step / 2} y={TOP - 2} textAnchor="middle" className="fill-ink font-mono text-[9px]">
                ↑ {Math.round(ms).toLocaleString('en-US')} ms
              </text>
            )}
          </g>
        ))}
        {lines.map((line) => (
          <g key={line.name}>
            <line x1={LEFT} x2={RIGHT} y1={y(line.ms)} y2={y(line.ms)} className={line.tone} strokeWidth={1.5} strokeDasharray={line.dash} />
            <text x={RIGHT - 2} y={y(line.ms) - 5} textAnchor="end" className={`font-mono text-[10px] uppercase tracking-widest ${line.text}`}>
              {line.name}
            </text>
          </g>
        ))}
        <text x={LEFT} y={HEIGHT - 6} className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
          100 requests, as they came · ms
        </text>
      </svg>
      <div className="mt-4 grid grid-cols-3 gap-4">
        {lines.map((line) => (
          <Readout key={line.name} label={line.name} value={`${Math.round(line.ms)} ms`} accent={line.name !== 'Average'} />
        ))}
      </div>
    </div>
  )
}
