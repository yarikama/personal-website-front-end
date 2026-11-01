import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'

// A visitor's request on its way through Henry's setup, one hop per step of
// the story. The home box has no door to the street: the tunnel is a line
// the laptop dialled out on.

type Id = 'browser' | 'edge' | 'api' | 'db' | 'gpu' | 'r2'

const NODES: Record<Id, { x: number; y: number; label: string; sub: string }> = {
  browser: { x: 62, y: 150, label: 'You', sub: 'a browser' },
  edge: { x: 205, y: 150, label: 'Cloudflare', sub: 'the doorman' },
  r2: { x: 205, y: 46, label: 'R2', sub: 'off-site copy' },
  api: { x: 380, y: 150, label: 'API', sub: 'FastAPI on k3s' },
  db: { x: 540, y: 86, label: 'Postgres', sub: 'the data' },
  gpu: { x: 540, y: 214, label: 'GPU', sub: 'two models' },
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
  const { lit, at } = FLOW[step]
  const on = (id: Id) => lit.includes(id)
  const dot = NODES[at]
  return (
    <svg viewBox="0 0 640 270" className="w-full" role="img" aria-label="A request going from a browser through Cloudflare into Henry's laptop">
      {/* Henry's home: one laptop, nothing listening to the internet */}
      <rect x={300} y={20} width={330} height={240} rx={10} className="fill-sage/5 stroke-sage/50" strokeDasharray="4 4" />
      <text x={615} y={42} textAnchor="end" className="fill-sage font-mono text-[11px] uppercase tracking-widest">
        One laptop at home
      </text>
      <text x={615} y={250} textAnchor="end" className="fill-zinc-400 font-mono text-[10px]">
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
        <text x={292} y={140} textAnchor="middle" className="fill-sage font-mono text-[10px]">
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
            <text x={node.x} y={node.y + 14} textAnchor="middle" className="fill-zinc-400 font-mono text-[9.5px]">
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
  )
}
