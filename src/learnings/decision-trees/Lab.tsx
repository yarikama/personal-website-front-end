import { Readout } from '../../components/explain/figure'
import { boundary, FULL_DEPTH, PLANE_BOX, TRAIN, pct, type Grown } from './model'
import Plane from './Plane'
import TreeDiagram from './TreeDiagram'

const TICKS: [number[], number[]] = [
  [0, 2, 4, 6, 8, 10],
  [0, 2, 4, 6, 8, 10],
]
const CHART_W = 560
const CHART_H = 150
const C_LEFT = 44
const C_RIGHT = 500
const C_TOP = 12
const C_BOTTOM = 118
const LOW = 0.5

// A tree grown on 200 noisy points to a given depth: its boxes over the
// points (the dashed curve is the true boundary), the tree itself, and how
// often it is right on the points it learned from and on 3,000 new ones, at
// every depth.
export default function Lab({ grown, at }: { grown: Grown[]; at: number }) {
  const shown = grown[at]
  const cx = (d: number) => C_LEFT + (d / FULL_DEPTH) * (C_RIGHT - C_LEFT)
  const cy = (a: number) => C_BOTTOM - ((a - LOW) / (1 - LOW)) * (C_BOTTOM - C_TOP)
  const line = (key: 'train' | 'test') => grown.map((g, d) => `${d ? 'L' : 'M'}${cx(d).toFixed(1)},${cy(g[key]).toFixed(1)}`).join(' ')
  const end = grown[grown.length - 1]

  return (
    <div>
      <div className="grid items-start gap-4 sm:grid-cols-[4fr_3fr]">
        <Plane
          points={TRAIN}
          box={PLANE_BOX}
          tree={shown.tree}
          names={['feature x₁', 'feature x₂']}
          ticks={TICKS}
          curve={boundary}
          dot={3}
          label={`200 training points in two classes, and the boxes of a tree of depth ${shown.depth} with ${shown.leaves} leaves`}
        />
        <TreeDiagram
          tree={shown.tree}
          features={['x₁', 'x₂']}
          classes={['', '']}
          dots
          label={`The tree: depth ${shown.depth}, ${shown.leaves} leaves`}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
        <Readout label="Leaves" value={shown.leaves} />
        <Readout label="Right on training" value={pct(shown.train)} />
        <Readout label="Right on new points" value={pct(shown.test)} accent />
      </div>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="mt-4 w-full"
        role="img"
        aria-label={`Accuracy by depth: on the training points it climbs to ${pct(end.train)}; on new points it peaks and ends at ${pct(end.test)}`}
      >
        {[0.5, 0.75, 1].map((a) => (
          <g key={a}>
            <line x1={C_LEFT} x2={C_RIGHT} y1={cy(a)} y2={cy(a)} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
            <text x={C_LEFT - 6} y={cy(a) + 3.5} textAnchor="end" className="fill-zinc-faded font-mono text-[10px]">
              {pct(a)}
            </text>
          </g>
        ))}
        {grown.map((g) => (
          <text key={g.depth} x={cx(g.depth)} y={C_BOTTOM + 14} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
            {g.depth}
          </text>
        ))}
        <text x={(C_LEFT + C_RIGHT) / 2} y={CHART_H - 2} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          depth
        </text>
        <line x1={cx(at)} x2={cx(at)} y1={C_TOP} y2={C_BOTTOM} className="stroke-zinc-400" strokeDasharray="3 3" />
        <path d={line('train')} className="fill-none stroke-ink" strokeWidth={1.5} strokeDasharray="5 4" />
        <path d={line('test')} className="fill-none stroke-sage" strokeWidth={2.5} />
        <circle cx={cx(at)} cy={cy(shown.train)} r={3.5} className="fill-ink" />
        <circle cx={cx(at)} cy={cy(shown.test)} r={4} className="fill-sage" />
        <text x={C_RIGHT + 6} y={cy(end.train) + 3.5} className="fill-ink font-mono text-[10px]">
          training
        </text>
        <text x={C_RIGHT + 6} y={cy(end.test) + 3.5} className="fill-sage-ink font-mono text-[10px]">
          new
        </text>
      </svg>
    </div>
  )
}
