import { usePlay } from '../../components/explain/useLoop'
import Bin from './Bin'
import { between, hardShares, LAB_ROUNDS, labRun, pointsOf, responsibilities, type Dataset, type Round } from './model'

const WIDTH = 560
const HEIGHT = 96
const LEFT = 52
const RIGHT = 530
const TOP = 22
const BOTTOM = 70

const one = (value: number) => value.toFixed(1)
const xsOf = new Map<Dataset, number[]>()
function xsFor(dataset: Dataset) {
  let found = xsOf.get(dataset)
  if (!found) {
    found = pointsOf(dataset).map((p) => p.x)
    xsOf.set(dataset, found)
  }
  return found
}

// The lab: EM (or k-means, `hard`) on a data set from a start, playing from
// round `from` to round `to`. Give it a `key` per click so it plays again.
export default function Lab({ dataset, hard, start, from, to }: { dataset: Dataset; hard: boolean; start: number; from: number; to: number }) {
  const run = labRun(dataset, start, hard)
  const played = usePlay(Math.max(0, to - from), 260)
  const at = Math.min(to, from + played)
  const round = Math.min(Math.floor(at), LAB_ROUNDS - 1)
  const mixture = between(run[round].mixture, run[Math.min(LAB_ROUNDS, round + 1)].mixture, at - round)
  const xs = xsFor(dataset)
  const shares = xs.map((v) => (hard ? hardShares(v, mixture.map((c) => c.mean)) : responsibilities(v, mixture)))
  const tags = mixture.map((c) => (hard ? `centre ${one(c.mean)}` : `${one(c.mean)} ± ${one(c.sd)}`))
  return (
    <div>
      <Bin
        xs={xs}
        mixture={mixture}
        hard={hard}
        tags={tags}
        shares={shares}
        label={`${xs.length} croissants and ${mixture.length} ${hard ? 'k-means centres' : 'fitted bells'} after round ${Math.floor(at)}: ${mixture.map((c) => (hard ? `centre ${one(c.mean)} grams` : `${one(c.mean)} grams ± ${one(c.sd)}`)).join('; ')}`}
      />
      <Climb run={run} upTo={at} hard={hard} />
    </div>
  )
}

// The log-likelihood round by round, in a strip under the bin: it only ever
// goes up. k-means has no likelihood to show.
function Climb({ run, upTo, hard }: { run: Round[]; upTo: number; hard: boolean }) {
  const values = run.map((r) => r.logLikelihood)
  const low = Math.min(...values)
  const high = Math.max(...values)
  const x = (round: number) => LEFT + (round / LAB_ROUNDS) * (RIGHT - LEFT)
  const y = (v: number) => BOTTOM - ((v - low) / Math.max(1e-9, high - low)) * (BOTTOM - TOP)
  const whole = Math.floor(upTo)
  const points = values.slice(0, whole + 1).map((v, r) => `${r ? 'L' : 'M'}${x(r).toFixed(1)},${y(v).toFixed(1)}`)
  if (whole < LAB_ROUNDS && upTo > whole) {
    const v = values[whole] + (values[whole + 1] - values[whole]) * (upTo - whole)
    points.push(`L${x(upTo).toFixed(1)},${y(v).toFixed(1)}`)
  }
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-2 w-full" role="img" aria-label={hard ? 'k-means keeps no likelihood' : `The log-likelihood by round, rising from ${one(values[0])} and never falling`}>
      <text x={LEFT} y={12} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {hard ? 'k-means: all or nothing, no likelihood to climb' : 'log-likelihood, round by round'}
      </text>
      <line x1={LEFT} x2={RIGHT} y1={BOTTOM} y2={BOTTOM} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      {[0, 10, 20, 30, 40].map((r) => (
        <text key={r} x={x(r)} y={BOTTOM + 16} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] tabular-nums">
          {r}
        </text>
      ))}
      {!hard && (
        <g>
          <text x={LEFT - 8} y={TOP + 4} textAnchor="end" className="fill-zinc-faded font-mono text-[11px] tabular-nums">
            {Math.round(high)}
          </text>
          <text x={LEFT - 8} y={BOTTOM + 4} textAnchor="end" className="fill-zinc-faded font-mono text-[11px] tabular-nums">
            {Math.round(low)}
          </text>
          <path d={points.join(' ')} className="fill-none stroke-sage" strokeWidth={2.25} />
          <circle cx={x(upTo)} cy={y(values[whole] + (whole < LAB_ROUNDS ? (values[whole + 1] - values[whole]) * (upTo - whole) : 0))} r={3.5} className="fill-sage" />
        </g>
      )}
    </svg>
  )
}
