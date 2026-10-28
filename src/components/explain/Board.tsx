import type { KeyboardEvent } from 'react'
import { A, A_, B, B_, STEP, type Cell, type Gridworld } from './mdp'

// A gridworld drawn: its cells, what each is worth, the moves a policy
// takes, and someone walking it. The value pages share it (the board with A
// and B on it, and other grids). It only draws: the page works out the
// numbers with mdp.ts and animates by passing new props.

export const CELL = 76
const PAD = 14

const centre = (c: Cell) => ({ x: PAD + c.x * CELL + CELL / 2, y: PAD + c.y * CELL + CELL / 2 })

export interface Mark {
  at: Cell
  text: string
  // The tone of the mark: the thing to watch, or plain
  accent?: boolean
}

interface BoardProps {
  world: Gridworld
  label: string
  // What each state is worth, written in its cell (null: no numbers)
  values?: number[] | null
  // Tint each cell by its value: the more it is worth, the deeper
  shade?: boolean
  // The values to scale the tint against (by default `values` themselves)
  scale?: number
  // For each state, the actions to draw as arrows
  arrows?: number[][] | null
  // A cell to draw ringed, with its four moves
  focus?: number | null
  // Cells to fade back
  faded?: number[]
  // Letters in a cell's corner (A, B, the goal); by default the board's
  marks?: Mark[]
  // Draw the jumps: A to A′ and B to B′
  jumps?: boolean
  // Someone on the board, at a cell (between cells while moving)
  walker?: { x: number; y: number } | null
  // A word by the walker: what the move paid
  said?: string | null
  // A trail of cells behind the walker
  trail?: Cell[]
  // Tapping a cell picks it
  onPick?: (state: number) => void
}

const BOARD_MARKS: Mark[] = [
  { at: A, text: 'A', accent: true },
  { at: A_, text: 'A′' },
  { at: B, text: 'B', accent: true },
  { at: B_, text: 'B′' },
]

const fmt = (value: number) => (Math.abs(value) < 0.05 ? '0.0' : value.toFixed(1)).replace('-', '−')

