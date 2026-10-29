import { BOARD, FINISH, LADDERS, SNAKES, SQUARES, standable, state, STEP, type Plan } from './board'
import { CELL, centre, corner, HEIGHT, WIDTH } from './layout'

// The snakes-and-ladders board drawn: 30 squares in five rows that wind
// up from the bottom left, the ladders and snakes, what each square is
// worth, the move a plan takes there, and a counter. It only draws: pages
// work out the numbers with board.ts and animate by passing new props.

const fmt = (value: number) => (Math.abs(value) < 0.05 ? '0.0' : value.toFixed(1)).replace('-', '−')

// A ladder: two rails and rungs between them
function Ladder({ foot, top, faint }: { foot: number; top: number; faint: boolean }) {
  const a = centre(foot)
  const b = centre(top)
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  const nx = -(b.y - a.y) / length
  const ny = (b.x - a.x) / length
  const half = 5
  const rungs = Math.floor(length / 13)
  return (
    <g className="stroke-sage" strokeWidth={2} opacity={faint ? 0.35 : 0.6}>
      <line x1={a.x + nx * half} y1={a.y + ny * half} x2={b.x + nx * half} y2={b.y + ny * half} />
      <line x1={a.x - nx * half} y1={a.y - ny * half} x2={b.x - nx * half} y2={b.y - ny * half} />
      {Array.from({ length: rungs }, (_, i) => {
        const t = (i + 0.5) / rungs
        const x = a.x + (b.x - a.x) * t
        const y = a.y + (b.y - a.y) * t
        return (
          <line key={i} x1={x + nx * half} y1={y + ny * half} x2={x - nx * half} y2={y - ny * half} strokeWidth={1.5} />
        )
      })}
    </g>
  )
}

// A snake: a wavy body from its head down to its tail
function Snake({ head, tail, faint }: { head: number; tail: number; faint: boolean }) {
  const a = centre(head)
  const b = centre(tail)
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  const nx = -(b.y - a.y) / length
  const ny = (b.x - a.x) / length
  const wave = 9
  const at = (t: number, side: number) => ({
    x: a.x + (b.x - a.x) * t + nx * wave * side,
    y: a.y + (b.y - a.y) * t + ny * wave * side,
  })
  const bend = at(0.25, 1)
  const middle = at(0.5, 0)
  const d = `M${a.x},${a.y} Q${bend.x},${bend.y} ${middle.x},${middle.y} T${b.x},${b.y}`
  return (
    <g opacity={faint ? 0.28 : 0.5}>
      <path d={d} fill="none" className="stroke-ink" strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={a.x} cy={a.y} r={5} className="fill-ink" />
    </g>
  )
}

export interface Focus {
  square: number
  // Which move's landings to show
  move: number
}

interface TrackProps {
  label: string
  // What each square is worth, by state (null: no numbers)
  values?: number[] | null
  // Tint each square by how much it is worth (the deeper, the more turns)
  shade?: boolean
  // The value to scale the tint against (by default the largest)
  scale?: number
  // Write a question mark on every square you can stand on: a value not
  // yet known
  unknown?: boolean
  // The move on each square, written under its number
  plan?: Plan | null
  // Squares to ring: those whose move just changed
  rung?: number[]
  // A square ringed, and where one of its moves can land
  focus?: Focus | null
  // A counter on the board, at a point (between squares while moving)
  counter?: { x: number; y: number } | null
  said?: string | null
}

