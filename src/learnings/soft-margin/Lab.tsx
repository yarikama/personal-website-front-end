import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Button, Controls, Readout, Slider } from '../../components/explain/figure'
import { Dot, Ghost, Street, Toll } from './Field'
import { HEIGHT, px, py, toData, WIDTH } from './fieldScale'
import { cOf, formatC, LAB_LOG_C, labRun, LOG_C, normOf, ODD_START, roadOf, slack, type Point } from './model'

const X_RANGE: [number, number] = [-4.6, 4.6]
const Y_RANGE: [number, number] = [-2.7, 2.7]
const clamp = (value: number, [low, high]: [number, number]) => Math.max(low, Math.min(high, value))
const two = (value: number) => value.toFixed(2)

function toPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const box = svg.getBoundingClientRect()
  const [x1, x2] = toData(((clientX - box.left) / box.width) * WIDTH, ((clientY - box.top) / box.height) * HEIGHT)
  return { x1: clamp(x1, X_RANGE), x2: clamp(x2, Y_RANGE), y: 1 }
}

// Two overlapping classes and one filled point to drag, with the
// soft-margin street for the chosen C: each point's slack drawn to its
// curb, and the line the street would have without the dragged point
export default function Lab() {
  const [odd, setOdd] = useState<Point>(ODD_START)
  const [logC, setLogC] = useState(LAB_LOG_C)
  const dragging = useRef(false)

  const C = cOf(logC)
  const run = labRun(odd, C)
  const road = roadOf(run.line)
  const width = 2 / normOf(run.line)

  const grab = (event: PointerEvent<SVGCircleElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragging.current = true
  }
  const drag = (event: PointerEvent<SVGCircleElement>) => {
    const svg = event.currentTarget.ownerSVGElement
    if (!dragging.current || !svg) return
    setOdd(toPoint(svg, event.clientX, event.clientY))
  }
  const drop = () => {
    dragging.current = false
  }
  const nudge = (event: KeyboardEvent<SVGCircleElement>) => {
    const by: Record<string, [number, number]> = { ArrowUp: [0, 0.2], ArrowDown: [0, -0.2], ArrowLeft: [-0.2, 0], ArrowRight: [0.2, 0] }
    const move = by[event.key]
    if (!move) return
    event.preventDefault()
    setOdd((p) => ({ x1: clamp(p.x1 + move[0], X_RANGE), x2: clamp(p.x2 + move[1], Y_RANGE), y: 1 }))
  }

  const paying = run.points.filter((p) => slack(run.line, p) > 1e-6)
  const reg = 0.5 * normOf(run.line) ** 2

  return (
    <div>
      <div className="select-none">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label={`${run.points.length} points in two overlapping classes. With C = ${formatC(C)} the street is ${two(width)} wide; ${run.tally.violations} points are inside it or beyond, ${run.tally.errors} on the wrong side. Your point turns the line ${Math.round(run.turned)} degrees from where it would be without it.`}
        >
          <Street road={road} />
          <Ghost road={roadOf(run.without)} />
          {paying.map((p, k) => (
            <Toll key={k} road={road} p={p} />
          ))}
          {run.points.map((p, k) => (
            <Dot key={k} p={p} ring={p === odd} />
          ))}
          <circle
            cx={px(odd.x1)}
            cy={py(odd.x2)}
            r={20}
            className="fill-transparent outline-none focus-visible:stroke-sage"
            strokeWidth={2}
            tabIndex={0}
            role="button"
            aria-label={`Your filled point, at ${two(odd.x1)}, ${two(odd.x2)}, with slack ${two(slack(run.line, odd))}. Arrow keys move it.`}
            style={{ cursor: 'grab', touchAction: 'none' }}
            onPointerDown={grab}
            onPointerMove={drag}
            onPointerUp={drop}
            onPointerCancel={drop}
            onKeyDown={nudge}
          />
        </svg>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Readout label="Street width" value={two(width)} accent />
        <Readout label="Inside or past" value={run.tally.violations} />
        <Readout label="Wrong side" value={run.tally.errors} />
      </div>
      <p className="mt-3 font-mono text-[0.875rem] text-zinc-faded tabular-nums">
        ½‖w‖² = {two(reg)} · C × Σξ = {two(run.tally.tolls)} · your point turns the line {Math.round(run.turned)}°
      </p>
      <Controls>
        <Slider label="C" value={logC} min={LOG_C[0]} max={LOG_C[1]} step={0.1} onChange={setLogC} format={(v) => formatC(cOf(v))} />
        <Button onClick={() => setOdd(ODD_START)}>Put the point back</Button>
      </Controls>
    </div>
  )
}
