import { argmax, gauss } from '../../components/explain/bandit'
import { seeded } from '../../components/explain/random'

// Why the best-looking of several guesses looks better than it is, and the
// fix: one set of guesses picks the best, another says what it is worth.

// ——— The story: food trucks that are all equally good ———

// Every truck is truly a 7 out of 10, and any one meal is that give or take
// about a point (the spread of the bell curve)
export const TRUE_SCORE = 7
export const MEAL_SPREAD = 1
export const TRUCKS = 8
export const STORY_SEED = 23
export const MARKETS = 1000

// One meal at each truck: what each scored
export const firstMeals = (random: () => number, trucks = TRUCKS) =>
  Array.from({ length: trucks }, () => TRUE_SCORE + MEAL_SPREAD * gauss(random))

export interface Market {
  // Two meals at each truck, kept in two notebooks
  first: number[]
  second: number[]
  // The favourite by the first notebook
  favourite: number
}

export function market(random: () => number, trucks = TRUCKS): Market {
  const first = firstMeals(random, trucks)
  const second = firstMeals(random, trucks)
  return { first, second, favourite: first.indexOf(Math.max(...first)) }
}

export const story = (): Market => market(seeded(STORY_SEED))

// Across many markets: what the favourite scored in the notebook that
// picked it (one notebook), and in the other (two notebooks)
export function markets(count: number, trucks: number, seed: number) {
  const random = seeded(seed)
  const one: number[] = []
  const two: number[] = []
  for (let i = 0; i < count; i++) {
    const m = market(random, trucks)
    one.push(m.first[m.favourite])
    two.push(m.second[m.favourite])
  }
  return { one, two }
}

export const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length

// How far the best of `n` guesses, each the truth plus noise of spread 1,
// lands above the truth on average: E[max of n standard normals], by
// numerical integration of n·x·φ(x)·Φ(x)^(n−1)
export function expectedMax(n: number): number {
  const phi = (x: number) => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI)
  const dx = 0.001
  let sum = 0
  let cdf = 0
  // Φ by the same running sum, from far enough down that it starts at ~0
  for (let x = -8; x <= 8; x += dx) {
    cdf += phi(x) * dx
    sum += n * x * phi(x) * cdf ** (n - 1) * dx
  }
  return sum
}

// ——— The real thing: a detour with many stalls ———

// On the way home you reach a fork. Going home pays 0 and ends the evening.
// The detour pays 0 to reach the night market, where you pick one of
// `stalls` stalls; each snack is a little worse than going home on average
// (−0.1) but varies a lot (spread 1), and ends the evening.
export const STALL_MEAN = -0.1
export const STALL_SPREAD = 1
export const SETTINGS = { epsilon: 0.1, alpha: 0.1 }
export const EVENINGS = 300
export const RUNS = 500
export const STALLS = [1, 2, 10, 50] as const

// Actions at the fork
const HOME = 0
const DETOUR = 1

export type Learner = 'q' | 'double'

interface Tables {
  fork: number[]
  stalls: number[]
}

const tables = (stalls: number): Tables => ({ fork: [0, 0], stalls: Array<number>(stalls).fill(0) })

const pick = (scores: number[], epsilon: number, random: () => number) =>
  random() < epsilon ? Math.floor(random() * scores.length) : argmax(scores, random)

const sum = (a: number[], b: number[]) => a.map((value, i) => value + b[i])

// One learner over `evenings` evenings: for each, whether it took the
// detour at the fork. Q-learning keeps one table and backs the detour up
// with the best stall's score. Double Q-learning keeps two, acts on their
// sum, and each evening updates one of them, chosen by a coin: that table
// picks the best stall, and the other says what it is worth.
export function evenings(learner: Learner, stalls: number, count: number, random: () => number): boolean[] {
  const { epsilon, alpha } = SETTINGS
  const a = tables(stalls)
  const b = tables(stalls)
  const took: boolean[] = []
  for (let i = 0; i < count; i++) {
    const acting = learner === 'q' ? a : { fork: sum(a.fork, b.fork), stalls: sum(a.stalls, b.stalls) }
    const choice = pick(acting.fork, epsilon, random)
    took.push(choice === DETOUR)
    // Double Q-learning: which table learns from this evening
    const [learn, judge] = learner === 'q' || random() < 0.5 ? [a, learner === 'q' ? a : b] : [b, a]
    if (choice === HOME) {
      learn.fork[HOME] += alpha * (0 - learn.fork[HOME])
      continue
    }
    // To the market: 0 now, plus what the stalls are worth from here
    const best = argmax(learn.stalls, random)
    learn.fork[DETOUR] += alpha * (0 + judge.stalls[best] - learn.fork[DETOUR])
    const stall = pick(acting.stalls, epsilon, random)
    const snack = STALL_MEAN + STALL_SPREAD * gauss(random)
    // A second coin for the stall's own update, as it is a step of its own
    const [learnStall] = learner === 'q' || random() < 0.5 ? [a] : [b]
    learnStall.stalls[stall] += alpha * (snack - learnStall.stalls[stall])
  }
  return took
}

// The share of `runs` learners that took the detour on each evening
export function detours(learner: Learner, stalls: number, runs = RUNS, count = EVENINGS, seed = 1): number[] {
  const shares = Array<number>(count).fill(0)
  for (let run = 0; run < runs; run++) {
    evenings(learner, stalls, count, seeded(seed * 100_000 + run)).forEach((took, i) => {
      if (took) shares[i] += 1 / runs
    })
  }
  return shares
}

// The fewest detours an ε-greedy learner can take: it only goes by mistake,
// half of its random picks
export const FLOOR = SETTINGS.epsilon / 2

export const percent = (share: number) => `${Math.round(share * 100)}%`

// How many of `values` fall in each bin of `width` from `low` to `high`
export function histogram(values: number[], low: number, high: number, width: number): number[] {
  const bins = Array<number>(Math.round((high - low) / width)).fill(0)
  for (const value of values) {
    const bin = Math.floor((value - low) / width)
    if (bin >= 0 && bin < bins.length) bins[bin] += 1
  }
  return bins
}
