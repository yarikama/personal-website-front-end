import { actionValues, backup, type Mdp, type Outcome } from '../../components/explain/mdp'

// The planning pages' world: snakes and ladders on 30 squares, where each
// turn you may roll the die or step one square. Every turn costs 1, so a
// square's value is minus the turns it takes, on average, to finish. The
// rules are known in full, which is what planning needs: from any square,
// where each move can land and how likely each landing is.
//
// Squares are numbered 1 to 30, as on a board; state s is square s + 1.
// A ladder's foot and a snake's head are not squares you stand on (you
// are carried off at once), and the finish ends the game: none of them has
// moves, so mdp.ts treats them as worth 0 and nothing lands on them.

export const SQUARES = 30
export const FINISH = 30
export const FACES = 6
// Foot to top, and head to tail
export const LADDERS: Record<number, number> = { 3: 13, 8: 16, 19: 27 }
export const SNAKES: Record<number, number> = { 14: 5, 22: 11, 28: 18 }

export const ROLL = 0
export const STEP = 1
export const MOVES = ['roll', 'step'] as const

export const state = (square: number) => square - 1
export const square = (state: number) => state + 1

// Where you end up from a square: carried up a ladder or down a snake
export const carried = (to: number) => LADDERS[to] ?? SNAKES[to] ?? to

// Where moving `k` squares from `from` leaves you; reaching or passing the
// last square finishes
export const landing = (from: number, k: number) => (from + k >= FINISH ? FINISH : carried(from + k))

// A square you can stand on, and so choose a move from
export const standable = (sq: number) => sq >= 1 && sq < FINISH && !(sq in LADDERS) && !(sq in SNAKES)

// Every square you can stand on, from the start to the last before the finish
export const SPOTS = Array.from({ length: SQUARES }, (_, i) => i + 1).filter(standable)

// The moves from a square: a roll lands on one of six squares, 1 in 6
// each (two faces may lead to the same square); a step on the next one
function movesFrom(sq: number): Outcome[][] {
  if (!standable(sq)) return []
  const roll = new Map<number, number>()
  for (let k = 1; k <= FACES; k++) {
    const to = landing(sq, k)
    roll.set(to, (roll.get(to) ?? 0) + 1 / FACES)
  }
  return [
    [...roll].map(([to, chance]) => ({ next: state(to), reward: -1, chance })),
    [{ next: state(landing(sq, 1)), reward: -1, chance: 1 }],
  ]
}

export const BOARD: Mdp = {
  names: Array.from({ length: SQUARES }, (_, i) => String(i + 1)),
  moves: Array.from({ length: SQUARES }, (_, i) => movesFrom(i + 1)),
}

// No discounting: a turn is a turn, however late
export const GAMMA = 1

// A way of playing: the move (ROLL or STEP) on each square, by state.
// Squares you can't stand on keep ROLL, which nothing reads.
export type Plan = number[]

export const ALWAYS_ROLL: Plan = BOARD.names.map(() => ROLL)

// What a move from a square is worth, given every square's value: −1 for
// the turn, plus the average value of where it lands
export const worth = (values: number[], sq: number, move: number) => backup(BOARD, values, GAMMA, state(sq), move)

// Both moves' worth from a square: [roll, step]
export const both = (values: number[], sq: number) => actionValues(BOARD, values, GAMMA, state(sq))

// How sweeps go through the squares: each new value from the last sweep's
// numbers (two copies), or written over the old at once, in place, going
// from the start up or from the finish down
export type Order = 'copies' | 'up' | 'down'

export interface Pass {
  values: number[]
  // The biggest change any square made in this sweep
  delta: number
}

// One sweep: every square you can stand on gets −1 plus the average value
// of where its move lands, by `plan`; or, with 'best', of its better move
export function sweep(values: number[], plan: Plan | 'best', order: Order = 'copies'): Pass {
  const next = [...values]
  const read = order === 'copies' ? values : next
  const spots = order === 'down' ? [...SPOTS].reverse() : SPOTS
  let delta = 0
  for (const sq of spots) {
    const s = state(sq)
    const value =
      plan === 'best' ? Math.max(...actionValues(BOARD, read, GAMMA, s)) : backup(BOARD, read, GAMMA, s, plan[s])
    delta = Math.max(delta, Math.abs(value - values[s]))
    next[s] = value
  }
  return { values: next, delta }
}

export const zeros = () => BOARD.names.map(() => 0)

// Sweeps from `start` until the biggest change is under `theta`, or `most`
// sweeps. The first pass is the start itself (its delta is Infinity); the
// last is where it stopped.
export function sweeps(
  plan: Plan | 'best',
  theta: number,
  order: Order = 'copies',
  start: number[] = zeros(),
  most = 10_000,
): Pass[] {
  const passes: Pass[] = [{ values: start, delta: Infinity }]
  while (passes.length <= most) {
    const pass = sweep(passes[passes.length - 1].values, plan, order)
    passes.push(pass)
    if (pass.delta < theta) break
  }
  return passes
}

// The exact values of a way of playing (or of the best play), to far more
// places than any figure shows
const exact = new Map<string, number[]>()
export function solve(plan: Plan | 'best'): number[] {
  const key = plan === 'best' ? 'best' : plan.join('')
  let values = exact.get(key)
  if (!values) {
    values = sweeps(plan, 1e-12, 'down').at(-1)!.values
    exact.set(key, values)
  }
  return values
}

// The way of playing that takes, on every square, the move worth more by
// `values`; on a tie (within `slack`) it keeps `keep`'s move, so a plan
// stops changing once nothing beats it
export function greedy(values: number[], keep: Plan = ALWAYS_ROLL, slack = 1e-9): Plan {
  return keep.map((move, s) => {
    const sq = square(s)
    if (!standable(sq)) return move
    const [roll, step] = both(values, sq)
    if (Math.abs(roll - step) <= slack) return move
    return roll > step ? ROLL : STEP
  })
}

// The squares where two plans differ
export const changed = (from: Plan, to: Plan) => SPOTS.filter((sq) => from[state(sq)] !== to[state(sq)])

// The squares where a plan steps
export const steps = (plan: Plan) => SPOTS.filter((sq) => plan[state(sq)] === STEP)

// How many ways there are to play: a choice of two on every square
export const WAYS = 2 ** SPOTS.length

// A game, by `plan`, from square 1: each turn, the move, the die's face
// (for a roll), where it lands before any ladder or snake, and where it
// ends up
export interface Turn {
  from: number
  move: number
  face: number | null
  reached: number
  to: number
}

export function play(plan: Plan, random: () => number, most = 200): Turn[] {
  const turns: Turn[] = []
  let at = 1
  while (at !== FINISH && turns.length < most) {
    const move = plan[state(at)]
    const face = move === ROLL ? 1 + Math.floor(random() * FACES) : null
    const k = face ?? 1
    const reached = Math.min(FINISH, at + k)
    const to = landing(at, k)
    turns.push({ from: at, move, face, reached, to })
    at = to
  }
  return turns
}

// "−9.6", "0.0"; values are minus the turns to go
export const signed = (value: number, digits = 1) => {
  const text = Math.abs(value).toFixed(digits)
  return Number(text) === 0 ? (0).toFixed(digits) : `${value < 0 ? '−' : ''}${text}`
}

// "9.6 turns"
export const turns = (value: number, digits = 1) => `${Math.abs(value).toFixed(digits)} turns`
