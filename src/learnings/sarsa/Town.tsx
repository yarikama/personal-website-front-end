import { STEP, type Cell, type Gridworld } from '../../components/explain/mdp'
import { score, type Table } from './model'

// A small town drawn as a grid of blocks: streets you can walk, buildings
// you can't, maybe a river, home and the station. On it, what the learner
// thinks of each way out of each corner, routes, and you walking. It only
// draws; the pages work out the numbers. The q-learning page uses it too.

export const CELL = 72
const PAD = 10

const centre = (c: { x: number; y: number }) => ({ x: PAD + c.x * CELL + CELL / 2, y: PAD + c.y * CELL + CELL / 2 })


export interface Route {
  cells: number[]
  tone: 'sage' | 'ink'
  dashed?: boolean
  // How far along it is drawn, 0 to 1
  shown?: number
  // Drawn lightly, behind what else is shown
  faint?: boolean
}

export interface Mark {
  at: Cell
  text: string
  accent?: boolean
}

interface TownProps {
  world: Gridworld
  label: string
  home: Cell
  goal: Cell
  // Draw each way's score as a number on its side of the corner, or only
  // the best ways, as arrows
  table?: Table | null
  scores?: 'numbers' | 'arrows'
  // Digits after the point for the numbers
  digits?: number
  // Corners whose scores to show; all by default
  only?: number[]
  // A corner to ring
  focus?: number | null
  // The way out of the focus to draw, and the way after it
  ways?: { cell: number; action: number; tone: 'sage' | 'ink'; text?: string }[]
  routes?: Route[]
  walker?: { x: number; y: number } | null
  wet?: boolean
  // Someone else walking, drawn in ink
  other?: { x: number; y: number } | null
  trail?: Cell[]
  marks?: Mark[]
  // What the goal is, and where in its cell to write it: away from the
  // side routes arrive from
  goalName?: string
  goalLabel?: 'top' | 'bottom'
}

