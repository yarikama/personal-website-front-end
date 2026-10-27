import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { BLUNDER, chance, GAME, lineOf, type Board } from './model'

// The square the blunder leaves the opponent
const MISSED_SQUARE = 3
// Positions this game never reached, where the same strategy would also move
const UNREACHED: Board[] = ['.O..X...X', '...OX.X..', '..O.X..X.']

// Narrow, so the boards stay large on a phone
const WIDTH = 520
const HEIGHT = 330
const COLUMN = WIDTH / GAME.length
const BOARD = 84
const BOARD_Y = 30
const CREDIT_Y = 172
const LOWER_Y = 216
const BAR_BOTTOM = 318
const BAR_HEIGHT = 76

const columnX = (i: number) => i * COLUMN + COLUMN / 2

function Label({ x, y, children, tone = 'fill-zinc-faded', anchor = 'middle' }: {
  x: number
  y: number
  children: string
  tone?: string
  anchor?: 'start' | 'middle' | 'end'
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={`${tone} font-mono text-[12px] uppercase tracking-widest`}>
      {children}
    </text>
  )
}

// One tic-tac-toe board, centred on `cx`, with its top at `y`
function TicTacToe({ board, cx, y, size, faint = false, marked = false, missed }: {
  board: Board
  cx: number
  y: number
  size: number
  faint?: boolean
  marked?: boolean
  missed?: number
}) {
  const cell = size / 3
  const x = cx - size / 2
  const win = lineOf(board, 'X')
  const at = (square: number) => ({ x: x + (square % 3) * cell + cell / 2, y: y + Math.floor(square / 3) * cell + cell / 2 })
  const mark = cell * 0.28
  return (
    <g opacity={faint ? 0.45 : 1}>
      {marked && <rect x={x - 6} y={y - 6} width={size + 12} height={size + 12} className="fill-none stroke-ink" strokeWidth={1.5} />}
      {[1, 2].map((k) => (
        <g key={k} className="stroke-zinc-400" strokeWidth={1.25}>
          <line x1={x + k * cell} x2={x + k * cell} y1={y} y2={y + size} />
          <line x1={x} x2={x + size} y1={y + k * cell} y2={y + k * cell} />
        </g>
      ))}
      {[...board].map((piece, square) => {
        const { x: px, y: py } = at(square)
        if (piece === 'X')
          return (
            <g key={square} className="stroke-sage" strokeWidth={2.5} strokeLinecap="round">
              <line x1={px - mark} y1={py - mark} x2={px + mark} y2={py + mark} />
              <line x1={px - mark} y1={py + mark} x2={px + mark} y2={py - mark} />
            </g>
          )
        if (piece === 'O') return <circle key={square} cx={px} cy={py} r={mark * 1.1} className="fill-none stroke-zinc-faded" strokeWidth={2} />
        return null
      })}
      {missed !== undefined && (
        <circle cx={at(missed).x} cy={at(missed).y} r={mark * 1.1} className="fill-none stroke-ink" strokeWidth={2} strokeDasharray="3 3" />
      )}
      {win && (
        <line
          x1={at(win[0]).x}
          y1={at(win[0]).y}
          x2={at(win[2]).x}
          y2={at(win[2]).y}
          className="stroke-sage"
          strokeWidth={3}
          strokeLinecap="round"
        />
      )}
    </g>
  )
}

// "+ Win": the credit a game's result hands out
function Credit({ cx, y, delay, animate }: { cx: number; y: number; delay: number; animate: boolean }) {
  return (
    <motion.g initial={animate ? { opacity: 0, y: 6 } : false} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }}>
      <rect x={cx - 32} y={y - 14} width={64} height={20} rx={10} className="fill-sage/20 stroke-sage" />
      <Label x={cx} y={y} tone="fill-sage">
        + win
      </Label>
    </motion.g>
  )
}

