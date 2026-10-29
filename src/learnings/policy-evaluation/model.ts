import { seeded } from '../../components/explain/random'
import { ALWAYS_ROLL, landing, play, ROLL, solve, SPOTS, state, sweeps, type Order, type Pass } from '../../components/explain/ladders'

// Policy evaluation on the board: you always roll, as everyone does, and
// want each square's turns to the finish. Every square's value is −1 plus
// the average of where the die lands, so sweeping that over every square,
// again and again, homes in on the answer; stop once the biggest change in
// a sweep is under θ.

export { ALWAYS_ROLL }

// The answer the sweeps home in on: v_π for always rolling
export const truth = () => solve(ALWAYS_ROLL)

// ——— The story ———

// A game from square 1 that climbs a ladder and meets a snake
export const STORY_SEED = 9
export const story = () => play(ALWAYS_ROLL, seeded(STORY_SEED))

// The square whose equation the story writes out, and its landings
export const FOCUS = 12

export const THETA = 0.01
// The story's sweeps: two copies, from all zeros, until the biggest change
// is under θ
export const PASSES = sweeps(ALWAYS_ROLL, THETA)

// The six faces from FOCUS, as squares (a snake carries 14 to 5)
export const faces = (sq = FOCUS) => [1, 2, 3, 4, 5, 6].map((k) => landing(sq, k))

// ——— Sweeping, every way ———

export const THETAS = [0.1, 0.01, 0.001] as const
export const ORDERS: readonly Order[] = ['copies', 'up', 'down']
export const ORDER_NAMES: Record<Order, string> = { copies: 'Two copies', up: 'In place, up', down: 'In place, down' }

export interface Evaluation {
  passes: Pass[]
  // Sweeps it took, and how far the values it stopped on are from the
  // truth, on the square furthest off
  sweeps: number
  error: number
}

const runs = new Map<string, Evaluation>()
export function evaluation(theta: number, order: Order): Evaluation {
  const key = `${theta} ${order}`
  let result = runs.get(key)
  if (!result) {
    const passes = sweeps(ALWAYS_ROLL, theta, order)
    const exact = truth()
    const values = passes.at(-1)!.values
    const error = Math.max(...SPOTS.map((sq) => Math.abs(values[state(sq)] - exact[state(sq)])))
    result = { passes, sweeps: passes.length - 1, error }
    runs.set(key, result)
  }
  return result
}

// How much the biggest change shrinks from one sweep to the next, once it
// has settled into a steady pace
export function shrink(passes: Pass[]) {
  const deltas = passes.slice(1).map((pass) => pass.delta)
  const end = deltas.length - 1
  return deltas[end] / deltas[end - 1]
}

// How many squares and moves a sweep looks at: each square you can stand
// on, the move the plan takes, and each square that move can land on
export const landingsPerSweep = (plan = ALWAYS_ROLL) =>
  SPOTS.reduce((sum, sq) => sum + (plan[state(sq)] === ROLL ? 6 : 1), 0)
