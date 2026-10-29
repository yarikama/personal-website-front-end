import { FINISH, LADDERS, ROLL, SNAKES, SQUARES, standable, state, STEP, type Plan } from '../../components/explain/ladders'
import { CELL, corner, HEIGHT, WIDTH } from '../../components/explain/laddersLayout'
import { Ladder, Snake } from '../../components/explain/LaddersTrack'
import type { Table } from './model'

// The roll-or-step board with two averages on every square: the turns that
// followed a roll from it, and those that followed a step, with the move
// the averages pick drawn darker. It can be covered, hiding the ladders and
// snakes: then every square gets its two slots, since you can't tell which
// ones you will never stand on. It only draws.

const turns = (mean: number) => (-mean).toFixed(1)

// A die's face, for "roll", and "+1", for "step"
function Mark({ move, x, y, on }: { move: number; x: number; y: number; on: boolean }) {
  const fill = on ? (move === STEP ? 'fill-sage' : 'fill-ink') : 'fill-zinc-400'
  const stroke = on ? 'stroke-ink' : 'stroke-zinc-400'
  if (move === STEP) {
    return (
      <text x={x} y={y + 4} className={`${fill} font-mono text-[10px]`}>
        +1
      </text>
    )
  }
  return (
    <g>
      <rect x={x} y={y - 4.5} width={9} height={9} rx={2} fill="none" className={stroke} strokeWidth={1.2} />
      <circle cx={x + 4.5} cy={y} r={1.4} className={fill} />
    </g>
  )
}

export default function Averages({
  label,
  table = null,
  plan = null,
  covered = false,
  unknown = false,
  counter = null,
  rung = [],
}: {
  label: string
  // The two averages on every square (null: none yet, a dash in each slot)
  table?: Table | null
  // The move each square takes, drawn darker
  plan?: Plan | null
  // Hide the ladders and snakes
  covered?: boolean
  // A question mark on every square instead of slots
  unknown?: boolean
  // A counter on the board, at a point (between squares while moving)
  counter?: { x: number; y: number } | null
  // Squares to ring, dashed: those not yet on the best move
  rung?: number[]
}) {
  const squares = Array.from({ length: SQUARES }, (_, i) => i + 1)
  const slots = (sq: number) => sq !== FINISH && (covered || standable(sq))

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto w-full" style={{ maxWidth: '30rem' }} role="img" aria-label={label}>
      {squares.map((sq) => {
        const { x, y } = corner(sq)
        return (
          <g key={sq}>
            <rect x={x} y={y} width={CELL} height={CELL} className="fill-paper" />
            {sq === FINISH && <rect x={x} y={y} width={CELL} height={CELL} className="fill-sage" opacity={0.18} />}
            <rect x={x} y={y} width={CELL} height={CELL} fill="none" className="stroke-zinc-300 dark:stroke-zinc-200/25" />
            <text x={x + 5} y={y + 13} className="fill-zinc-400 font-mono text-[11px]">
              {sq}
            </text>
          </g>
        )
      })}

      {!covered && (
        <g>
          {Object.entries(LADDERS).map(([foot, top]) => (
            <Ladder key={foot} foot={Number(foot)} top={top} faint />
          ))}
          {Object.entries(SNAKES).map(([head, tail]) => (
            <Snake key={head} head={Number(head)} tail={tail} faint />
          ))}
        </g>
      )}

      {squares.map((sq) => {
        const { x, y } = corner(sq)
        if (sq === FINISH) {
          return (
            <text
              key={sq}
              x={x + CELL / 2}
              y={y + CELL / 2 + 5}
              textAnchor="middle"
              className="fill-sage font-mono text-[11px] uppercase tracking-widest"
            >
              end
            </text>
          )
        }
        if (!slots(sq)) return null
        if (unknown) {
          return (
            <text key={sq} x={x + CELL / 2} y={y + CELL / 2 + 9} textAnchor="middle" className="fill-zinc-400 font-serif text-[17px]">
              ?
            </text>
          )
        }
        const chosen = plan && standable(sq) ? plan[state(sq)] : null
        return (
          <g key={sq} className="pointer-events-none" style={{ paintOrder: 'stroke' }}>
            {[ROLL, STEP].map((move, row) => {
              const average = table?.[state(sq)][move]
              const on = chosen === move
              const rowY = y + 30 + row * 16
              return (
                <g key={move}>
                  <Mark move={move} x={x + 5} y={rowY} on={on} />
                  <text
                    x={x + CELL - 5}
                    y={rowY + 4}
                    textAnchor="end"
                    className={`stroke-paper font-mono text-[12px] tabular-nums ${
                      on ? (move === STEP ? 'fill-sage' : 'fill-ink') : 'fill-zinc-400'
                    }`}
                    strokeWidth={3}
                    strokeLinejoin="round"
                  >
                    {average?.count ? turns(average.mean) : '–'}
                  </text>
                </g>
              )
            })}
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
            className="stroke-ink"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )
      })}

      {counter && <circle cx={counter.x} cy={counter.y} r={9} className="fill-sage stroke-paper" strokeWidth={2} opacity={0.9} />}
    </svg>
  )
}
