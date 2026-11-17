import { lerp, usePlay } from '../../components/explain/useLoop'
import { Clipped, Dot, LinePath, Miss, Plot } from './Chart'
import { AGES, ageX, BOTTOM, perDollar, priceY, RIGHT, STORY_SCALE, TOP } from './chartScale'
import {
  BEST,
  count,
  dollars,
  misses,
  ODD,
  priceAt,
  SALES,
  searchAt,
  sumOfSquares,
  THROUGH_FOUR,
  YOUR_AGE,
  type Line,
} from './model'

export type Show = 'sales' | 'try' | 'square' | 'search' | 'best' | 'lean' | 'named'

const rule = (line: Line) =>
  `${dollars(line.start)} ${line.perYear < 0 ? '−' : '+'} ${dollars(Math.abs(line.perYear))} a year`

// How long each step plays, in ms per unit of usePlay
const PACE: Record<Show, [number, number]> = {
  sales: [SALES.length, 320],
  try: [2, 900],
  square: [1, 1400],
  search: [1, 7000],
  best: [1, 900],
  lean: [1, 900],
  named: [1, 900],
}

// The story's chart: five sales, the line being tried, and its misses. Give
// it a `key` per step, so each step plays from the start.
export default function Story({ show }: { show: Show }) {
  const [span, pace] = PACE[show]
  const played = usePlay(span, pace)
  const s = STORY_SCALE

  const line = show === 'try' || show === 'square' ? THROUGH_FOUR : show === 'search' ? searchAt(played) : BEST
  const total = sumOfSquares(SALES, line)
  const named = show === 'named'
  const shown = show === 'sales' ? Math.floor(played + 0.999) : SALES.length
  const squares = show !== 'sales' && show !== 'try'

  // The line drawing itself in, left to right, in the first step that has one
  const drawn = show === 'try' ? Math.min(1, played) : 1
  const gaps = show === 'try' ? Math.max(0, played - 1) : 1

  const heading: [string, string] =
    show === 'sales'
      ? ['Bikes like yours', `yours: ${YOUR_AGE} years old`]
      : show === 'try'
        ? [rule(line), `misses the odd sale by ${dollars(misses(SALES, line)[ODD])}`]
        : named
          ? ['Sum of squared residuals', count(total)]
          : [rule(line), `total of squares ${count(total)}`]

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="text-zinc-faded tabular-nums">{heading[0]}</span>
        <span className={`tabular-nums ${show === 'best' || named ? 'text-sage-ink' : 'text-ink'}`}>{heading[1]}</span>
      </div>
      <Plot
        scale={s}
        ageName={named ? 'Feature x: age' : 'Age (years)'}
        priceName={named ? 'Target y: price' : 'Price'}
        label={label(show, line, total)}
      >
        {show === 'sales' && (
          <g>
            <line
              x1={ageX(YOUR_AGE)}
              x2={ageX(YOUR_AGE)}
              y1={TOP + 22}
              y2={BOTTOM}
              className="stroke-zinc-400"
              strokeWidth={1.5}
              strokeDasharray="4 5"
            />
            <text
              x={ageX(YOUR_AGE) + 8}
              y={TOP + 34}
              className="fill-ink font-mono text-[11px] uppercase tracking-widest"
            >
              Your bike: what price?
            </text>
          </g>
        )}
        {show === 'lean' && <LinePath line={THROUGH_FOUR} scale={s} className="stroke-zinc-400" dashed width={1.75} />}
        {show !== 'sales' && (
          <Clipped>
            <line
              x1={ageX(AGES[0])}
              y1={priceY(priceAt(line, AGES[0]), s)}
              x2={ageX(lerp(AGES[0], AGES[1], drawn))}
              y2={priceY(priceAt(line, lerp(AGES[0], AGES[1], drawn)), s)}
              className="stroke-sage"
              strokeWidth={3}
              strokeLinecap="round"
            />
          </Clipped>
        )}
        {show !== 'sales' &&
          gaps > 0 &&
          SALES.map((sale, i) => (
            <g key={i} opacity={gaps}>
              <Miss
                sale={sale}
                line={line}
                scale={s}
                square={squares && (show !== 'square' || i === ODD)}
                grow={show === 'square' ? played : 1}
                strong={i === ODD && (show === 'square' || show === 'lean')}
              />
            </g>
          ))}
        {SALES.slice(0, shown).map((sale, i) => (
          <Dot key={i} sale={sale} scale={s} odd={i === ODD} />
        ))}
        {show === 'try' && gaps > 0.5 && <GapLabel line={line} text={dollars(misses(SALES, line)[ODD])} />}
        {(show === 'square' || show === 'lean') && <SquareLabel line={line} grow={show === 'square' ? played : 1} />}
        {show === 'best' && <YourPrice line={line} />}
        {named && (
          <g className="font-mono text-[11px] uppercase tracking-widest">
            <text x={RIGHT - 4} y={priceY(priceAt(line, 7.6), s) + 26} textAnchor="end" className="fill-sage-ink">
              weights w: {dollars(line.start)}, {dollars(line.perYear)}
            </text>
            <text
              x={ageX(SALES[ODD].age) + Math.abs(misses(SALES, line)[ODD]) * perDollar(s) + 8}
              y={(priceY(SALES[ODD].price, s) + priceY(priceAt(line, SALES[ODD].age), s)) / 2 + 4}
              className="fill-ink"
            >
              residual
            </text>
          </g>
        )}
      </Plot>
    </div>
  )
}

function GapLabel({ line, text }: { line: Line; text: string }) {
  const sale = SALES[ODD]
  const y = (priceY(sale.price, STORY_SCALE) + priceY(priceAt(line, sale.age), STORY_SCALE)) / 2
  return (
    <text x={ageX(sale.age) + 10} y={y + 4} className="fill-ink font-mono text-[12px] tabular-nums">
      {text}
    </text>
  )
}

// The odd sale's square, with its area written in it
function SquareLabel({ line, grow }: { line: Line; grow: number }) {
  const sale = SALES[ODD]
  const miss = misses(SALES, line)[ODD]
  const side = Math.abs(miss) * perDollar(STORY_SCALE) * grow
  const onLine = priceY(priceAt(line, sale.age), STORY_SCALE)
  if (grow < 0.6) return null
  // Inside the square when it fits, beside it when it doesn't
  const inside = side > 60
  return (
    <text
      x={ageX(sale.age) + (inside ? side / 2 : side + 6)}
      y={onLine - side / 2 + 4}
      textAnchor={inside ? 'middle' : 'start'}
      className="fill-ink font-mono text-[12px] tabular-nums"
    >
      {count(miss * miss)}
    </text>
  )
}

function YourPrice({ line }: { line: Line }) {
  const price = priceAt(line, YOUR_AGE)
  const x = ageX(YOUR_AGE)
  const y = priceY(price, STORY_SCALE)
  return (
    <g>
      <circle cx={x} cy={y} r={7} className="fill-sage stroke-paper" strokeWidth={2} />
      <text
        x={x - 12}
        y={y + 22}
        textAnchor="end"
        className="fill-sage-ink font-mono text-[12px] uppercase tracking-widest tabular-nums"
      >
        yours: {dollars(price)}
      </text>
    </g>
  )
}

function label(show: Show, line: Line, total: number) {
  const sales = 'Five bike sales by age and price; the five-year-old sold well above the pattern of the other four.'
  if (show === 'sales') return `${sales} Your three-year-old bike's price is unknown.`
  return `${sales} The line ${rule(line)}, with each sale's miss drawn as a gap${show === 'try' ? '' : ' and a square'}; the squares add to ${count(total)}.`
}