export default function Board({
  world,
  label,
  values = null,
  shade = false,
  scale,
  arrows = null,
  focus = null,
  faded = [],
  marks = BOARD_MARKS,
  jumps = false,
  walker = null,
  said = null,
  trail = [],
  onPick,
}: BoardProps) {
  const { width, height, walls = [], jumps: jumpList = [], ends = [] } = world.grid
  const size = { w: PAD * 2 + width * CELL, h: PAD * 2 + height * CELL }
  const top = scale ?? (values ? Math.max(...values.map(Math.abs), 1e-9) : 1)
  const isWall = (c: Cell) => walls.some((w) => w.x === c.x && w.y === c.y)
  const isEnd = (c: Cell) => ends.some((e) => e.at.x === c.x && e.at.y === c.y)

  const keys = (state: number) => (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onPick?.(state)
  }

  // The four moves from the focus: to a neighbour, into the edge, or a jump
  const branches =
    focus === null
      ? []
      : world.moves[focus].map((outcomes, a) => {
          const from = world.cell(focus)
          const to = world.cell(outcomes[0].next)
          return { a, from, to, stay: outcomes[0].next === focus, jump: Math.abs(to.x - from.x) + Math.abs(to.y - from.y) > 1 }
        })

  return (
    <svg
      viewBox={`0 0 ${size.w} ${size.h}`}
      className="mx-auto w-full"
      style={{ maxWidth: `${width * 5.2}rem` }}
      role="img"
      aria-label={label}
    >
      <defs>
        <marker id="board-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="fill-sage" />
        </marker>
        <marker id="board-arrow-faint" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="fill-zinc-400" />
        </marker>
      </defs>

      {world.names.map((_, s) => {
        const c = world.cell(s)
        const x = PAD + c.x * CELL
        const y = PAD + c.y * CELL
        const value = values?.[s]
        const wall = isWall(c)
        const tint = shade && value !== undefined && !wall ? Math.min(1, Math.abs(value) / top) : 0
        const pickable = onPick && !wall
        return (
          <g
            key={s}
            opacity={faded.includes(s) ? 0.3 : 1}
            onClick={pickable ? () => onPick(s) : undefined}
            onKeyDown={pickable ? keys(s) : undefined}
            tabIndex={pickable ? 0 : undefined}
            role={pickable ? 'button' : undefined}
            aria-label={pickable ? `Square ${world.names[s]}${value !== undefined ? `, worth ${fmt(value)}` : ''}` : undefined}
            className={pickable ? 'cursor-pointer outline-none' : undefined}
          >
            <rect
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              className={wall ? 'fill-zinc-300 dark:fill-zinc-200/20' : 'fill-paper'}
            />
            {tint > 0 && (
              <rect
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                className={value! >= 0 ? 'fill-sage' : 'fill-zinc-400'}
                opacity={0.08 + tint * 0.42}
              />
            )}
            <rect
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              fill="none"
              className="stroke-zinc-300 dark:stroke-zinc-200/25"
            />
            {isEnd(c) && (
              <rect x={x + 6} y={y + 6} width={CELL - 12} height={CELL - 12} fill="none" className="stroke-ink" strokeWidth={2} />
            )}
            {value !== undefined && !wall && !isEnd(c) && (
              <text
                x={x + CELL / 2}
                y={y + CELL / 2 + 7}
                textAnchor="middle"
                className={`font-serif text-[21px] tabular-nums ${value < 0 ? 'fill-zinc-faded' : 'fill-ink'}`}
              >
                {fmt(value)}
              </text>
            )}
          </g>
        )
      })}

      {/* The corner letters */}
      {marks.map((mark) => (
        <text
          key={mark.text}
          x={PAD + mark.at.x * CELL + 6}
          y={PAD + mark.at.y * CELL + 16}
          className={`pointer-events-none font-mono text-[13px] ${mark.accent ? 'fill-sage' : 'fill-zinc-faded'}`}
        >
          {mark.text}
        </text>
      ))}

      {/* The jumps, as dashed arcs with what they pay */}
      {jumps &&
        jumpList.map((jump) => {
          const from = centre(jump.from)
          const to = centre(jump.to)
          const bend = CELL * 0.62
          const mid = { x: (from.x + to.x) / 2 + bend, y: (from.y + to.y) / 2 }
          return (
            <g key={`${jump.from.x},${jump.from.y}`} className="pointer-events-none">
              <path
                d={`M${from.x + 10},${from.y + 14} Q${mid.x},${mid.y} ${to.x + 22},${to.y - 20}`}
                fill="none"
                className="stroke-sage"
                strokeWidth={2}
                strokeDasharray="5 4"
                markerEnd="url(#board-arrow)"
              />
              <text x={mid.x + 2} y={mid.y + 5} className="fill-sage font-mono text-[15px]">
                +{jump.reward}
              </text>
            </g>
          )
        })}

      {/* The policy's moves */}
      {arrows?.map((actions, s) =>
        actions.map((a) => {
          const c = centre(world.cell(s))
          const [dx, dy] = STEP[a]
          // Clear of the number in the cell: it is wider than it is tall
          const near = values ? (dx ? 27 : 14) : 6
          const far = values ? (dx ? 37 : 31) : 26
          return (
            <line
              key={`${s}-${a}`}
              x1={c.x + dx * near}
              y1={c.y + dy * near}
              x2={c.x + dx * far}
              y2={c.y + dy * far}
              className="pointer-events-none stroke-sage"
              strokeWidth={2.5}
              markerEnd="url(#board-arrow)"
            />
          )
        })
      )}

      {/* The focus: ringed, with its four moves */}
      {focus !== null && (
        <g className="pointer-events-none">
          {branches.map(({ a, from, to, stay, jump }) => {
            const f = centre(from)
            const [dx, dy] = STEP[a]
            if (jump) {
              if (a > 0 || jumps) return null
              const t = centre(to)
              return (
                <line
                  key={a}
                  x1={f.x + dx * 14}
                  y1={f.y + dy * 14}
                  x2={t.x}
                  y2={t.y - 20}
                  className="stroke-sage"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  markerEnd="url(#board-arrow)"
                />
              )
            }
            if (stay) {
              // Into the edge: a short stub that stops at the wall
              return (
                <g key={a}>
                  <line
                    x1={f.x + dx * (CELL / 2 - 14)}
                    y1={f.y + dy * (CELL / 2 - 14)}
                    x2={f.x + dx * (CELL / 2 - 3)}
                    y2={f.y + dy * (CELL / 2 - 3)}
                    className="stroke-zinc-400"
                    strokeWidth={2}
                  />
                  <line
                    x1={f.x + dx * (CELL / 2) - dy * 10}
                    y1={f.y + dy * (CELL / 2) - dx * 10}
                    x2={f.x + dx * (CELL / 2) + dy * 10}
                    y2={f.y + dy * (CELL / 2) + dx * 10}
                    className="stroke-ink"
                    strokeWidth={3}
                  />
                </g>
              )
            }
            return (
              <line
                key={a}
                x1={f.x + dx * (CELL / 2 - 8)}
                y1={f.y + dy * (CELL / 2 - 8)}
                x2={f.x + dx * (CELL / 2 + 18)}
                y2={f.y + dy * (CELL / 2 + 18)}
                className="stroke-sage"
                strokeWidth={2}
                markerEnd="url(#board-arrow)"
              />
            )
          })}
          <rect
            x={PAD + world.cell(focus).x * CELL + 2}
            y={PAD + world.cell(focus).y * CELL + 2}
            width={CELL - 4}
            height={CELL - 4}
            fill="none"
            className="stroke-sage"
            strokeWidth={3}
          />
        </g>
      )}

      {/* The trail and the walker */}
      {trail.map((c, i) => {
        const p = centre(c)
        return <circle key={i} cx={p.x} cy={p.y} r={4} className="fill-sage" opacity={0.15 + (0.35 * (i + 1)) / trail.length} />
      })}
      {walker && (
        <g className="pointer-events-none">
          <circle cx={PAD + walker.x * CELL + CELL / 2} cy={PAD + walker.y * CELL + CELL / 2} r={11} className="fill-sage" />
          {said && (
            <text
              x={PAD + walker.x * CELL + CELL / 2}
              y={PAD + walker.y * CELL + CELL / 2 - 17}
              textAnchor="middle"
              className={`font-mono text-[15px] ${said.startsWith('−') ? 'fill-ink' : 'fill-sage'}`}
            >
              {said}
            </text>
          )}
        </g>
      )}
    </svg>
  )
}

