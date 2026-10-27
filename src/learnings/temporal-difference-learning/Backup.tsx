import { lerp, useLoop, within } from '../../components/explain/useLoop'
import { MiniBoard } from './Board'
import { backups } from './model'

// One winning game, as the boards just after each of our moves: a corner,
// the opposite corner, then a block that threatens two lines at once. The
// opponent can stop only one.
const POSITIONS = ['X........', 'X...O...X', 'X.O.O.X.X']
const WON = 'X.OOO.XXX'
const GAMES = 6
const STEP = 0.5
const GUESSES = backups(POSITIONS.length, STEP, GAMES)

const WIDTH = 460
const HEIGHT = 230
const SIZE = 64
const COLUMN = (i: number) => 30 + i * 110
const BASE = 205
const TALL = 80

const ease = (t: number) => 1 - (1 - t) ** 3

// The same game played six times over, each guess nudged halfway toward the
// next as the game goes. Only the last position learns from the first game;
// each game after, the win reaches one position further back.
export default function Backup() {
  const phase = useLoop(GAMES * 2600, 0.999)
  const game = Math.min(GAMES - 1, Math.floor(phase * GAMES))
  const local = phase * GAMES - game

  // Each position updates at its moment in the game, in the order played
  const moments = POSITIONS.map((_, i) => within(local, 0.12 + i * 0.25, 0.32 + i * 0.25))
  const now = moments.findIndex((moment) => moment !== null)
  const guess = (i: number) => {
    const at = moments[i]
    const done = local >= 0.32 + i * 0.25
    return lerp(GUESSES[game][i], GUESSES[game + 1][i], done ? 1 : at === null ? 0 : ease(at))
  }
  const reached = POSITIONS.filter((_, i) => guess(i) > 0.501).length

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.8rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">Game {game + 1}</span>
        <span className="text-right text-sage">
          The win has reached {reached} of {POSITIONS.length} positions
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto mt-3 w-full max-w-[32rem]"
        role="img"
        aria-label="Four boards of one winning game, each with a bar for its guessed chance of winning. Game after game, the bars rise from the last board back to the first."
      >
        {[...POSITIONS, WON].map((board, i) => {
          const x = COLUMN(i)
          const value = i < POSITIONS.length ? guess(i) : 1
          const height = value * TALL
          return (
            <g key={board}>
              {i === now && (
                <rect x={x - 6} y={8} width={SIZE + 12} height={SIZE + 12} className="fill-none stroke-sage" strokeWidth={1.5} />
              )}
              <MiniBoard board={board} x={x} y={14} size={SIZE} />
              {i > 0 && (
                <path
                  d={`M ${x - 30} ${14 + SIZE / 2 - 5} l 6 5 l -6 5`}
                  className="fill-none stroke-zinc-400"
                  strokeWidth={1.5}
                />
              )}
              <line
                x1={x}
                x2={x + SIZE}
                y1={BASE - TALL / 2}
                y2={BASE - TALL / 2}
                className="stroke-zinc-300 dark:stroke-zinc-200/25"
                strokeDasharray="2 3"
              />
              <rect
                x={x + SIZE / 2 - 14}
                y={BASE - height}
                width={28}
                height={height}
                className={i < POSITIONS.length ? 'fill-sage/80' : 'fill-ink/80'}
              />
              <text x={x + SIZE / 2} y={BASE - height - 7} textAnchor="middle" className="fill-ink font-mono text-[11px]">
                {i < POSITIONS.length ? value.toFixed(2) : 'won'}
              </text>
            </g>
          )
        })}
        <line x1={20} x2={WIDTH - 20} y1={BASE} y2={BASE} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      </svg>
    </div>
  )
}