export default function Town({
  world,
  label,
  home,
  goal,
  table = null,
  scores = 'numbers',
  digits = 0,
  only,
  focus = null,
  ways = [],
  routes = [],
  walker = null,
  wet = false,
  other = null,
  trail = [],
  marks = [],
  goalName = 'Station',
  goalLabel = 'bottom',
}: TownProps) {
  const { width, height, walls = [], ends = [] } = world.grid
  const size = { w: PAD * 2 + width * CELL, h: PAD * 2 + height * CELL }
  const isWall = (c: Cell) => walls.some((w) => w.x === c.x && w.y === c.y)
  const water = (c: Cell) => ends.some((e) => e.at.x === c.x && e.at.y === c.y && e.reward < -10)
  const shownScores = (s: number) => table && table[s].length > 0 && (!only || only.includes(s))

  return (
    <svg viewBox={`0 0 ${size.w} ${size.h}`} className="mx-auto w-full" style={{ maxWidth: `${width * 5}rem` }} role="img" aria-label={label}>
      <defs>
        <marker id="town-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="fill-sage" />
        </marker>
        <marker id="town-arrow-ink" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="fill-ink" />
        </marker>
      </defs>

      {world.names.map((_, s) => {
        const c = world.cell(s)
        const x = PAD + c.x * CELL
        const y = PAD + c.y * CELL
        if (isWall(c)) {
          return (
            <g key={s}>
              <rect x={x} y={y} width={CELL} height={CELL} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
              <rect x={x + 7} y={y + 7} width={CELL - 14} height={CELL - 14} className="fill-zinc-300 dark:fill-zinc-200/20" />
            </g>
          )
        }
        if (water(c)) {
          return (
            <g key={s}>
              <rect x={x} y={y} width={CELL} height={CELL} className="fill-zinc-300/60 dark:fill-zinc-200/15" />
              {[0.32, 0.62].map((at) => (
                <path
                  key={at}
                  d={`M${x + 8},${y + CELL * at} q9,-7 18,0 t18,0 t18,0`}
                  fill="none"
                  className="stroke-zinc-400"
                  strokeWidth={1.5}
                />
              ))}
            </g>
          )
        }
        return <rect key={s} x={x} y={y} width={CELL} height={CELL} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" />
      })}

      {/* Home, a little house in its corner, and the goal, ringed and named */}
      {(() => {
        const h = { x: PAD + home.x * CELL, y: PAD + home.y * CELL }
        const g = centre(goal)
        return (
          <g className="pointer-events-none">
            <path
              d={`M${h.x + 6},${h.y + 12} L${h.x + 12},${h.y + 6} L${h.x + 18},${h.y + 12} L${h.x + 18},${h.y + 19} L${h.x + 6},${h.y + 19} Z`}
              className="fill-ink"
            />
            <rect x={g.x - CELL / 2 + 4} y={g.y - CELL / 2 + 4} width={CELL - 8} height={CELL - 8} fill="none" className="stroke-ink" strokeWidth={2} />
            <text x={g.x} y={goalLabel === 'top' ? g.y - CELL / 2 + 20 : g.y + CELL / 2 - 12} textAnchor="middle" className="fill-ink font-mono text-[10px] uppercase">
              {goalName}
            </text>
          </g>
        )
      })()}

      {/* Each way's score, or the best ways as arrows */}
      {table &&
        world.names.map((_, s) => {
          if (!shownScores(s)) return null
          const c = centre(world.cell(s))
          const row = table[s]
          const top = Math.max(...row)
          const tried = row.some((value) => value !== 0)
          if (scores === 'arrows') {
            if (!tried) return null
            return row.flatMap((value, a) => {
              if (value !== top) return []
              const [dx, dy] = STEP[a]
              return [
                <line
                  key={`${s}-${a}`}
                  x1={c.x + dx * 4}
                  y1={c.y + dy * 4}
                  x2={c.x + dx * 26}
                  y2={c.y + dy * 26}
                  className="pointer-events-none stroke-sage"
                  strokeWidth={2.5}
                  markerEnd="url(#town-arrow)"
                />,
              ]
            })
          }
          return row.map((value, a) => {
            const [dx, dy] = STEP[a]
            const best = tried && value === top
            return (
              <text
                key={`${s}-${a}`}
                x={c.x + dx * 22}
                y={c.y + dy * 21 + 4}
                textAnchor="middle"
                className={`pointer-events-none font-mono text-[11px] tabular-nums ${best ? 'fill-sage' : tried ? 'fill-zinc-faded' : 'fill-zinc-400'}`}
              >
                {score(value, digits)}
              </text>
            )
          })
        })}

      {/* Routes */}
      {routes.map((route, i) => {
        const points = route.cells.map((s) => centre(world.cell(s)))
        const d = points.map((p, j) => `${j ? 'L' : 'M'}${p.x},${p.y}`).join(' ')
        return (
          <path
            key={i}
            d={d}
            fill="none"
            className={`pointer-events-none ${route.tone === 'sage' ? 'stroke-sage' : 'stroke-ink'}`}
            strokeWidth={route.tone === 'sage' ? 4 : 3}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeOpacity={route.faint ? 0.3 : 0.75}
            pathLength={1}
            strokeDasharray={route.dashed ? '0.012 0.02' : route.shown !== undefined ? 1 : undefined}
            strokeDashoffset={!route.dashed && route.shown !== undefined ? 1 - route.shown : undefined}
          />
        )
      })}

      {/* The ways out of the focus */}
      {ways.map(({ cell, action, tone, text }, i) => {
        const c = centre(world.cell(cell))
        const [dx, dy] = STEP[action]
        const sage = tone === 'sage'
        // The way's score, beside the middle of its arrow
        const mid = { x: c.x + dx * (CELL / 2), y: c.y + dy * (CELL / 2) }
        return (
          <g key={i} className="pointer-events-none">
            <line
              x1={c.x + dx * 12}
              y1={c.y + dy * 12}
              x2={c.x + dx * (CELL - 14)}
              y2={c.y + dy * (CELL - 14)}
              className={sage ? 'stroke-sage' : 'stroke-ink'}
              strokeWidth={3}
              markerEnd={sage ? 'url(#town-arrow)' : 'url(#town-arrow-ink)'}
            />
            {text && (
              <text
                x={mid.x + (dy ? 8 : dx * 14)}
                y={mid.y + (dx ? -12 : 4)}
                textAnchor={dy ? 'start' : 'middle'}
                className={`font-mono text-[13px] tabular-nums ${sage ? 'fill-sage' : 'fill-ink'}`}
              >
                {text}
              </text>
            )}
          </g>
        )
      })}
      {focus !== null && (
        <rect
          x={PAD + world.cell(focus).x * CELL + 2}
          y={PAD + world.cell(focus).y * CELL + 2}
          width={CELL - 4}
          height={CELL - 4}
          fill="none"
          className="pointer-events-none stroke-sage"
          strokeWidth={3}
        />
      )}

      {/* Labels on cells */}
      {marks.map((mark, i) => {
        const p = centre(mark.at)
        return (
          <text
            key={i}
            x={p.x}
            y={p.y + CELL / 2 - 10}
            textAnchor="middle"
            className={`pointer-events-none font-mono text-[12px] ${mark.accent ? 'fill-sage' : 'fill-ink'}`}
          >
            {mark.text}
          </text>
        )
      })}

      {/* The trail and the walker */}
      {trail.map((c, i) => {
        const p = centre(c)
        return <circle key={i} cx={p.x} cy={p.y} r={4} className="fill-sage" opacity={0.15 + (0.4 * (i + 1)) / trail.length} />
      })}
      {walker && (
        <circle
          cx={centre(walker).x}
          cy={centre(walker).y}
          r={10}
          className={`pointer-events-none ${wet ? 'fill-ink' : 'fill-sage'}`}
        />
      )}
      {other && <circle cx={centre(other).x} cy={centre(other).y} r={7} className="pointer-events-none fill-ink" />}
    </svg>
  )
}