// The story, one step at a time:
// 0 the game, 1 the blunder, 2 credit for every move, 3 and for positions
// never reached, 4 each position's chance of winning, 5 both, named
export default function OneGame({ step }: { step: number }) {
  const reducedMotion = usePrefersReducedMotion()
  const animate = !reducedMotion
  const credit = step >= 2
  const scored = step >= 4
  const named = step >= 5
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto w-full max-w-[34rem]"
      role="img"
      aria-label={
        scored
          ? `Each position scored by its chance of winning: ${GAME.map((b) => `${Math.round(chance(b) * 100)}%`).join(', ')}; the blunder scores 0%`
          : 'Four boards from a game of tic-tac-toe that we win'
      }
    >
      <Label x={WIDTH / 2} y={14} tone={step === 1 ? 'fill-ink' : 'fill-zinc-faded'}>
        {step === 1 ? 'Move 3 leaves them a win' : 'Your game, as X'}
      </Label>
      {GAME.map((board, i) => (
        <motion.g
          key={board}
          initial={animate && step === 0 ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.7, duration: 0.4 }}
        >
          <TicTacToe
            board={board}
            cx={columnX(i)}
            y={BOARD_Y}
            size={BOARD}
            marked={step >= 1 && i === BLUNDER}
            missed={step >= 1 && i === BLUNDER ? MISSED_SQUARE : undefined}
          />
          <Label x={columnX(i)} y={BOARD_Y + BOARD + 16}>{`Move ${i + 1}`}</Label>
        </motion.g>
      ))}

      {credit && (
        <>
          <Label x={8} y={CREDIT_Y - 14} anchor="start" tone="fill-ink">
            {named ? 'Evolutionary: one result' : 'Result only: keep it all'}
          </Label>
          {GAME.map((board, i) => (
            <Credit key={board} cx={columnX(i)} y={CREDIT_Y + 12} delay={step === 2 ? i * 0.25 : 0} animate={animate && step === 2} />
          ))}
        </>
      )}

      {step === 3 && (
        <>
          <Label x={8} y={LOWER_Y} anchor="start">
            Never reached: credited too
          </Label>
          {UNREACHED.map((board, i) => (
            <motion.g
              key={board}
              initial={animate ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.4, duration: 0.4 }}
            >
              <TicTacToe board={board} cx={columnX(i) + COLUMN / 2} y={LOWER_Y + 12} size={60} faint />
              <Credit cx={columnX(i) + COLUMN / 2} y={LOWER_Y + 100} delay={0.6 + i * 0.4} animate={animate} />
            </motion.g>
          ))}
        </>
      )}

      {scored && (
        <>
          <Label x={8} y={LOWER_Y} anchor="start" tone="fill-ink">
            {named ? 'Value function: every position' : 'Each position: chance to win'}
          </Label>
          <line x1={0} x2={WIDTH} y1={BAR_BOTTOM} y2={BAR_BOTTOM} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
          {GAME.map((board, i) => {
            const value = chance(board)
            const height = Math.max(2, value * BAR_HEIGHT)
            const bad = i === BLUNDER
            return (
              <g key={board}>
                <motion.rect
                  x={columnX(i) - 18}
                  width={36}
                  initial={animate && step === 4 ? { y: BAR_BOTTOM, height: 0 } : false}
                  animate={{ y: BAR_BOTTOM - height, height }}
                  transition={{ delay: i * 0.35, duration: 0.6 }}
                  className={bad ? 'fill-ink' : 'fill-sage'}
                />
                <motion.g
                  initial={animate && step === 4 ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.35 + 0.4, duration: 0.3 }}
                >
                  <Label x={columnX(i)} y={BAR_BOTTOM - height - 8} tone={bad ? 'fill-ink' : 'fill-sage'}>
                    {`${Math.round(value * 100)}%`}
                  </Label>
                </motion.g>
              </g>
            )
          })}
        </>
      )}
    </svg>
  )
}