export default function Track({
  label,
  values = null,
  shade = false,
  scale,
  unknown = false,
  plan = null,
  rung = [],
  focus = null,
  counter = null,
  said = null,
}: TrackProps) {
  const top = scale ?? (values ? Math.max(...values.map(Math.abs), 1e-9) : 1)
  const squares = Array.from({ length: SQUARES }, (_, i) => i + 1)

  // Where the focus's move can land, and how likely each landing is
  const landings = new Map<number, number>()
  if (focus) {
    for (const { next, chance } of BOARD.moves[state(focus.square)][focus.move]) {
      landings.set(next + 1, (landings.get(next + 1) ?? 0) + chance)
    }
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto w-full"
      style={{ maxWidth: '30rem' }}
      role="img"
      aria-label={label}
    >
      {squares.map((sq) => {
        const { x, y } = corner(sq)
        const value = values?.[state(sq)]
        const stand = standable(sq)
        const tint = shade && value !== undefined && stand ? Math.min(1, Math.abs(value) / top) : 0
        return (
          <g key={sq}>
            <rect x={x} y={y} width={CELL} height={CELL} className="fill-paper" />
            {tint > 0 && (
              <rect x={x} y={y} width={CELL} height={CELL} className="fill-zinc-400" opacity={0.06 + tint * 0.34} />
            )}
            {sq === FINISH && <rect x={x} y={y} width={CELL} height={CELL} className="fill-sage" opacity={0.18} />}
            <rect
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              fill="none"
              className="stroke-zinc-300 dark:stroke-zinc-200/25"
            />
            <text x={x + 5} y={y + 13} className="fill-zinc-400 font-mono text-[12px]">
              {sq}
            </text>
          </g>
        )
      })}

      {Object.entries(LADDERS).map(([foot, to]) => (
        <Ladder key={foot} foot={Number(foot)} top={to} faint={values !== null || unknown} />
      ))}
      {Object.entries(SNAKES).map(([head, tail]) => (
        <Snake key={head} head={Number(head)} tail={tail} faint={values !== null || unknown} />
      ))}

      {squares.map((sq) => {
        const { x, y } = corner(sq)
        const value = values?.[state(sq)]
        return (
          <g key={sq} className="pointer-events-none">
            {sq === FINISH && (
              <text
                x={x + CELL / 2}
                y={y + CELL / 2 + 5}
                textAnchor="middle"
                className="fill-sage font-mono text-[12px] uppercase tracking-widest"
              >
                end
              </text>
            )}
            {value !== undefined && standable(sq) && (
              <text
                x={x + CELL / 2}
                y={y + CELL / 2 + (plan ? 3 : 7)}
                textAnchor="middle"
                className="fill-ink stroke-paper font-serif text-[17px] tabular-nums"
                strokeWidth={4}
                strokeLinejoin="round"
                paintOrder="stroke"
              >
                {fmt(value)}
              </text>
            )}
            {unknown && standable(sq) && (
              <text
                x={x + CELL / 2}
                y={y + CELL / 2 + 7}
                textAnchor="middle"
                className="fill-zinc-400 font-serif text-[17px]"
              >
                ?
              </text>
            )}
            {plan && standable(sq) && (
              <text
                x={x + CELL / 2}
                y={y + CELL - 7}
                textAnchor="middle"
                className={`font-mono text-[12px] uppercase ${plan[state(sq)] === STEP ? 'fill-sage' : 'fill-zinc-400'}`}
              >
                {plan[state(sq)] === STEP ? 'step' : 'roll'}
              </text>
            )}
          </g>
        )
      })}

      {rung.map((sq) => {
        const { x, y } = corner(sq)
        return (
          <rect
            key={sq}
            x={x + 2}
            y={y + 2}
            width={CELL - 4}
            height={CELL - 4}
            fill="none"
            className="stroke-sage"
            strokeWidth={2.5}
          />
        )
      })}

      {focus && (
        <g className="pointer-events-none">
          {[...landings].map(([to, chance]) => {
            const { x, y } = corner(to)
            return (
              <g key={to}>
                <rect
                  x={x + 3}
                  y={y + 3}
                  width={CELL - 6}
                  height={CELL - 6}
                  fill="none"
                  className="stroke-sage"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
                <text x={x + CELL - 5} y={y + 13} textAnchor="end" className="fill-sage font-mono text-[12px]">
                  {focus.move === STEP ? '1' : `${Math.round(chance * 6)}/6`}
                </text>
              </g>
            )
          })}
          <rect
            x={corner(focus.square).x + 2}
            y={corner(focus.square).y + 2}
            width={CELL - 4}
            height={CELL - 4}
            fill="none"
            className="stroke-sage"
            strokeWidth={3}
          />
        </g>
      )}

      {counter && (
        <g className="pointer-events-none">
          <circle cx={counter.x} cy={counter.y} r={10} className="fill-sage" />
          {said && (
            <text x={counter.x} y={counter.y - 15} textAnchor="middle" className="fill-sage font-mono text-[13px]">
              {said}
            </text>
          )}
        </g>
      )}
    </svg>
  )
}
