import { motion } from 'motion/react'
import { useLoop } from '../../components/explain/useLoop'

const WIDTH = 640
const HEIGHT = 280
const spring = { type: 'spring', stiffness: 120, damping: 18 } as const

function Text({ x, y, children, tone = 'fill-zinc-faded', anchor = 'middle' }: {
  x: number
  y: number
  children: string
  tone?: string
  anchor?: 'start' | 'middle' | 'end'
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={`${tone} font-mono text-[10px] uppercase tracking-widest`}>
      {children}
    </text>
  )
}

// A shop with an oven of `oven` px, at x
function Shop({ x, oven, label }: { x: number; oven: number; label: string }) {
  return (
    <g>
      <motion.rect initial={false} animate={{ x }} transition={spring} y={70} width={150} height={150} className="fill-paper stroke-ink" strokeWidth={1.5} />
      <motion.rect
        initial={false}
        animate={{ x: x + 75 - oven / 2, y: 145 - oven / 2, width: oven, height: oven }}
        transition={spring}
        className="fill-sage/40 stroke-sage"
        strokeWidth={1.5}
      />
      <Text x={x + 75} y={240}>{label}</Text>
    </g>
  )
}

// Customers waiting in line, `count` of them, shuffling forward
function Queue({ x, count, phase }: { x: number; count: number; phase: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} cx={x - 16 - i * 14 + (phase * 14) % 14} cy={200} r={5} className="fill-ink" />
      ))}
    </>
  )
}

// The story's bakery: one oven, a bigger one, the biggest, two shops, and
// order counters around one shared pantry; then the same as servers
export default function Bakery({ step }: { step: number }) {
  const phase = useLoop(1400)
  const servers = step === 5

  if (step <= 2) {
    const oven = [44, 84, 132][step]
    return (
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="A bakery and its oven">
        <Shop x={300} oven={oven} label={step === 2 ? 'The biggest oven made' : 'One shop'} />
        <Queue x={300} count={[14, 4, 6][step]} phase={phase} />
        {step === 2 && (
          <Text x={375} y={52} tone="fill-ink">
            Price: 10× the small one
          </Text>
        )}
        <Text x={140} y={180}>{step === 0 ? 'Customers: twice as many' : 'Customers'}</Text>
      </svg>
    )
  }

  if (step === 3) {
    return (
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Two bakeries sharing recipes">
        <Shop x={110} oven={44} label="Shop one" />
        <Shop x={380} oven={44} label="Shop two" />
        <line x1={260} x2={380} y1={145} y2={145} className="stroke-ink" strokeDasharray="4 4" />
        <Text x={320} y={130} tone="fill-ink">Same recipes?</Text>
        <Text x={320} y={168} tone="fill-ink">Who gets which order?</Text>
        <Queue x={110} count={5} phase={phase} />
        <Queue x={380} count={5} phase={phase} />
      </svg>
    )
  }

  // Counters copy freely; the pantry they all draw from is the hard part
  const counters = [80, 260, 440].map((x) => x + 60)
  const pantry = { x: 320, y: 220 }
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Order counters around one shared pantry">
      {counters.map((x, i) => (
        <g key={i}>
          <line x1={x} y1={90} x2={pantry.x} y2={pantry.y - 20} className="stroke-zinc-400" />
          <motion.circle
            cx={x + (pantry.x - x) * phase}
            cy={90 + (pantry.y - 20 - 90) * phase}
            r={4}
            className="fill-ink"
          />
          <rect x={x - 45} y={50} width={90} height={40} className="fill-sage/40 stroke-sage" strokeWidth={1.5} />
          <Text x={x} y={74} tone="fill-ink">{servers ? 'Web server' : 'Counter'}</Text>
        </g>
      ))}
      <Text x={320} y={30} tone="fill-sage">{servers ? 'Keep nothing: copy freely' : 'Take orders: copy freely'}</Text>
      <rect x={pantry.x - 70} y={pantry.y - 20} width={140} height={44} className="fill-ink" />
      <text x={pantry.x} y={pantry.y + 6} textAnchor="middle" className="fill-paper font-mono text-[11px] uppercase tracking-widest">
        {servers ? 'Database' : 'Shared pantry'}
      </text>
      <Text x={pantry.x + 90} y={pantry.y + 6} tone="fill-ink" anchor="start">
        {servers ? 'Holds the data: hard to split' : 'Hard to split'}
      </Text>
    </svg>
  )
}
