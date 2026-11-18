import { Readout } from '../../components/explain/figure'
import { usePlay } from '../../components/explain/useLoop'
import { labRun, METHODS, N, NEEDED, percent, STEPS, subtract, type Matrix, type Method, type Start } from './model'

const WIDTH = 400
const HEIGHT = 292
const CELL = 10
const GRIDS = [6, 140, 274]
const GRID_TOP = 22
const PLOT = { left: 34, right: 392, top: 176, bottom: 268 }
// The largest cell of the needed change sets the shading of all three grids
const LARGEST = Math.max(...NEEDED.flat().map(Math.abs))
// Real milliseconds for the whole run
const RUN_MS = 4200

const px = (t: number) => PLOT.left + ((PLOT.right - PLOT.left) * t) / STEPS
const py = (share: number) => PLOT.bottom - (PLOT.bottom - PLOT.top) * Math.min(1, share)

// A 12 × 12 change: sage cells raise a weight, ink cells lower it, fuller
// for a bigger change
function Grid({ x, matrix, title }: { x: number; matrix: Matrix; title: string }) {
  return (
    <g>
      <text x={x + (N * CELL) / 2} y={GRID_TOP - 8} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
        {title}
      </text>
      <rect x={x - 0.5} y={GRID_TOP - 0.5} width={N * CELL + 1} height={N * CELL + 1} rx={3} className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25" />
      {matrix.map((row, i) =>
        row.map((value, j) => (
          <rect
            key={`${i} ${j}`}
            x={x + j * CELL + 0.5}
            y={GRID_TOP + i * CELL + 0.5}
            width={CELL - 1}
            height={CELL - 1}
            rx={1.5}
            className={value >= 0 ? 'fill-sage' : 'fill-ink'}
            fillOpacity={0.95 * Math.min(1, Math.abs(value) / LARGEST) ** 0.75}
          />
        )),
      )}
    </g>
  )
}

const curve = (missed: number[], until: number) =>
  missed
    .slice(0, until + 1)
    .map((share, t) => `${t ? 'L' : 'M'}${px(t).toFixed(1)},${py(share).toFixed(1)}`)
    .join(' ')

// The lab: the needed change, what the chosen method has learned so far,
// and what it still misses, as training runs; under them, the share missed
// at every step, for the chosen method in sage and the others faint. Give
// it a `key` per setting so it plays again from the start.
export default function Lab({ method, start }: { method: Method; start: Start }) {
  const run = labRun(method, start)
  const step = Math.round(usePlay(1, RUN_MS) * STEPS)
  const learned = run.changes[step]
  const missed = run.missed[step]

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`A 12 by 12 layer learns a change. ${method === 'Full' ? 'Full fine-tuning' : `LoRA at ${method.toLowerCase()}`}, starting with ${start.toLowerCase()}, trains ${run.params} numbers and after ${STEPS} steps misses ${percent(run.missed[STEPS])} of the needed change.`}
      >
        <Grid x={GRIDS[0]} matrix={NEEDED} title="Needed" />
        <Grid x={GRIDS[1]} matrix={learned} title={method === 'Full' ? 'Learned' : 'Learned B A'} />
        <Grid x={GRIDS[2]} matrix={subtract(NEEDED, learned)} title="Missed" />

        {/* The share missed, step by step */}
        <text x={PLOT.left} y={PLOT.top - 12} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          Share of the change missed
        </text>
        <line x1={PLOT.left} x2={PLOT.right} y1={PLOT.bottom} y2={PLOT.bottom} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        <line x1={PLOT.left} x2={PLOT.left} y1={PLOT.top} y2={PLOT.bottom} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        <line x1={PLOT.left} x2={PLOT.right} y1={PLOT.top} y2={PLOT.top} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeDasharray="2 4" />
        {[0, 1].map((share) => (
          <text key={share} x={PLOT.left - 6} y={py(share) + 3.5} textAnchor="end" className="fill-zinc-faded font-mono text-[10px] tabular-nums">
            {share ? '100%' : '0%'}
          </text>
        ))}
        {[0, STEPS].map((t) => (
          <text key={t} x={px(t)} y={PLOT.bottom + 16} textAnchor={t ? 'end' : 'start'} className="fill-zinc-faded font-mono text-[10px] tabular-nums">
            {t ? `step ${t}` : '0'}
          </text>
        ))}
        {METHODS.filter((other) => other !== method).map((other) => (
          <path
            key={other}
            d={curve(labRun(other, start).missed, step)}
            className="fill-none stroke-ink"
            strokeOpacity={0.3}
            strokeWidth={1.2}
          />
        ))}
        <path d={curve(run.missed, step)} className="fill-none stroke-sage" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={px(step)} cy={py(missed)} r={4} className="fill-sage" />
      </svg>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Readout label="Numbers trained" value={run.params} />
        <Readout label="Step" value={step} />
        <Readout label="Missed" value={percent(missed)} accent />
      </div>
    </div>
  )
}
