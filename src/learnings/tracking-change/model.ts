import { gauss, learner, meanOf, testbed, type Run } from '../../components/explain/bandit'
import { seeded } from '../../components/explain/random'

// The story's café, scored out of 10. Under the old chef a visit is usually
// about BEFORE; then a new chef takes over and it is usually about AFTER.
// Any one visit is that, give or take NOISE.
export const BEFORE = 8
export const AFTER = 4
export const NOISE = 1
// Visits under each chef
export const OLD_VISITS = 20
export const NEW_VISITS = 26
// A score above this still says "good"
export const GOOD = 6
// The friend moves her score this fraction of the way toward each visit
export const FRIEND_STEP = 0.2

// One visit's rating, out of 10, to one decimal
export const visit = (random: () => number, usual: number) =>
  Math.round(Math.min(10, Math.max(0, usual + NOISE * gauss(random))) * 10) / 10

// The story's visits: OLD_VISITS under the old chef, then NEW_VISITS under the new
export function visits(seed: number): number[] {
  const random = seeded(seed)
  return Array.from({ length: OLD_VISITS + NEW_VISITS }, (_, i) => visit(random, i < OLD_VISITS ? BEFORE : AFTER))
}

// The score after each visit, kept by the bandit pages' learner on a
// single arm: 'average' keeps the plain average (step 1/n); a number is a
// constant step. The first visit sets the score either way: a constant
// step starts from it, so moving toward it changes nothing.
export function scores(ratings: number[], step: 'average' | number): number[] {
  const keeper = learner({ kind: 'greedy', step, initial: ratings[0] }, 1, seeded(0))
  return ratings.map((rating) => {
    keeper.learn(0, rating)
    return keeper.scores()[0]
  })
}

// The visit (from 1, counted from the new chef's first) after which a
// score is first down to GOOD, or null if it never is
export function fallsAfter(score: number[]): number | null {
  const i = score.findIndex((value, visit) => visit >= OLD_VISITS && value <= GOOD)
  return i === -1 ? null : i - OLD_VISITS + 1
}

// How much a score wobbles while the café stays the same: the spread of
// its scores from the fifth visit to the last under the old chef
export function wobble(score: number[]): number {
  const settled = score.slice(4, OLD_VISITS)
  const mean = meanOf(settled)
  return Math.sqrt(meanOf(settled.map((value) => (value - mean) ** 2)))
}

// The story's seed, chosen so its numbers land where the arithmetic does:
// a plain average of 20 eights needs 20 fours to come down to 6, and a
// fifth-step score needs 4 (0.8⁴ < ½ < 0.8³)
export const STORY_SEED = 9

export function story() {
  const ratings = visits(STORY_SEED)
  const yours = scores(ratings, 'average')
  const hers = scores(ratings, FRIEND_STEP)
  return { ratings, yours, hers, yourFall: fallsAfter(yours), herFall: fallsAfter(hers) }
}

// The Predict's arithmetic, without noise: after `good` visits at BEFORE,
// the visits at AFTER a plain average needs to come down to GOOD
export function plainVisitsToFall(good: number): number {
  let total = good * BEFORE
  let count = good
  let bad = 0
  while (total / count > GOOD) {
    total += AFTER
    count += 1
    bad += 1
  }
  return bad
}

// The same for a constant step α, starting from BEFORE
export function steadyVisitsToFall(alpha: number): number {
  let score = BEFORE
  let bad = 0
  while (score > GOOD) {
    score += alpha * (AFTER - score)
    bad += 1
  }
  return bad
}

// The visits the weights figure brings in
export const VISITS = 20

// What each past reward weighs in a score after `n` of them, oldest first,
// and what the starting guess still weighs. A constant step α gives the
// reward i back from the newest α(1 − α)^i, and the start (1 − α)^n; the
// plain average gives each 1/n and the start nothing (all of it before the
// first reward).
export function weights(step: 'average' | number, n: number): { rewards: number[]; start: number } {
  if (step === 'average') return { rewards: Array.from({ length: n }, () => 1 / n), start: n === 0 ? 1 : 0 }
  return {
    rewards: Array.from({ length: n }, (_, i) => step * (1 - step) ** (n - 1 - i)),
    start: (1 - step) ** n,
  }
}

// The changing testbed: ten arms whose means start equal and wander, every
// step, by a bell curve DRIFT wide. Fewer machines than the book's 2000, so
// the page works it out in a blink.
export const DRIFT = 0.01
export const MACHINES = 100
export const STEPS = 2500
export const EPSILON = 0.1

export type World = 'still' | 'drifting'
export type Step = 'average' | number
// The settings the page offers
export const WORLDS: readonly World[] = ['drifting', 'still']
export const STEP_SIZES = [0.02, 0.1, 0.5] as const

// A run on the testbed, worked out once per setting: the same machines for
// every step size
const worked = new Map<string, Run>()
export function run(world: World, step: Step, machines = MACHINES): Run {
  const key = `${world} ${step} ${machines}`
  let result = worked.get(key)
  if (!result) {
    result = testbed(
      { kind: 'greedy', epsilon: EPSILON, step },
      { machines, steps: STEPS, drift: world === 'drifting' ? DRIFT : 0, seed: 7 }
    )
    worked.set(key, result)
  }
  return result
}

// A run if it has been worked out already, so a figure can draw at once
// and work the rest out after
export const ready = (world: World, step: Step): Run | undefined => worked.get(`${world} ${step} ${MACHINES}`)

// Every `every` values averaged into one, so a chart of shares shows the
// trend and has few points to draw
export function bins(values: number[], every: number): number[] {
  return Array.from({ length: Math.ceil(values.length / every) }, (_, i) => meanOf(values.slice(i * every, (i + 1) * every)))
}

// "62%"; below 1%, one decimal
export const percent = (share: number) =>
  share > 0 && share < 0.01 ? `${(share * 100).toFixed(1)}%` : `${Math.round(share * 100)}%`
