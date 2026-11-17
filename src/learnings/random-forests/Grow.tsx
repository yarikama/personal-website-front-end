import { MOST_TREES, NOISE, two, type Run } from './model'

const WIDTH = 480
const HEIGHT = 290
const LEFT = 34
const RIGHT = 370
const TOP = 12
const BOTTOM = 236
const MOST = 3
const ERRORS = [0, 1, 2, 3]
const SIZES = [1, 10, 100]
// End labels may sit no closer than this
const GAP = 15

// Trees on a log scale, so the first few, where most of the drop is, get room
const x = (trees: number) => LEFT + (Math.log(trees) / Math.log(MOST_TREES)) * (RIGHT - LEFT)
const y = (error: number) => BOTTOM - (Math.min(error, MOST) / MOST) * (BOTTOM - TOP)

// Spread the end labels apart: from the top down, then back up from the bottom
function dodge(ys: number[]) {
  const order = ys.map((_, i) => i).sort((a, b) => ys[a] - ys[b])
  const placed = [...ys]
  for (let k = 1; k < order.length; k++) placed[order[k]] = Math.max(placed[order[k]], placed[order[k - 1]] + GAP)
  const last = order.at(-1)!
  if (placed[last] > BOTTOM) placed[last] = BOTTOM
  for (let k = order.length - 2; k >= 0; k--) placed[order[k]] = Math.min(placed[order[k]], placed[order[k + 1]] - GAP)
  return placed
}

const line = (curve: number[]) => curve.map((e, i) => `${x(i + 1).toFixed(1)},${y(e).toFixed(1)}`).join(' ')

// Test error as trees are added: bagging in ink, the chosen forest in sage
// with its out-of-bag estimate dashed and its floor dotted, and one tree on
// its own for scale. The chosen number of trees is marked.
export default function Grow({ bagging, forest, trees }: { bagging: Run; forest: Run; trees: number }) {
  const same = forest.m === bagging.m
  const floor = forest.rho * forest.variance + NOISE ** 2
  const series = [
    { name: 'one tree', at: forest.oneTree, text: 'fill-zinc-faded' },
    ...(same ? [] : [{ name: 'bagging', at: bagging.test.at(-1)!, text: 'fill-ink' }]),
    { name: same ? 'bagging' : `m = ${forest.m}`, at: forest.test.at(-1)!, text: 'fill-sage-ink' },
    { name: 'out-of-bag', at: forest.oob.at(-1)!, text: 'fill-sage-ink' },
    { name: 'floor', at: floor, text: 'fill-sage-ink' },
  ]
  const labels = dodge(series.map((s) => y(s.at)))
  const here = forest.test[trees - 1]
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`Test error against the number of trees, 1 to ${MOST_TREES}, on a log scale. With m = ${forest.m} and ${trees} trees the test error is ${two(here)} and the out-of-bag estimate ${two(forest.oob[trees - 1])}; bagging's is ${two(bagging.test[trees - 1])}. One tree alone averages ${two(forest.oneTree)}.`}
    >
      {ERRORS.map((tick) => (
        <g key={tick}>
          <line
            x1={LEFT}
            x2={RIGHT}
            y1={y(tick)}
            y2={y(tick)}
            className="stroke-zinc-300 dark:stroke-zinc-200/20"
            strokeWidth={tick === 0 ? 1.25 : 0.75}
          />
          <text x={LEFT - 6} y={y(tick) + 4} textAnchor="end" className="fill-zinc-faded font-mono text-[11px] tabular-nums">
            {tick}
          </text>
        </g>
      ))}
      {SIZES.map((size) => (
        <text key={size} x={x(size)} y={BOTTOM + 17} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] tabular-nums">
          {size}
        </text>
      ))}
      <text x={(LEFT + RIGHT) / 2} y={BOTTOM + 40} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        trees
      </text>
      <line x1={x(trees)} x2={x(trees)} y1={TOP} y2={BOTTOM} className="stroke-zinc-400" strokeWidth={1} />

      <line x1={LEFT} x2={RIGHT} y1={y(forest.oneTree)} y2={y(forest.oneTree)} className="stroke-zinc-400" strokeWidth={1.5} strokeDasharray="1 4" strokeLinecap="round" />
      <line x1={LEFT} x2={RIGHT} y1={y(floor)} y2={y(floor)} className="stroke-sage" strokeWidth={1.5} strokeDasharray="1 4" strokeLinecap="round" />
      {!same && <polyline points={line(bagging.test)} fill="none" className="stroke-ink" strokeWidth={2} strokeLinejoin="round" />}
      <polyline points={line(forest.oob)} fill="none" className="stroke-sage" strokeWidth={1.5} strokeDasharray="6 4" strokeLinejoin="round" />
      <polyline points={line(forest.test)} fill="none" className="stroke-sage" strokeWidth={2.5} strokeLinejoin="round" />

      {series.map((s, i) => (
        <g key={s.name}>
          {Math.abs(labels[i] - y(s.at)) > 3 && (
            <line x1={RIGHT + 2} x2={RIGHT + 8} y1={y(s.at)} y2={labels[i]} className="stroke-zinc-400" strokeWidth={0.75} />
          )}
          <text x={RIGHT + 10} y={labels[i] + 4} className={`${s.text} font-mono text-[11px]`}>
            {s.name}
          </text>
        </g>
      ))}

      {!same && <circle cx={x(trees)} cy={y(bagging.test[trees - 1])} r={4} className="fill-ink" />}
      <circle cx={x(trees)} cy={y(here)} r={4.5} className="fill-sage" />
    </svg>
  )
}
