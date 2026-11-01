import { motion } from 'motion/react'
import { NARROW, useWidth } from '../../components/case/useWidth'
import { usePrefersReducedMotion } from '../../hooks'

// A visitor's request on its way through Henry's setup, one hop per step of
// the story. The home box has no door to the street: the tunnel is a line
// the laptop dialled out on.

type Id = 'browser' | 'edge' | 'api' | 'db' | 'gpu' | 'r2'

const LABELS: Record<Id, { label: string; sub: string }> = {
  browser: { label: 'You', sub: 'a browser' },
  edge: { label: 'Cloudflare', sub: 'the doorman' },
  r2: { label: 'R2', sub: 'off-site copy' },
  api: { label: 'API', sub: 'FastAPI on k3s' },
  db: { label: 'Postgres', sub: 'the data' },
  gpu: { label: 'GPU', sub: 'two models' },
}

type Point = { x: number; y: number }
interface Layout {
  width: number
  height: number
  at: Record<Id, Point>
  home: { x: number; y: number; width: number; height: number }
  homeLabel: Point & { anchor: 'start' | 'end' }
  ports: Point
  tunnel: Point & { anchor: 'start' | 'middle' }
}

// Left to right on a wide screen; top to bottom on a phone, where the wide
// one would shrink its labels past reading
const WIDE: Layout = {
  width: 640,
  height: 270,
  at: {
    browser: { x: 62, y: 150 },
    edge: { x: 205, y: 150 },
    r2: { x: 205, y: 46 },
    api: { x: 380, y: 150 },
    db: { x: 540, y: 86 },
    gpu: { x: 540, y: 214 },
  },
  home: { x: 300, y: 20, width: 330, height: 240 },
  homeLabel: { x: 615, y: 42, anchor: 'end' },
  ports: { x: 615, y: 250 },
  tunnel: { x: 292, y: 140, anchor: 'middle' },
}
const TALL: Layout = {
  width: 360,
  height: 540,
  at: {
    browser: { x: 90, y: 45 },
    edge: { x: 90, y: 150 },
    r2: { x: 270, y: 150 },
    api: { x: 180, y: 290 },
    db: { x: 265, y: 430 },
    gpu: { x: 95, y: 430 },
  },
  home: { x: 10, y: 215, width: 340, height: 315 },
  homeLabel: { x: 22, y: 512, anchor: 'start' },
  ports: { x: 338, y: 512 },
  tunnel: { x: 152, y: 238, anchor: 'start' },
}

const EDGES: { from: Id; to: Id; dashed?: boolean }[] = [
  { from: 'browser', to: 'edge' },
  { from: 'edge', to: 'api', dashed: true },
  { from: 'api', to: 'db' },
  { from: 'api', to: 'gpu' },
  { from: 'db', to: 'r2', dashed: true },
]

// Which nodes and lines each step lights, and where the request is
const FLOW: { lit: Id[]; at: Id }[] = [
  { lit: ['browser'], at: 'browser' },
  { lit: ['browser', 'edge'], at: 'edge' },
  { lit: ['edge', 'api'], at: 'api' },
  { lit: ['api', 'db'], at: 'db' },
  { lit: ['api', 'gpu'], at: 'gpu' },
  { lit: ['db', 'r2'], at: 'r2' },
]

const W = 120
const H = 50

export default function RequestFlow({ step }: { step: number }) {
  const reducedMotion = usePrefersReducedMotion()
  const { ref, width } = useWidth<HTMLDivElement>()
  const layout = width < NARROW ? TALL : WIDE
  const { lit, at } = FLOW[step]
  const on = (id: Id) => lit.includes(id)
  const NODES = Object.fromEntries(
    (Object.keys(LABELS) as Id[]).map((id) => [id, { ...LABELS[id], ...layout.at[id] }])
  ) as Record<Id, Point & { label: string; sub: string }>
  const dot = NODES[at]
  return (
    <div ref={ref}>
    <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="w-full" role="img" aria-label="A request going from a browser through Cloudflare into Henry's laptop">
      {/* Henry's home: one laptop, nothing listening to the internet */}
      <rect {...layout.home} rx={10} className="fill-sage/5 stroke-sage/50" strokeDasharray="4 4" />
      <text x={layout.homeLabel.x} y={layout.homeLabel.y} textAnchor={layout.homeLabel.anchor} className="fill-sage font-mono text-[12px] uppercase tracking-widest">
        One laptop at home
      </text>
      <text x={layout.ports.x} y={layout.ports.y} textAnchor="end" className="fill-zinc-400 font-mono text-[12px]">
        no open ports
      </text>

      {EDGES.map(({ from, to, dashed }) => {
        const a = NODES[from]
        const b = NODES[to]
        const active = on(from) && on(to)
        return (
          <line
            key={`${from}-${to}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            strokeDasharray={dashed ? '5 5' : undefined}
            className={active ? 'stroke-sage' : 'stroke-zinc-300 dark:stroke-zinc-400/50'}
            strokeWidth={active ? 2 : 1}
          >
            {dashed && active && !reducedMotion && (
              <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.8s" repeatCount="indefinite" />
            )}
          </line>
        )
      })}
      {on('edge') && on('api') && (
        <text x={layout.tunnel.x} y={layout.tunnel.y} textAnchor={layout.tunnel.anchor} className="fill-sage font-mono text-[12px]">
          tunnel
        </text>
      )}

      {(Object.keys(NODES) as Id[]).map((id) => {
        const node = NODES[id]
        const active = on(id)
        return (
          <g key={id}>
            <rect
              x={node.x - W / 2}
              y={node.y - H / 2}
              width={W}
              height={H}
              rx={6}
              className={`transition-colors duration-300 ${
                active ? 'fill-paper stroke-sage' : 'fill-paper stroke-zinc-300 dark:stroke-zinc-400/50'
              }`}
              strokeWidth={active ? 2 : 1}
            />
            <text
              x={node.x}
              y={node.y - 3}
              textAnchor="middle"
              className={`font-serif text-[17px] transition-colors duration-300 ${active ? 'fill-ink' : 'fill-zinc-400'}`}
            >
              {node.label}
            </text>
            <text x={node.x} y={node.y + 14} textAnchor="middle" className="fill-zinc-400 font-mono text-[12px]">
              {node.sub}
            </text>
          </g>
        )
      })}

      {/* The request itself */}
      <motion.circle
        r={7}
        className="fill-sage"
        initial={false}
        animate={{ cx: dot.x, cy: dot.y - H / 2 - 2 }}
        transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 18 }}
      />
    </svg>
    </div>
  )
}
