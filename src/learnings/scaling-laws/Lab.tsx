import { Readout } from '../../components/explain/figure'
import { bestSplit, CHINCHILLA, count, FIT, GOPHER, LAB, lossAt, lossOf, ratio, sci, tokensFor, two } from './model'

const WIDTH = 640
const HEIGHT = 340
const PLOT = { left: 48, right: 620, top: 34, bottom: 290 }
// Loss above the floor, on a log scale, so each budget's best lies on a line
const EXCESS = { low: 0.04, high: 3 }
const Y_TICKS = [0.05, 0.1, 0.3, 1, 3]
const X_TICKS = [7, 8, 9, 10, 11, 12, 13]
// A paper-coloured outline, so a label stays readable over the lines it crosses
const HALO = { strokeWidth: 4, strokeLinejoin: 'round', style: { paintOrder: 'stroke' } } as const
const X_NAMES: Record<number, string> = { 7: '10M', 8: '100M', 9: '1B', 10: '10B', 11: '100B', 12: '1T', 13: '10T' }

const x = (n: number) => PLOT.left + ((Math.log10(n) - LAB.minLogN) / (LAB.maxLogN - LAB.minLogN)) * (PLOT.right - PLOT.left)
const y = (loss: number) =>
  PLOT.bottom -
  ((Math.log(loss - FIT.E) - Math.log(EXCESS.low)) / (Math.log(EXCESS.high) - Math.log(EXCESS.low))) * (PLOT.bottom - PLOT.top)
const onAxes = (loss: number) => loss - FIT.E <= EXCESS.high

// One budget's valley: the loss of every model size it could buy
function valley(c: number) {
  const low = Math.max(10 ** LAB.minLogN, Math.sqrt(c / 6 / LAB.maxPerParam))
  const high = Math.min(10 ** LAB.maxLogN, Math.sqrt(c / 6 / LAB.minPerParam))
  const points: string[] = []
  for (let i = 0; i <= 140; i++) {
    const n = low * (high / low) ** (i / 140)
    const loss = Math.min(lossAt(c, n), FIT.E + EXCESS.high * 1.5)
    points.push(`${i ? 'L' : 'M'}${x(n).toFixed(1)},${y(loss).toFixed(1)}`)
  }
  return points.join(' ')
}

// Worked out once: the fixed valleys, and the best split for every budget
const VALLEYS = LAB.budgets.map((logC) => ({ logC, d: valley(10 ** logC), best: bestSplit(10 ** logC) }))
const FRONTIER = Array.from({ length: 41 }, (_, i) => bestSplit(10 ** (17 + i / 4)))
  .filter((b) => b.n >= 10 ** LAB.minLogN && b.n <= 10 ** LAB.maxLogN && onAxes(b.loss))
  .map((b, i) => `${i ? 'L' : 'M'}${x(b.n).toFixed(1)},${y(b.loss).toFixed(1)}`)
  .join(' ')
const MARKED = [GOPHER, CHINCHILLA].map((m) => ({ ...m, loss: lossOf(m.n, m.d) }))

// Spend a compute budget: the reader picks the budget and the model size,
// the tokens are what is left (C ≈ 6ND), and the loss comes from the fitted
// law. Log–log axes: parameters across, loss up.
export default function Lab({ logC, logN }: { logC: number; logN: number }) {
  const c = 10 ** logC
  const n = 10 ** logN
  const d = tokensFor(c, n)
  const loss = lossAt(c, n)
  const best = bestSplit(c)
  const path = valley(c)
  const onPlot = onAxes(loss)

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`With ${sci(c)} FLOPs, a model of ${count(n)} parameters trains on ${count(d)} tokens and reaches a loss of ${two(loss)}. The best split of this budget is ${count(best.n)} parameters on ${count(best.d)} tokens, a loss of ${two(best.loss)}.`}
      >
        <defs>
          <clipPath id="scaling-lab-plot">
            <rect x={PLOT.left} y={PLOT.top} width={PLOT.right - PLOT.left} height={PLOT.bottom - PLOT.top} />
          </clipPath>
        </defs>

        {Y_TICKS.map((v) => (
          <g key={v}>
            <line x1={PLOT.left} x2={PLOT.right} y1={y(FIT.E + v)} y2={y(FIT.E + v)} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeDasharray="2 4" />
            <text x={PLOT.left - 8} y={y(FIT.E + v) + 4} textAnchor="end" className="fill-zinc-faded font-mono text-[10px]">
              {v}
            </text>
          </g>
        ))}
        {X_TICKS.map((k) => (
          <g key={k}>
            <line x1={x(10 ** k)} x2={x(10 ** k)} y1={PLOT.bottom} y2={PLOT.bottom + 5} className="stroke-zinc-400" />
            <text x={x(10 ** k)} y={PLOT.bottom + 19} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
              {X_NAMES[k]}
            </text>
          </g>
        ))}
        <line x1={PLOT.left} x2={PLOT.right} y1={PLOT.bottom} y2={PLOT.bottom} className="stroke-zinc-400" />
        <line x1={PLOT.left} x2={PLOT.left} y1={PLOT.top} y2={PLOT.bottom} className="stroke-zinc-400" />
        <text x={PLOT.right} y={PLOT.bottom + 38} textAnchor="end" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          parameters (log scale)
        </text>
        <text x={PLOT.left} y={PLOT.top - 16} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          loss above the floor of {two(FIT.E)} (log scale)
        </text>

        <g clipPath="url(#scaling-lab-plot)">
          {/* A few budgets, faint, and the best split of every budget */}
          {VALLEYS.map((v) => (
            <path key={v.logC} d={v.d} className="fill-none stroke-ink" strokeOpacity={0.22} strokeWidth={1.2} />
          ))}
          <path d={FRONTIER} className="fill-none stroke-ink" strokeWidth={1.2} strokeDasharray="5 4" strokeOpacity={0.7} />

          {/* This budget */}
          <path d={path} className="fill-none stroke-sage" strokeWidth={2.2} />
          <circle cx={x(best.n)} cy={y(best.loss)} r={6} className="fill-paper stroke-ink" strokeWidth={1.5} />
          {onPlot && <circle cx={x(n)} cy={y(loss)} r={6} className="fill-sage stroke-ink" strokeWidth={1.5} />}

          {MARKED.map((m) => (
            <g key={m.name}>
              <rect x={x(m.n) - 3} y={y(m.loss) - 3} width={6} height={6} className="fill-ink" />
              <text
                x={x(m.n) + (m === MARKED[0] ? 8 : -10)}
                y={y(m.loss) + (m === MARKED[0] ? -6 : -10)}
                textAnchor={m === MARKED[0] ? 'start' : 'end'}
                className="fill-ink stroke-paper font-mono text-[10px] uppercase tracking-widest"
                {...HALO}
              >
                {m.name}
              </text>
            </g>
          ))}
        </g>

        {VALLEYS.map((v) =>
          onAxes(v.best.loss) ? (
            <text key={v.logC} x={x(v.best.n) - 6} y={y(v.best.loss) + 16} textAnchor="end" className="fill-zinc-faded stroke-paper font-mono text-[10px]" {...HALO}>
              10
              <tspan dy={-5} className="text-[8px]">
                {v.logC}
              </tspan>
            </text>
          ) : null
        )}
      </svg>
      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
        <Readout label="Tokens" value={count(d)} />
        <Readout label="Tokens per parameter" value={ratio(d / n)} />
        <Readout label="Loss" value={two(loss)} accent />
        <Readout label="Best here" value={`${two(best.loss)} at ${count(best.n)}`} />
      </div>
    </div>
  )
}
