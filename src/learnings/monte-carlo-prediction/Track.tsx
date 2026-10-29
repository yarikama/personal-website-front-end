import { CELL, centre, corner, HEIGHT, WIDTH } from './board'
import { FINISH, LADDERS, SNAKES, START } from './model'

// The snakes-and-ladders board, drawn: twenty squares winding up from the
// bottom left, two ladders and two snakes, a number in each square, a token
// and the trail of the game being played. It only draws; the story and the
// figure to play with work out what goes in it.

// Ladders and snakes run straight up and down a column, along one side of
// it, clear of the numbers in the middle: ladders on the right, snakes on
// the left unless another snake is there already
const SIDE = 25
const end = (square: number, dx: number) => {
  const { x, y } = centre(square)
  return { x: x + dx, y }
}

function Ladder({ from, to }: { from: number; to: number }) {
  const a = end(from, SIDE)
  const b = end(to, SIDE)
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  // Across the ladder, for the rails and the rungs
  const nx = (-(b.y - a.y) / length) * 4
  const ny = ((b.x - a.x) / length) * 4
  const rungs = Math.floor(length / 11)
  return (
    <g className="stroke-zinc-400" strokeWidth={1.5}>
      <line x1={a.x + nx} y1={a.y + ny} x2={b.x + nx} y2={b.y + ny} />
      <line x1={a.x - nx} y1={a.y - ny} x2={b.x - nx} y2={b.y - ny} />
      {Array.from({ length: rungs }, (_, i) => {
        const t = (i + 0.5) / rungs
        const x = a.x + (b.x - a.x) * t
        const y = a.y + (b.y - a.y) * t
        return <line key={i} x1={x + nx} y1={y + ny} x2={x - nx} y2={y - ny} />
      })}
    </g>
  )
}

function Snake({ from, to, side }: { from: number; to: number; side: number }) {
  const a = end(from, side)
  const b = end(to, side)
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  const nx = -(b.y - a.y) / length
  const ny = (b.x - a.x) / length
  const points = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40
    const wave = Math.sin(t * Math.PI * 5) * 3 * (1 - t * 0.5)
    return `${a.x + (b.x - a.x) * t + nx * wave},${a.y + (b.y - a.y) * t + ny * wave}`
  })
  return (
    <g>
      <polyline points={points.join(' ')} fill="none" className="stroke-ink/45" strokeWidth={4} strokeLinecap="round" />
      <circle cx={a.x} cy={a.y} r={5} className="fill-ink/70" />
    </g>
  )
}

export interface Note {
  // The big number in the square
  main?: string
  // A line under it
  sub?: string
  // Drawn in sage: the squares this game stood on
  accent?: boolean
  // How deep to tint the square, from 0 to 1
  tint?: number
}

export default function Track({
  label,
  notes = {},
  token = null,
  trail = [],
  named = false,
}: {
  label: string
  notes?: Record<number, Note>
  // Where the token is, in the drawing's units
  token?: { x: number; y: number } | null
  // The squares stood on, in order, to join with a line
  trail?: number[]
  // Call the squares states
  named?: boolean
}) {
  const jumps: Record<number, number> = { ...LADDERS, ...SNAKES }
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto w-full max-w-[26rem]" role="img" aria-label={label}>
      {Array.from({ length: FINISH }, (_, i) => {
        const square = i + 1
        const { x, y } = corner(square)
        const note = notes[square]
        const jump = jumps[square]
        return (
          <g key={square}>
            <rect x={x} y={y} width={CELL} height={CELL} className="fill-paper" />
            {note?.tint ? (
              <rect x={x} y={y} width={CELL} height={CELL} className="fill-sage" opacity={0.06 + note.tint * 0.3} />
            ) : null}
            <rect x={x} y={y} width={CELL} height={CELL} fill="none" className="stroke-zinc-300 dark:stroke-zinc-200/25" />
            {note?.accent && (
              <rect x={x + 3} y={y + 3} width={CELL - 6} height={CELL - 6} fill="none" className="stroke-sage" strokeWidth={2} />
            )}
            <text x={x + CELL / 2} y={y + 13} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
              {named && !jump && square !== FINISH ? `s${square}` : square}
              {jump !== undefined && ` → ${jump}`}
            </text>
            {square === FINISH && (
              <text x={x + CELL / 2} y={y + CELL / 2 + 4} textAnchor="middle" className="fill-ink font-mono text-[10px] uppercase tracking-widest">
                Finish
              </text>
            )}
            {square === START && !note?.main && (
              <text x={x + CELL / 2} y={y + CELL / 2 + 4} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
                Start
              </text>
            )}
          </g>
        )
      })}

      {Object.entries(LADDERS).map(([from, to]) => (
        <Ladder key={from} from={Number(from)} to={to} />
      ))}
      {Object.entries(SNAKES).map(([from, to], i) => (
        <Snake key={from} from={Number(from)} to={to} side={i % 2 ? -SIDE : SIDE} />
      ))}

      {trail.length > 1 && (
        <polyline
          points={trail.map((square) => `${centre(square).x},${centre(square).y}`).join(' ')}
          fill="none"
          className="stroke-sage"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.8}
        />
      )}

      {/* The numbers, over the ladders and snakes, with a paper halo */}
      {Object.entries(notes).map(([key, note]) => {
        const { x, y } = centre(Number(key))
        return (
          <g key={key} style={{ paintOrder: 'stroke' }} className="stroke-paper" strokeWidth={4} strokeLinejoin="round">
            {note.main && (
              <text x={x} y={y + 5} textAnchor="middle" className={`font-mono text-[15px] tabular-nums ${note.accent ? 'fill-sage' : 'fill-ink'}`}>
                {note.main}
              </text>
            )}
            {note.sub && (
              <text x={x} y={y + 22} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px] tabular-nums">
                {note.sub}
              </text>
            )}
          </g>
        )
      })}

      {token && <circle cx={token.x} cy={token.y} r={8} className="fill-sage stroke-paper" strokeWidth={2} />}
    </svg>
  )
}
