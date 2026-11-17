import { usePlay } from '../../components/explain/useLoop'
import { frameAt } from './frames'
import { PICNIC, type State } from './model'
import { sx, sy } from './parkLayout'
import Scatter from './Scatter'

const WORDS = {
  park: {
    start: 'Trucks parked · nobody has walked yet',
    assign: 'Everyone walks to the nearest truck',
    update: 'Each truck drives to the middle of its customers',
    done: 'Nobody switches · done',
    score: 'Walking score',
  },
  named: {
    start: 'k centres',
    assign: 'Assign each point to its nearest centre',
    update: 'Move each centre to the mean of its cluster',
    done: 'Converged',
    score: 'Objective J',
  },
}

// The story's park: picnickers in three crowds and three food trucks,
// playing a run of Lloyd's algorithm from half-step `from` to `to` at
// `pace` ms each. `named` relabels it as k-means. Give it a `key` per step.
export default function Park({
  trace,
  from,
  to,
  pace,
  named = false,
}: {
  trace: State[]
  from: number
  to: number
  pace: number
  named?: boolean
}) {
  const played = usePlay(to - from, pace)
  const t = from + played
  const frame = frameAt(PICNIC, trace, t)
  const words = WORDS[named ? 'named' : 'park']
  const done = t >= trace.length - 1
  const said = done ? words.done : words[frame.phase]

  // In the reveal, name one point, one centre and one cluster
  const centre = frame.centres[0]
  const point = PICNIC[PICNIC.reduce((far, p, i) => (frame.labels?.[i] === 1 && p[1] > PICNIC[far][1] ? i : far), 0)]

  return (
    <div>
      <div className="flex min-h-[1.5rem] flex-wrap items-baseline justify-between gap-x-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="text-sage-ink">
          {frame.phase === 'start' && !done ? said : `Round ${frame.round} · ${said}`}
        </span>
        <span className="text-zinc-faded tabular-nums">
          {words.score} <span className="text-ink">{frame.cost === null ? '—' : frame.cost.toFixed(1)}</span>
        </span>
      </div>
      <Scatter
        points={PICNIC}
        frame={frame}
        label={
          named
            ? 'The same park, relabelled: each picnicker is a data point, each truck a centre, each truck’s customers a cluster, and the walking score the k-means objective'
            : `Picnickers in three crowds and three food trucks, round ${frame.round}: ${said}`
        }
      >
        {named && frame.labels && (
          <g className="fill-ink font-mono text-[12px]">
            <text x={sx(centre[0]) - 20} y={sy(centre[1]) + 32} textAnchor="end">
              centre μ
            </text>
            <text x={sx(point[0]) + 10} y={sy(point[1]) - 10}>
              point x
            </text>
            <text x={sx(Math.max(...PICNIC.filter((_, i) => frame.labels![i] === 2).map((p) => p[0]))) + 12} y={sy(frame.centres[2][1]) + 4}>
              its cluster
            </text>
          </g>
        )}
      </Scatter>
    </div>
  )
}
