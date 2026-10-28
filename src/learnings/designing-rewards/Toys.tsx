import { lerp, usePlay } from '../../components/explain/useLoop'
import { TOYS } from './model'

const WIDTH = 640
const HEIGHT = 300
const SHELF_Y = 92
const FLOOR_Y = 262
const slotX = (i: number) => 150 + i * 62
// Where each toy lies on the floor
const FLOOR = [
  { x: 120, y: FLOOR_Y },
  { x: 205, y: FLOOR_Y - 18 },
  { x: 300, y: FLOOR_Y + 4 },
  { x: 390, y: FLOOR_Y - 12 },
  { x: 470, y: FLOOR_Y },
  { x: 560, y: FLOOR_Y - 20 },
]
const TOY_SHAPES = ['rect', 'circle', 'rect', 'circle', 'rect', 'circle'] as const

export type Evening =
  // Toys on the floor, tidied one by one, a coin each
  | 'tidy'
  // The shelf full, the coins earned
  | 'tidied'
  // Tip the shelf out, tidy it again, twice over
  | 'tip'
  // Paid for a tidy room at bedtime: tidy once, one coin at the end
  | 'bedtime'

interface Scene {
  // Each toy's place: on its shelf slot (1) or on the floor (0), or between
  toys: number[]
  coins: number
  kid: { x: number; y: number }
}

const shelf = (i: number) => ({ x: slotX(i), y: SHELF_Y - 14 })

// Toy i is carried during [i, i + 1): walk to it, carry it up, get a coin
function tidying(t: number, coinsBefore: number, paid: boolean): Scene {
  const i = Math.min(TOYS - 1, Math.floor(t))
  const k = Math.min(1, t - i)
  const toys = Array.from({ length: TOYS }, (_, j) => (j < i ? 1 : j > i ? 0 : k < 0.4 ? 0 : Math.min(1, (k - 0.4) / 0.45)))
  const from = i === 0 ? { x: 330, y: 190 } : shelf(i - 1)
  const kid =
    k < 0.4
      ? { x: lerp(from.x, FLOOR[i].x, k / 0.4), y: lerp(from.y + 22, FLOOR[i].y - 22, k / 0.4) }
      : { x: lerp(FLOOR[i].x, shelf(i).x, toys[i]), y: lerp(FLOOR[i].y - 22, shelf(i).y + 36, toys[i]) }
  const placed = toys.filter((p) => p >= 1).length
  return { toys, coins: coinsBefore + (paid ? placed : 0), kid }
}

function scene(evening: Evening, t: number): Scene {
  if (evening === 'tidy') return tidying(t, 0, true)
  if (evening === 'tidied') return { toys: Array(TOYS).fill(1), coins: TOYS, kid: { x: slotX(TOYS - 1), y: SHELF_Y + 22 } }
  if (evening === 'bedtime') {
    const s = tidying(Math.min(t, TOYS), 0, false)
    return { ...s, coins: t >= TOYS + 0.5 ? 1 : 0 }
  }
  // Tip: one unit to tip everything out, then six to tidy, and again
  const round = Math.min(1, Math.floor(t / (TOYS + 1)))
  const inRound = Math.min(TOYS + 1, t - round * (TOYS + 1))
  const before = TOYS + round * TOYS
  if (inRound < 1) {
    const fall = Math.min(1, inRound / 0.6)
    return { toys: Array(TOYS).fill(1 - fall), coins: before, kid: { x: 330, y: 190 } }
  }
  return tidying(inRound - 1, before, true)
}

const EVENING_LENGTH: Record<Evening, number> = { tidy: TOYS, tidied: 0, tip: 2 * (TOYS + 1), bedtime: TOYS + 1 }

// A room with a shelf and six toys, a little brother tidying them, and the
// coins he has been paid. Plays its evening when shown.
export default function Toys({ evening, named = false }: { evening: Evening; named?: boolean }) {
  const t = usePlay(EVENING_LENGTH[evening], 650)
  const { toys, coins, kid } = scene(evening, t)

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="A shelf, six toys and a boy tidying them, with the coins he has earned">
      {/* The shelf and the floor */}
      <line x1={110} x2={WIDTH - 110} y1={SHELF_Y} y2={SHELF_Y} className="stroke-ink" strokeWidth={3} />
      <line x1={20} x2={WIDTH - 20} y1={FLOOR_Y + 14} y2={FLOOR_Y + 14} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      <text x={110} y={SHELF_Y + 20} className="fill-zinc-faded font-mono text-[15px] uppercase tracking-widest">
        Shelf
      </text>
      <text x={20} y={FLOOR_Y + 32} className="fill-zinc-faded font-mono text-[15px] uppercase tracking-widest">
        Floor
      </text>

      {toys.map((placed, i) => {
        const x = lerp(FLOOR[i].x, shelf(i).x, placed)
        const y = lerp(FLOOR[i].y, shelf(i).y, placed)
        return TOY_SHAPES[i] === 'rect' ? (
          <rect key={i} x={x - 12} y={y - 12} width={24} height={24} className="fill-zinc-400 dark:fill-zinc-500" />
        ) : (
          <circle key={i} cx={x} cy={y} r={12} className="fill-zinc-400 dark:fill-zinc-500" />
        )
      })}

      {/* Your brother */}
      <circle cx={kid.x} cy={kid.y} r={13} className="fill-sage" />
      {named && (
        <text x={kid.x + 20} y={kid.y + 5} className="fill-sage font-mono text-[15px] uppercase tracking-widest">
          agent
        </text>
      )}

      {/* The coins */}
      <text x={WIDTH - 20} y={26} textAnchor="end" className="fill-zinc-faded font-mono text-[15px] uppercase tracking-widest">
        {named ? 'Reward so far' : 'Coins paid'}
      </text>
      <text x={WIDTH - 20} y={60} textAnchor="end" className="fill-ink font-serif text-[30px] tabular-nums">
        {coins}
      </text>
      {Array.from({ length: Math.min(coins, 12) }, (_, i) => (
        <circle key={i} cx={WIDTH - 70 - (i % 6) * 16} cy={50 + Math.floor(i / 6) * 16} r={6} className="fill-sage/70" />
      ))}
    </svg>
  )
}
