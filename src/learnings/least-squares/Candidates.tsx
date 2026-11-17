import { Dot, LinePath, Plot } from './Chart'
import { AGES, ageX, priceY, RIGHT, STORY_SCALE } from './chartScale'
import { CANDIDATES, ODD, priceAt, SALES, type Line } from './model'

// The guess: five sales and four lines through them, A to D, none marked
export default function Candidates() {
  return (
    <Plot
      scale={STORY_SCALE}
      label="Five bike sales by age and price, four on one straight pattern and the five-year-old well above it, with four candidate lines labelled A to D"
    >
      {CANDIDATES.map(({ name, line }) => (
        <g key={name}>
          <LinePath line={line} scale={STORY_SCALE} className="stroke-zinc-400 dark:stroke-zinc-200/40" width={1.75} />
          <Tag name={name} age={tagAge(line)} y={priceY(priceAt(line, tagAge(line)), STORY_SCALE)} />
        </g>
      ))}
      {SALES.map((sale, i) => (
        <Dot key={i} sale={sale} scale={STORY_SCALE} odd={i === ODD} />
      ))}
    </Plot>
  )
}

// Where a line's tag sits: near the chart's right edge, or just before the
// line leaves the bottom of the chart if it does so first
function tagAge(line: Line) {
  const floor = STORY_SCALE.low + 20
  const leaves = line.perYear < 0 ? (floor - line.start) / line.perYear : Infinity
  return Math.min(AGES[1] - 0.25, leaves)
}

function Tag({ name, age, y }: { name: string; age: number; y: number }) {
  const x = Math.min(RIGHT - 12, ageX(age))
  return (
    <g>
      <circle cx={x} cy={y} r={11} className="fill-paper stroke-zinc-400" strokeWidth={1.5} />
      <text x={x} y={y + 4} textAnchor="middle" className="fill-ink font-mono text-[12px]">
        {name}
      </text>
    </g>
  )
}
