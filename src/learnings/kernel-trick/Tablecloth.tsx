import { lerp, useLoop, usePlay } from '../../components/explain/useLoop'
import { BEST_STRAIGHT, CHERRIES, CLOTH, CUT, cutAt, GRAPES, SWEEP_ANGLES, SWEEP_REACH, type Point } from './model'

export type Show = 'flat' | 'cuts' | 'lift' | 'knife' | 'above' | 'named'

const WIDTH = 560
const HEIGHT = 330
const CX = 280
// How tall the lifted middle stands, in the cloth's units per unit of x₁² + x₂²
const RISE = 0.5
// Looking down at the table from 20° above it, or from straight overhead
const LOW = (20 * Math.PI) / 180
const HIGH = Math.PI / 2

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

interface View {
  // How far the cloth is lifted, 0 to 1
  lifted: number
  // The angle we look down from
  elevation: number
  scale: number
  cy: number
}

// From the low view to the one overhead, as `t` goes from 0 to 1
function viewAt(t: number, lifted: number): View {
  return { lifted, elevation: lerp(LOW, HIGH, t), scale: lerp(130, 92, t), cy: lerp(238, 165, t) }
}

// Where a point of the cloth, `r2` its squared distance from the middle,
// stands when lifted
const height = (view: View, r2: number) => view.lifted * RISE * Math.max(0, CLOTH * CLOTH - r2)

function project(view: View, x: number, y: number, z: number): [number, number] {
  return [CX + view.scale * x, view.cy - view.scale * (y * Math.sin(view.elevation) + z * Math.cos(view.elevation))]
}

// A circle of the cloth, all of it at one height
function ring(view: View, r: number, z = height(view, r * r)) {
  const [cx, cy] = project(view, 0, 0, z)
  return { cx, cy, rx: view.scale * r, ry: view.scale * r * Math.sin(view.elevation) }
}

function spoke(view: View, angle: number) {
  return Array.from({ length: 17 }, (_, i) => {
    const r = (CLOTH * i) / 16
    const [sx, sy] = project(view, r * Math.cos(angle), r * Math.sin(angle), height(view, r * r))
    return `${i ? 'L' : 'M'}${sx.toFixed(1)},${sy.toFixed(1)}`
  }).join(' ')
}

const r2 = (p: Point) => p[0] ** 2 + p[1] ** 2
const CUT_RADIUS = Math.sqrt(CUT)

function Cloth({ view }: { view: View }) {
  return (
    <g className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25">
      {[1, 2, 3, 4, 5, 6].map((k) => {
        const e = ring(view, (CLOTH * k) / 6)
        return <ellipse key={k} {...e} strokeWidth={k === 6 ? 1.5 : 1} />
      })}
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={spoke(view, (Math.PI * i) / 6)} />
      ))}
    </g>
  )
}

function Fruit({ view, points, grape, wrong }: { view: View; points: readonly Point[]; grape: boolean; wrong?: (p: Point) => boolean }) {
  return (
    <g>
      {points.map((p, i) => {
        const [sx, sy] = project(view, p[0], p[1], height(view, r2(p)))
        return (
          <g key={i}>
            {wrong?.(p) && <circle cx={sx} cy={sy} r={11} className="fill-none stroke-ink" strokeWidth={1.5} />}
            <circle cx={sx} cy={sy} r={6.5} className={`${grape ? 'fill-sage' : 'fill-ink'} stroke-paper`} strokeWidth={1.5} />
          </g>
        )
      })}
    </g>
  )
}

const label = 'font-mono text-[11px] uppercase tracking-widest'

function Legend() {
  return (
    <g>
      <circle cx={24} cy={20} r={6} className="fill-sage" />
      <text x={36} y={24} className={`${label} fill-zinc-faded`}>
        grapes
      </text>
      <circle cx={124} cy={20} r={6} className="fill-ink" />
      <text x={136} y={24} className={`${label} fill-zinc-faded`}>
        cherries
      </text>
    </g>
  )
}

// A straight cut slid across the flat cloth, at one angle after another,
// with the grapes on whichever side of it suits them best
function Cuts({ view }: { view: View }) {
  const phase = useLoop(14000, 0.375)
  const sweeps = SWEEP_ANGLES.length
  const angle = SWEEP_ANGLES[Math.min(sweeps - 1, Math.floor(phase * sweeps))]
  const offset = lerp(-SWEEP_REACH, SWEEP_REACH, ease((phase * sweeps) % 1))
  const cut = cutAt(angle, offset)
  const n = [Math.cos(angle), Math.sin(angle)]
  const reach = CLOTH * 1.08
  const half = Math.sqrt(Math.max(0, reach * reach - offset * offset))
  const foot = [n[0] * offset, n[1] * offset]
  const [ax, ay] = project(view, foot[0] - n[1] * half, foot[1] + n[0] * half, 0)
  const [bx, by] = project(view, foot[0] + n[1] * half, foot[1] - n[0] * half, 0)
  // On the grapes' side of the cut
  const grapeSide = (p: Point) => p[0] * n[0] + p[1] * n[1] > offset === cut.grapesAhead
  return (
    <>
      <Fruit view={view} points={CHERRIES} grape={false} wrong={grapeSide} />
      <Fruit view={view} points={GRAPES} grape wrong={(p) => !grapeSide(p)} />
      <line x1={ax} y1={ay} x2={bx} y2={by} className="stroke-ink" strokeWidth={2.5} strokeLinecap="round" />
      <text x={WIDTH - 20} y={24} textAnchor="end" className={`${label} fill-zinc-faded`}>
        wrong side <tspan className="fill-ink tabular-nums">{cut.wrong}</tspan>
      </text>
      <text x={WIDTH - 20} y={42} textAnchor="end" className={`${label} fill-zinc-faded`}>
        best of any cut <tspan className="fill-ink tabular-nums">{BEST_STRAIGHT}</tspan>
      </text>
    </>
  )
}

