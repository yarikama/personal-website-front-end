import {
  ALWAYS_ROLL,
  both,
  changed,
  greedy,
  SPOTS,
  state,
  STEP,
  sweeps,
  type Pass,
  type Plan,
} from '../../components/explain/ladders'
import { generalized, ROUNDS, type Judge, type Round } from '../../components/explain/planning'

// Value iteration on the board: no policy to judge. Each sweep gives every
// square −1 plus the better of its two moves, which is one sweep of judging
// and an improvement in one; once the biggest change is under θ, read the
// better move off every square.

export const THETA = 0.001

export const PASSES: Pass[] = sweeps('best', THETA)

// The move each sweep's values would pick on every square (rolling where
// the two are tied, as at the start)
export const PLANS: Plan[] = PASSES.map((pass) => greedy(pass.values, ALWAYS_ROLL))

export const FINAL = PLANS.at(-1)!

// The first sweep from which no square's move changes again
export function settledAt(plans: Plan[] = PLANS): number {
  let at = plans.length - 1
  while (at > 0 && changed(plans[at - 1], plans[at]).length === 0) at -= 1
  return at
}

// The squares whose move a sweep changed, and how many squares are still
// on a move they will leave
export const switchedAt = (sweep: number) => (sweep === 0 ? [] : changed(PLANS[sweep - 1], PLANS[sweep]))
export const wrongAt = (sweep: number) => changed(PLANS[sweep], FINAL).length

// Both moves' worth from a square, by a sweep's values: [roll, step]
export const options = (sweep: number, sq: number) => both(PASSES[sweep].values, sq)

// ——— What each method costs ———

// A move's landings: six faces for a roll, one square for a step
const landingsOf = (move: number) => (move === STEP ? 1 : 6)

// Looking at every move from every square: what a value-iteration sweep,
// or an improvement, costs
export const EVERY_MOVE = SPOTS.length * (landingsOf(0) + landingsOf(STEP))

// A sweep of judging looks only at the plan's move on each square
export const judgingCost = (plan: Plan) => SPOTS.reduce((sum, sq) => sum + landingsOf(plan[state(sq)]), 0)

export interface Cost {
  sweeps: number
  improvements: number
  landings: number
}

export const valueIterationCost = (): Cost => ({
  sweeps: PASSES.length - 1,
  improvements: 0,
  landings: (PASSES.length - 1) * EVERY_MOVE,
})

export const policyIterationCost = (rounds: Round[] = ROUNDS()): Cost => ({
  sweeps: rounds.reduce((sum, round) => sum + round.passes.length - 1, 0),
  improvements: rounds.length,
  landings: rounds.reduce((sum, round) => sum + (round.passes.length - 1) * judgingCost(round.plan) + EVERY_MOVE, 0),
})

// Judging a few sweeps between improvements: each sweep costs its plan's
// judging, each improvement every move
export function generalizedCost(judge: Judge): Cost {
  const { points, sweeps } = generalized(judge)
  const judged = points.slice(1)
  const improvements = judged.filter((point) => point.improved).length
  return {
    sweeps,
    improvements,
    landings: judged.reduce((sum, point) => sum + judgingCost(point.plan), 0) + improvements * EVERY_MOVE,
  }
}
