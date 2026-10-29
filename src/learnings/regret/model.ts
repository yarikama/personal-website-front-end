import { gauss } from '../../components/explain/bandit'
import { seeded } from '../../components/explain/random'

// Regret: what a learner gave up by not knowing. Against always taking the
// best arm, every pull of a worse arm costs its gap on average, so the
// regret after T pulls is the sum, over the worse arms, of gap × pulls.
// Its slope says where behaviour is going: a straight line (linear regret)
// means a steady loss for ever; a curve that flattens (sublinear) means
// the average reward closes in on the best arm's.

// The regret of pulling each arm `pulls[a]` times, when the arms pay
// `means` on average: Σ (best − mean) × pulls
export function regret(means: number[], pulls: number[]): number {
  const best = Math.max(...means)
  return means.reduce((sum, mean, a) => sum + (best - mean) * pulls[a], 0)
}

// The average reward per pull that regret leaves: best − regret / T
export const averageReward = (best: number, regretSoFar: number, pulls: number) => best - regretSoFar / pulls

// Where ε-greedy's average reward settles once its estimates are right:
// the best arm (1 − ε) of the time, an arm at random ε of the time
export const plateau = (means: number[], epsilon: number) =>
  (1 - epsilon) * Math.max(...means) + (epsilon * means.reduce((sum, mean) => sum + mean, 0)) / means.length

// ——— The story: an ice-cream cart and three corners ———

export const CORNERS = ['Park', 'Station', 'Market'] as const
// An average day's takings at each, in dollars, which you can't see
export const TAKINGS = [300, 240, 120]
// Any one day is that give or take this much
export const SPREAD = 80
export const BEST = Math.max(...TAKINGS)
export const GAPS = TAKINGS.map((takings) => BEST - takings)
// You pick at random 1 day in 10
export const EPSILON = 0.1
// What a doubt is worth, in dollars, to your friend, who picks by upper
// confidence bound
export const DOUBT = 80
export const YEAR = 365
export const DAYS = 3 * YEAR
export const YOU_SEED = 10
export const FRIEND_SEED = 1013

export interface Day {
  corner: number
  takings: number
  // Picked at random, not as the best so far
  random: boolean
  // The regret so far, the days at each corner, and the averages so far
  regret: number
  visits: number[]
  averages: number[]
}

// A run of days with the cart: each corner once, in order, then either
// the best so far except at random with chance ε ('random'), or where the
// average plus a doubt of DOUBT·√(ln t / N) is highest ('doubt')
export function cart(how: 'random' | 'doubt', seed: number, days = DAYS): Day[] {
  const random = seeded(seed)
  const averages = CORNERS.map(() => 0)
  const visits = CORNERS.map(() => 0)
  const record: Day[] = []
  let total = 0
  for (let t = 1; t <= days; t++) {
    let corner: number
    let explored = false
    if (t <= CORNERS.length) corner = t - 1
    else if (how === 'random') {
      explored = random() < EPSILON
      corner = explored ? Math.floor(random() * CORNERS.length) : averages.indexOf(Math.max(...averages))
    } else {
      const tops = averages.map((average, a) => average + DOUBT * Math.sqrt(Math.log(t) / visits[a]))
      corner = tops.indexOf(Math.max(...tops))
    }
    const takings = Math.max(0, TAKINGS[corner] + SPREAD * gauss(random))
    visits[corner] += 1
    averages[corner] += (takings - averages[corner]) / visits[corner]
    total += GAPS[corner]
    record.push({ corner, takings, random: explored, regret: total, visits: [...visits], averages: [...averages] })
  }
  return record
}

export const story = () => ({ you: cart('random', YOU_SEED), friend: cart('doubt', FRIEND_SEED) })

// What exploring at random costs a day once the averages are right: ε of
// the days go to a random corner, whose gap is the average gap
export const randomCost = () => EPSILON * (GAPS.reduce((sum, gap) => sum + gap, 0) / GAPS.length)

// The regret added per day over a stretch of a run
export const slope = (days: Day[], from: number, to: number) =>
  (days[to - 1].regret - days[from - 1].regret) / (to - from)

// "$9,780"
export const dollars = (value: number) => `$${Math.round(value).toLocaleString('en')}`

// ——— The testbed: ten arms, many machines, four ways of exploring ———

export type Method =
  | { kind: 'greedy'; epsilon: number }
  // Explore with chance k / t at step t: always at first, ever less after
  | { kind: 'fading'; k: number }
  | { kind: 'ucb'; c: number }

export const METHODS: { name: string; method: Method }[] = [
  { name: 'Greedy', method: { kind: 'greedy', epsilon: 0 } },
  { name: 'ε = 0.1', method: { kind: 'greedy', epsilon: 0.1 } },
  { name: 'ε = 10/t', method: { kind: 'fading', k: 10 } },
  { name: 'UCB', method: { kind: 'ucb', c: 1 } },
]

export const STARTS = [0, -5] as const
export type Start = (typeof STARTS)[number]

export const ARMS = 10
export const MACHINES = 200
export const STEPS = 2000

export interface Run {
  // Regret summed to each step, averaged over the machines
  regret: number[]
  // The best arm's mean, averaged over the machines, and the average arm's
  best: number
  mean: number
}

// The arm with the highest value; a tie goes to one of them at random
function argmax(values: number[], random: () => number): number {
  let top = 0
  let ties = 1
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[top]) {
      top = i
      ties = 1
    } else if (values[i] === values[top] && random() * ++ties < 1) top = i
  }
  return top
}

// A method on the testbed, every estimate starting at `start`: machines
// whose arms pay means drawn from a bell curve, plus noise of spread 1. The
// machines come from one seed, the method's luck from another, so methods
// compare like for like.
export function testbed(method: Method, start: Start, machines = MACHINES, steps = STEPS, seed = 1): Run {
  const world = seeded(seed)
  const luck = seeded(seed + 1)
  const regretAt = Array.from({ length: steps }, () => 0)
  let best = 0
  let mean = 0
  for (let m = 0; m < machines; m++) {
    const means = Array.from({ length: ARMS }, () => gauss(world))
    const top = Math.max(...means)
    best += top / machines
    mean += means.reduce((sum, value) => sum + value, 0) / ARMS / machines
    const estimates = means.map(() => start as number)
    const pulls = means.map(() => 0)
    let lost = 0
    for (let t = 1; t <= steps; t++) {
      let arm: number
      if (method.kind === 'ucb') {
        const untried = pulls.indexOf(0)
        arm =
          untried !== -1
            ? untried
            : argmax(
                estimates.map((q, a) => q + method.c * Math.sqrt(Math.log(t) / pulls[a])),
                luck,
              )
      } else {
        const epsilon = method.kind === 'fading' ? Math.min(1, method.k / t) : method.epsilon
        arm = luck() < epsilon ? Math.floor(luck() * ARMS) : argmax(estimates, luck)
      }
      const reward = means[arm] + gauss(world)
      pulls[arm] += 1
      estimates[arm] += (reward - estimates[arm]) / pulls[arm]
      lost += top - means[arm]
      regretAt[t - 1] += lost / machines
    }
  }
  return { regret: regretAt, best, mean }
}

const runs = new Map<string, Run>()
export function played(index: number, start: Start): Run {
  const key = `${index} ${start}`
  let run = runs.get(key)
  if (!run) {
    run = testbed(METHODS[index].method, start)
    runs.set(key, run)
  }
  return run
}
