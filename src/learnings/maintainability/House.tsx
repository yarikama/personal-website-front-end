import { motion } from 'motion/react'
import { useLoop } from '../../components/explain/useLoop'
import { everyPair } from './model'

const WIDTH = 640
const HEIGHT = 280
const HOUSE = { x: 220, y: 100, w: 200, h: 150 }
// Sockets round the walls, for the wiring steps
const SOCKETS = [
  { x: 235, y: 130 },
  { x: 300, y: 115 },
  { x: 365, y: 125 },
  { x: 405, y: 160 },
  { x: 400, y: 220 },
  { x: 330, y: 238 },
  { x: 260, y: 232 },
  { x: 236, y: 185 },
]
const PANEL = { x: 320, y: 178 }

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

function Shell() {
  const { x, y, w, h } = HOUSE
  return (
    <>
      <path d={`M${x - 14},${y} L${x + w / 2},${y - 70} L${x + w + 14},${y} Z`} className="fill-paper stroke-ink" strokeWidth={1.5} />
      <rect x={x} y={y} width={w} height={h} className="fill-paper stroke-ink" strokeWidth={1.5} />
    </>
  )
}

// Building against living in it, as two bars of time
function Lifetime() {
  const scale = 480 / 31
  return (
    <svg viewBox={`0 0 ${WIDTH} 200`} className="w-full" role="img" aria-label="One year building a house, thirty living in it">
      {[
        { name: 'Building it', years: 1, tone: 'fill-sage' },
        { name: 'Living in it', years: 30, tone: 'fill-ink' },
      ].map((bar, i) => (
        <g key={bar.name}>
          <Text x={60} y={50 + i * 80} anchor="start">{bar.name}</Text>
          <motion.rect
            x={60}
            y={60 + i * 80}
            height={30}
            initial={{ width: 0 }}
            animate={{ width: bar.years * scale }}
            transition={{ duration: 1.2, delay: i * 0.4 }}
            className={bar.tone}
          />
          <text x={60 + bar.years * scale + 10} y={81 + i * 80} className="fill-ink font-serif text-[20px]">
            {bar.years} {bar.years === 1 ? 'year' : 'years'}
          </text>
        </g>
      ))}
    </svg>
  )
}

// The story's house: its lifetime, a boiler that warns before it fails,
// tangled wiring, the same wiring through one panel, a room added, and the
// three properties named
export default function House({ step }: { step: number }) {
  const phase = useLoop(2400)
  if (step === 0) return <Lifetime />

  const warning = step === 1 && phase > 0.35 && phase < 0.75
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="A house">
      <Shell />

      {step === 1 && (
        <>
          <rect x={290} y={170} width={60} height={70} className="fill-paper stroke-ink" />
          <circle cx={320} cy={190} r={8} className={warning ? 'fill-ink' : 'fill-sage'} />
          <Text x={320} y={225} tone="fill-ink">Boiler</Text>
          <Text x={320} y={272} tone={warning ? 'fill-ink' : 'fill-sage'}>
            {warning ? 'Warning: fix it before it breaks' : 'Running fine'}
          </Text>
        </>
      )}

      {(step === 2 || step === 3) && (
        <>
          {step === 2
            ? SOCKETS.flatMap((a, i) =>
                SOCKETS.slice(i + 1).map((b, j) => (
                  <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-ink" strokeWidth={0.9} />
                ))
              )
            : SOCKETS.map((s, i) => <line key={i} x1={s.x} y1={s.y} x2={PANEL.x} y2={PANEL.y} className="stroke-sage" strokeWidth={1.2} />)}
          {step === 3 && <rect x={PANEL.x - 16} y={PANEL.y - 12} width={32} height={24} className="fill-sage stroke-sage" />}
          {SOCKETS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={5} className="fill-paper stroke-ink" />
          ))}
          <Text x={320} y={272} tone={step === 2 ? 'fill-ink' : 'fill-sage'}>
            {step === 2 ? `${everyPair(SOCKETS.length)} wires, every socket to every other` : `${SOCKETS.length} wires, one labelled panel`}
          </Text>
        </>
      )}

      {step === 4 && (
        <>
          <motion.rect
            x={HOUSE.x + HOUSE.w}
            y={HOUSE.y + 50}
            height={100}
            initial={{ width: 0 }}
            animate={{ width: 110 }}
            transition={{ duration: 1 }}
            className="fill-sage/20 stroke-sage"
            strokeDasharray="5 4"
            strokeWidth={1.5}
          />
          <Text x={HOUSE.x + HOUSE.w + 55} y={HOUSE.y + 40} tone="fill-sage">New room</Text>
          <Text x={HOUSE.x + HOUSE.w / 2} y={HOUSE.y + 80}>No walls knocked down</Text>
        </>
      )}

      {step === 5 && (
        <>
          <Text x={110} y={140} tone="fill-ink">Easy to run</Text>
          <Text x={110} y={156}>Operability</Text>
          <Text x={320} y={190} tone="fill-ink">Easy to understand</Text>
          <Text x={320} y={206}>Simplicity</Text>
          <Text x={530} y={140} tone="fill-ink">Easy to change</Text>
          <Text x={530} y={156}>Evolvability</Text>
        </>
      )}
    </svg>
  )
}
