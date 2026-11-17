import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Button, Choice, Controls, Readout } from '../../components/explain/figure'
import { BOTTOM, HEIGHT, LEFT, RIGHT, segment, TOP, WIDTH, X, Y } from './mapScale'
import { MapFrame, Mark, Ring, Street } from './MapParts'
import { gap, LAB_BOUNDS, LAB_SEED, labPoints, maxMargin, metres, norm, perceptron, supportVectors, type Point } from './model'

const PERCEPTRON = ['hide', 'show'] as const
type Perceptron = (typeof PERCEPTRON)[number]

const clamp = (value: number, [low, high]: [number, number]) => Math.max(low, Math.min(high, value))

// Where a pointer is, in metres on the map
function toMap(svg: SVGSVGElement, clientX: number, clientY: number) {
  const box = svg.getBoundingClientRect()
  const px = ((clientX - box.left) / box.width) * WIDTH
  const py = ((clientY - box.top) / box.height) * HEIGHT
  const x = ((px - LEFT) / (RIGHT - LEFT)) * 100
  const y = ((BOTTOM - py) / (BOTTOM - TOP)) * 60
  return { x: clamp(x, LAB_BOUNDS.x), y: clamp(y, LAB_BOUNDS.y) }
}

// Points to drag: the widest street between the classes follows, with the
// points it rests on ringed, and the perceptron's line on the same points
export default function StreetLab() {
  const [seed, setSeed] = useState(LAB_SEED)
  const [points, setPoints] = useState<Point[]>(() => labPoints(LAB_SEED))
  const [shown, setShown] = useState<Perceptron>('show')
  const dragging = useRef<number | null>(null)

  const line = maxMargin(points)
  const support = line ? supportVectors(line, points) : []
  const guess = line ? perceptron(points) : null
  const guessLine = guess && shown === 'show' ? segment(guess) : null

  const move = (i: number, to: { x: number; y: number }) =>
    setPoints((all) => all.map((p, j) => (j === i ? { ...p, x: to.x, y: to.y } : p)))

  const grab = (i: number) => (event: PointerEvent<SVGCircleElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragging.current = i
  }
  const drag = (i: number) => (event: PointerEvent<SVGCircleElement>) => {
    const svg = event.currentTarget.ownerSVGElement
    if (dragging.current !== i || !svg) return
    move(i, toMap(svg, event.clientX, event.clientY))
  }
  const drop = () => {
    dragging.current = null
  }
  const nudge = (i: number) => (event: KeyboardEvent<SVGCircleElement>) => {
    const p = points[i]
    const by: Record<string, [number, number]> = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }
    const step = by[event.key]
    if (!step) return
    event.preventDefault()
    move(i, { x: clamp(p.x + 2 * step[0], LAB_BOUNDS.x), y: clamp(p.y + 2 * step[1], LAB_BOUNDS.y) })
  }
  const fresh = (next: number) => {
    setSeed(next)
    setPoints(labPoints(next))
  }

  const label = line
    ? `${points.length} points, ${points.length / 2} of each class. The widest street is ${metres(2 / norm(line))} wide and rests on ${support.length} points.${guess && shown === 'show' ? ` The perceptron’s line leaves ${metres(2 * gap(guess, points))}.` : ''}`
    : `${points.length} points that no straight line separates: there is no hard-margin street.`

  return (
    <div>
      <div className="select-none">
        <MapFrame label={label}>
          {line && <Street line={line} />}
          {guessLine && <line {...guessLine} className="stroke-ink" strokeWidth={2} strokeDasharray="8 5" strokeLinecap="round" />}
          {!line && (
            <text x={(LEFT + RIGHT) / 2} y={TOP + 24} textAnchor="middle" className="fill-ink font-mono text-[12px]">
              no straight line separates these
            </text>
          )}
          {support.map((i) => (
            <Ring key={i} p={points[i]} />
          ))}
          {points.map((p, i) => (
            <g key={i}>
              <Mark p={p} />
              {/* A wider target than the mark, for a finger */}
              <circle
                cx={X(p.x)}
                cy={Y(p.y)}
                r={16}
                className="fill-transparent outline-none focus-visible:stroke-sage"
                strokeWidth={2}
                tabIndex={0}
                role="button"
                aria-label={`${p.label === 1 ? 'Sage dot' : 'Ink square'} ${i + 1}${support.includes(i) ? ', on the street’s edge' : ''}. Arrow keys move it.`}
                style={{ cursor: 'grab', touchAction: 'none' }}
                onPointerDown={grab(i)}
                onPointerMove={drag(i)}
                onPointerUp={drop}
                onPointerCancel={drop}
                onKeyDown={nudge(i)}
              />
            </g>
          ))}
        </MapFrame>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Readout label="Widest street" value={line ? metres(2 / norm(line)) : '—'} accent />
        <Readout label="Points on its edges" value={line ? support.length : '—'} />
        <Readout label="Perceptron’s street" value={guess ? metres(2 * gap(guess, points)) : '—'} />
      </div>
      <Controls>
        <Choice label="Perceptron’s line" options={PERCEPTRON} value={shown} onChange={setShown} />
        <Button onClick={() => fresh(seed + 1)}>New points</Button>
        <Button onClick={() => fresh(seed)}>Reset</Button>
      </Controls>
    </div>
  )
}
