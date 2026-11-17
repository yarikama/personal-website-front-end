import { useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import { Button, Choice, Controls, Readout } from '../../components/explain/figure'
import { LinePath, Miss, Plot } from './Chart'
import { AGES, ageX, BOTTOM, HEIGHT, LAB_SCALE, LEFT, priceY, RIGHT, TOP, WIDTH } from './chartScale'
import { count, dollars, fitLine, misses, OUTLIER, SALES, sumOfSquares, type Sale } from './model'

const VIEWS = ['gaps', 'squares'] as const
type View = (typeof VIEWS)[number]
const MOST = 14
const AGE_RANGE: [number, number] = [0.2, 7.8]
const PRICE_RANGE: [number, number] = [20, 780]

const clamp = (value: number, [low, high]: [number, number]) => Math.max(low, Math.min(high, value))

// Where a pointer is, in the chart's age and price
function toSale(svg: SVGSVGElement, clientX: number, clientY: number): Sale {
  const box = svg.getBoundingClientRect()
  const x = ((clientX - box.left) / box.width) * WIDTH
  const y = ((clientY - box.top) / box.height) * HEIGHT
  const age = AGES[0] + ((x - LEFT) / (RIGHT - LEFT)) * (AGES[1] - AGES[0])
  const price = LAB_SCALE.low + ((BOTTOM - y) / (BOTTOM - TOP)) * (LAB_SCALE.high - LAB_SCALE.low)
  return { age: clamp(age, AGE_RANGE), price: clamp(price, PRICE_RANGE) }
}

// Sales to drag, add and break: the least-squares line follows, with each
// sale's miss as a gap or as a square, and what the misses add up to
export default function Lab() {
  const [sales, setSales] = useState<Sale[]>(() => SALES.map((s) => ({ ...s })))
  const [view, setView] = useState<View>('squares')
  const dragging = useRef<number | null>(null)

  const line = fitLine(sales)
  const left = line ? misses(sales, line) : []
  const odd = sales.some((s) => s.age === OUTLIER.age && s.price === OUTLIER.price)

  const move = (i: number, to: Sale) => setSales((all) => all.map((s, j) => (j === i ? to : s)))

  const grab = (i: number) => (event: PointerEvent<SVGCircleElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragging.current = i
  }
  const drag = (i: number) => (event: PointerEvent<SVGCircleElement>) => {
    const svg = event.currentTarget.ownerSVGElement
    if (dragging.current !== i || !svg) return
    move(i, toSale(svg, event.clientX, event.clientY))
  }
  const drop = () => {
    dragging.current = null
  }
  // A tap, not a press, so a finger scrolling past the chart adds nothing
  const add = (event: MouseEvent<SVGRectElement>) => {
    const svg = event.currentTarget.ownerSVGElement
    if (!svg || sales.length >= MOST) return
    setSales((all) => [...all, toSale(svg, event.clientX, event.clientY)])
  }
  const nudge = (i: number) => (event: KeyboardEvent<SVGCircleElement>) => {
    const s = sales[i]
    const by: Record<string, Sale> = {
      ArrowUp: { age: s.age, price: s.price + 10 },
      ArrowDown: { age: s.age, price: s.price - 10 },
      ArrowLeft: { age: s.age - 0.25, price: s.price },
      ArrowRight: { age: s.age + 0.25, price: s.price },
    }
    const to = by[event.key]
    if (!to) return
    event.preventDefault()
    move(i, {
      age: clamp(to.age, AGE_RANGE),
      price: clamp(to.price, PRICE_RANGE),
    })
  }

  const sumMiss = left.reduce((sum, m) => sum + m, 0)
  const sumMissAge = left.reduce((sum, m, i) => sum + m * sales[i].age, 0)
  // −0 and rounding noise read as 0
  const zero = (value: number) => count(Math.abs(value) < 0.5 ? 0 : value)

  return (
    <div>
      <div className="select-none">
        <Plot
          scale={LAB_SCALE}
          label={
            line
              ? `${sales.length} sales. The least-squares line starts at ${dollars(line.start)} and changes by ${dollars(line.perYear)} a year; its squared misses add to ${count(sumOfSquares(sales, line))}.`
              : `${sales.length} sales, all the same age, so no single line is best.`
          }
        >
          <rect
            x={LEFT}
            y={TOP}
            width={RIGHT - LEFT}
            height={BOTTOM - TOP}
            className="fill-transparent"
            onClick={add}
            style={{ cursor: sales.length < MOST ? 'copy' : 'default' }}
          />
          {line && <LinePath line={line} scale={LAB_SCALE} className="stroke-sage" width={3} />}
          {line &&
            sales.map((sale, i) => (
              <Miss key={i} sale={sale} line={line} scale={LAB_SCALE} square={view === 'squares'} />
            ))}
          {sales.map((sale, i) => (
            <g key={i}>
              {/* A wider target than the dot, for a finger */}
              <circle
                cx={ageX(sale.age)}
                cy={priceY(sale.price, LAB_SCALE)}
                r={16}
                className="fill-transparent outline-none focus-visible:stroke-sage"
                strokeWidth={2}
                tabIndex={0}
                role="button"
                aria-label={`Sale ${i + 1}: ${sale.age.toFixed(1)} years, ${dollars(sale.price)}. Arrow keys move it.`}
                style={{ cursor: 'grab', touchAction: 'none' }}
                onPointerDown={grab(i)}
                onPointerMove={drag(i)}
                onPointerUp={drop}
                onPointerCancel={drop}
                onKeyDown={nudge(i)}
              />
              <circle
                cx={ageX(sale.age)}
                cy={priceY(sale.price, LAB_SCALE)}
                r={6}
                className="fill-ink pointer-events-none"
              />
            </g>
          ))}
        </Plot>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Readout label="Starts at" value={line ? dollars(line.start) : '—'} />
        <Readout label="Each year" value={line ? dollars(line.perYear) : '—'} />
        <Readout label="Sum of squares" value={line ? count(sumOfSquares(sales, line)) : '—'} accent />
      </div>
      <p className="mt-3 font-mono text-[0.875rem] text-zinc-faded tabular-nums">
        {line
          ? `misses add to ${zero(sumMiss)} · misses × age add to ${zero(sumMissAge)}`
          : 'every sale is the same age: no single best line'}
      </p>
      <Controls>
        <Choice label="Show misses as" options={VIEWS} value={view} onChange={setView} />
        <Button onClick={() => setSales((all) => [...all, { ...OUTLIER }])} disabled={odd || sales.length >= MOST}>
          Add an odd sale
        </Button>
        <Button onClick={() => setSales(SALES.map((s) => ({ ...s })))}>Reset</Button>
      </Controls>
    </div>
  )
}
