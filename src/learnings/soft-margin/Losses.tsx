import { hinge, logLoss, WORKED } from './model'

const WIDTH = 600
const HEIGHT = 300
const LEFT = 48
const RIGHT = 584
const TOP = 34
const BOTTOM = 258
const T: [number, number] = [-2, 3]
const LOSS = 3.2

const x = (t: number) => LEFT + ((t - T[0]) / (T[1] - T[0])) * (RIGHT - LEFT)
const y = (loss: number) => BOTTOM - (Math.min(loss, LOSS) / LOSS) * (BOTTOM - TOP)

function curve(loss: (t: number) => number) {
  return Array.from({ length: 201 }, (_, i) => {
    const t = T[0] + ((T[1] - T[0]) * i) / 200
    return `${i ? 'L' : 'M'}${x(t).toFixed(1)},${y(loss(t)).toFixed(1)}`
  }).join(' ')
}
const HINGE = curve(hinge)
const LOG = curve(logLoss)

const LEGEND = [
  { name: 'hinge: the SVM', line: 'stroke-sage', width: 3.5, dash: undefined },
  { name: 'log loss: logistic', line: 'stroke-zinc-400', width: 2, dash: '7 5' },
  { name: '0-1: a mistake', line: 'stroke-ink', width: 2, dash: undefined },
]

const HALO = { strokeWidth: 4, strokeLinejoin: 'round', style: { paintOrder: 'stroke' } } as const

// Three losses of y·f(x), how far a point sits on its own side: the count
// of mistakes, the hinge and the log loss, with the worked points on the
// hinge
export default function Losses() {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label="Loss against y times f of x, from minus 2 to 3. The 0-1 loss is 1 up to 0 and then 0. The hinge loss falls in a straight line from 3 at minus 2 to 0 at 1, and stays 0 after. The log loss is a smooth curve close to the hinge on the left that never quite reaches 0. The worked points sit on the hinge at 1.6, 0.6 and minus 0.7, costing 0, 0.4 and 1.7."
    >
      {/* Axes, and where the line and the street's edge are */}
      <line x1={LEFT} x2={RIGHT} y1={BOTTOM} y2={BOTTOM} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      <line x1={LEFT} x2={LEFT} y1={TOP - 8} y2={BOTTOM} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      {[0, 1].map((t) => (
        <line key={t} x1={x(t)} x2={x(t)} y1={TOP - 8} y2={BOTTOM} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeDasharray="3 5" />
      ))}
      <text x={x(0)} y={TOP - 14} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        On the line
      </text>
      <text x={x(1)} y={TOP - 14} textAnchor="start" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest" dx={-8}>
        Street edge
      </text>
      {[-2, -1, 0, 1, 2, 3].map((t) => (
        <text key={t} x={x(t)} y={BOTTOM + 18} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] tabular-nums">
          {t < 0 ? `−${-t}` : t}
        </text>
      ))}
      {[1, 2, 3].map((loss) => (
        <text key={loss} x={LEFT - 10} y={y(loss) + 4} textAnchor="end" className="fill-zinc-faded font-mono text-[11px] tabular-nums">
          {loss}
        </text>
      ))}
      <text x={RIGHT} y={BOTTOM + 36} textAnchor="end" className="fill-zinc-faded font-mono text-[12px]">
        y · f(x) →
      </text>

      {/* The 0-1 loss: one for a mistake, nothing otherwise */}
      <path d={`M${x(T[0])},${y(1)} H${x(0)}`} className="fill-none stroke-ink" strokeWidth={2} />
      <path d={`M${x(0)},${y(1)} V${y(0)}`} className="fill-none stroke-ink" strokeWidth={1} strokeDasharray="2 3" />
      <path d={`M${x(0)},${y(0)} H${x(T[1])}`} className="fill-none stroke-ink" strokeWidth={2} />
      <path d={LOG} className="fill-none stroke-zinc-400" strokeWidth={2} strokeDasharray="7 5" />
      <path d={HINGE} className="fill-none stroke-sage" strokeWidth={3.5} strokeLinejoin="round" />

      {/* Which line is which, in the empty corner */}
      {LEGEND.map((item, k) => (
        <g key={item.name} transform={`translate(${x(1.45)} ${y(2.9) + k * 24})`}>
          <line x1={0} x2={34} y1={0} y2={0} className={item.line} strokeWidth={item.width} strokeDasharray={item.dash} />
          <text x={44} y={4} className="fill-ink font-mono text-[12px]">
            {item.name}
          </text>
        </g>
      ))}

      {WORKED.map((w) => (
        <g key={w.t}>
          <circle cx={x(w.t)} cy={y(hinge(w.t))} r={5.5} className="fill-paper stroke-ink" strokeWidth={2} />
          <text
            x={x(w.t) + (w.t > 1 ? 0 : -12)}
            y={y(hinge(w.t)) + (w.t > 1 ? -12 : 20)}
            textAnchor={w.t > 1 ? 'middle' : 'end'}
            className="fill-ink stroke-paper font-mono text-[12px] tabular-nums"
            {...HALO}
          >
            {Number(hinge(w.t).toFixed(2))}
          </text>
        </g>
      ))}
    </svg>
  )
}