// The flat knife: a level sheet at the height of the cut
function Knife({ view, slide, edge }: { view: View; slide: number; edge: boolean }) {
  const z = height(view, CUT)
  const sheet = ring(view, CLOTH * 1.12, z)
  const shift = view.scale * lerp(-4, 0, ease(slide))
  const line = ring(view, CUT_RADIUS, z)
  return (
    <g>
      <ellipse {...sheet} cx={sheet.cx + shift} className="fill-sage/15 stroke-sage" strokeWidth={1.5} />
      {edge && <ellipse {...line} className="fill-none stroke-sage" strokeWidth={2.5} strokeDasharray="6 4" />}
    </g>
  )
}

// The tablecloth from the story: fruit lying flat, a straight cut that
// cannot split them, the middle lifted, a flat knife between, and the cut
// seen from above. Plays by itself; give it a `key` to play again.
export default function Tablecloth({ show }: { show: Show }) {
  const played = ease(usePlay(1, show === 'above' ? 2400 : 1800))
  const view =
    show === 'flat' || show === 'cuts'
      ? viewAt(0, 0)
      : show === 'lift'
        ? viewAt(0, played)
        : show === 'knife'
          ? viewAt(0, 1)
          : show === 'above'
            ? viewAt(played, 1 - played)
            : viewAt(1, 0)
  const lifted = show === 'lift' || show === 'knife'
  const edge = ring(view, CUT_RADIUS)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={
        show === 'flat'
          ? `A round tablecloth with ${GRAPES.length} grapes in the middle and ${CHERRIES.length} cherries in a ring around them`
          : show === 'cuts'
            ? `A straight cut slides across the cloth at one angle after another; wherever it sits, at least ${BEST_STRAIGHT} fruits are on the wrong side`
            : show === 'lift'
              ? 'The middle of the cloth rises, carrying the grapes high; the cherries near the rim stay low'
              : show === 'knife'
                ? 'A flat, level sheet slides in between the raised grapes above it and the cherries below it'
                : show === 'above'
                  ? 'Seen from overhead as the cloth goes down, the place where the sheet met the cloth is a circle round the grapes'
                  : `Seen from overhead: the boundary is the circle x1 squared plus x2 squared equals ${CUT.toFixed(2)}, with the grapes inside`
      }
    >
      <Legend />
      <Cloth view={view} />
      {show === 'cuts' ? (
        <Cuts view={view} />
      ) : show === 'knife' ? (
        <>
          <Fruit view={view} points={CHERRIES} grape={false} />
          <Knife view={view} slide={played} edge={played > 0.98} />
          <Fruit view={view} points={GRAPES} grape />
        </>
      ) : (
        <>
          {(show === 'above' || show === 'named') && <ellipse {...edge} className="fill-none stroke-sage" strokeWidth={2.5} strokeDasharray="6 4" />}
          <Fruit view={view} points={CHERRIES} grape={false} />
          <Fruit view={view} points={GRAPES} grape />
        </>
      )}
      {lifted && (
        <text x={WIDTH - 20} y={24} textAnchor="end" className={`${label} fill-zinc-faded`}>
          lifted by how near the middle
        </text>
      )}
      {show === 'named' && (
        <g className="font-mono text-[11px]">
          <text x={WIDTH - 20} y={24} textAnchor="end" className="fill-ink">
            φ(x) = (x₁, x₂, x₁² + x₂²)
          </text>
          <text x={WIDTH - 20} y={42} textAnchor="end" className="fill-sage-ink">
            boundary: x₁² + x₂² = {CUT.toFixed(2)}
          </text>
          <line x1={CX - 160} x2={CX + 160} y1={edge.cy} y2={edge.cy} className="stroke-zinc-400" strokeDasharray="2 4" />
          <line x1={CX} x2={CX} y1={edge.cy - 160} y2={edge.cy + 160} className="stroke-zinc-400" strokeDasharray="2 4" />
          <text x={CX + 164} y={edge.cy + 4} className="fill-zinc-faded">
            x₁
          </text>
          <text x={CX + 6} y={edge.cy - 150} className="fill-zinc-faded">
            x₂
          </text>
        </g>
      )}
    </svg>
  )
}
