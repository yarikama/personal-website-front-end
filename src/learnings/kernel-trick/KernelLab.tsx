import { useId } from 'react'
import { Readout } from '../../components/explain/figure'
import { BOX, GRID, labData, labFit, type Dataset, type KernelName, type Sigma } from './model'

const SIZE = 400
const PAD = 8
const x = (v: number) => PAD + ((v + BOX) / (2 * BOX)) * (SIZE - 2 * PAD)
const y = (v: number) => PAD + ((BOX - v) / (2 * BOX)) * (SIZE - 2 * PAD)
const CELL = (SIZE - 2 * PAD) / GRID
const pct = (share: number) => `${Math.round(100 * share)}%`

// A kernel classifier fitted to seeded two-class data: the region it calls
// sage, shaded, and the training points over it
export default function KernelLab({ dataset, kernel, sigma }: { dataset: Dataset; kernel: KernelName; sigma: Sigma }) {
  const data = labData(dataset)
  const fit = labFit(dataset, kernel, sigma)
  const clip = `lab-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return (
    <div>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto block w-full max-w-md"
        role="img"
        aria-label={`${dataset}: ${data.points.length} training points in two colours, and the region a ${kernel.toLowerCase()} kernel${kernel === 'Gaussian' ? ` with sigma ${sigma}` : ''} calls sage. It gets ${pct(fit.train)} of the training points right and ${pct(fit.test)} of new ones.`}
      >
        <clipPath id={clip}>
          <rect x={PAD} y={PAD} width={SIZE - 2 * PAD} height={SIZE - 2 * PAD} rx={12} />
        </clipPath>
        <rect x={PAD} y={PAD} width={SIZE - 2 * PAD} height={SIZE - 2 * PAD} rx={12} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
        <g className="fill-sage/25" shapeRendering="crispEdges" clipPath={`url(#${clip})`}>
          {fit.runs.map((runs, row) =>
            runs.map(([from, to]) => (
              <rect key={`${row} ${from}`} x={PAD + from * CELL} y={PAD + row * CELL} width={(to - from) * CELL + 0.6} height={CELL + 0.6} />
            )),
          )}
        </g>
        {data.points.map((p, i) => (
          <circle
            key={i}
            cx={x(p[0])}
            cy={y(p[1])}
            r={5}
            className={`${data.labels[i] === 1 ? 'fill-sage' : 'fill-ink'} stroke-paper`}
            strokeWidth={1.5}
          />
        ))}
      </svg>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Readout label="Training right" value={pct(fit.train)} />
        <Readout label="New points right" value={pct(fit.test)} accent />
        <Readout label="Points it leans on" value={fit.support} />
      </div>
    </div>
  )
}
