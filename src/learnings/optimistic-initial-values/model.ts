import { gauss, learner, testbed, type Method, type Run } from '../../components/explain/bandit'
import { seeded } from '../../components/explain/random'

// The story: a new ice-cream shop with six flavours. Each flavour has a
// usual standard, out of 10, but any one scoop is that give or take a
// little. You start out believing every flavour is a perfect 10, always
// order the one you rate highest (the leftmost on a tie), and after each
// scoop move your rating a fixed share of the way toward how it tasted.
export const FLAVOURS = ['Vanilla', 'Chocolate', 'Lemon', 'Mango', 'Pistachio', 'Mint'] as const
export const USUALLY = [6, 7, 5, 6.5, 8, 4.5]
export const BEST_FLAVOUR = 4
// What you believe of a flavour before you've tasted it
export const HOPE = 10
// How far one scoop moves a rating toward how it tasted
export const SHARE = 0.5
// How much one scoop differs from the flavour's usual, as a bell curve's spread
export const SCOOP_NOISE = 0.5
export const VISITS = 40

// One scoop of a flavour that is usually `usually`, out of 10
export const scoop = (random: () => number, usually: number) =>
  Math.min(10, Math.max(0, usually + SCOOP_NOISE * gauss(random)))

// A rating after one more scoop: a share of the way toward how it tasted
export const nudge = (rating: number, taste: number, share: number) => rating + share * (taste - rating)

// The highest rating; the first one on a tie
export const top = (ratings: number[]) => ratings.reduce((best, r, i) => (r > ratings[best] ? i : best), 0)

export interface Visit {
  flavour: number
  taste: number
  // The flavour's rating before this scoop and after it
  before: number
  after: number
}

// Every visit to the shop. The first scoop of each flavour tastes exactly
// its usual standard, so the story can tell its first round in round
// numbers; after that, each scoop is the usual give or take SCOOP_NOISE.
export function shop(seed: number, visits = VISITS): Visit[] {
  const random = seeded(seed)
  const ratings = FLAVOURS.map(() => HOPE)
  const tasted = FLAVOURS.map(() => false)
  const record: Visit[] = []
  for (let v = 0; v < visits; v++) {
    const flavour = top(ratings)
    const taste = tasted[flavour] ? scoop(random, USUALLY[flavour]) : USUALLY[flavour]
    tasted[flavour] = true
    const before = ratings[flavour]
    ratings[flavour] = nudge(before, taste, SHARE)
    record.push({ flavour, taste, before, after: ratings[flavour] })
  }
  return record
}

// Each flavour's rating after the first `count` visits
export function ratingsAfter(visits: Visit[], count: number): number[] {
  const ratings = FLAVOURS.map(() => HOPE)
  for (const visit of visits.slice(0, count)) ratings[visit.flavour] = visit.after
  return ratings
}

// How many scoops of each flavour in the first `count` visits
export function scoopsIn(visits: Visit[], count: number): number[] {
  const scoops = FLAVOURS.map(() => 0)
  for (const visit of visits.slice(0, count)) scoops[visit.flavour] += 1
  return scoops
}

// The visit (from 1) from which you order the same flavour every time
export function settledAt(visits: Visit[]): number {
  const last = visits.at(-1)!.flavour
  let from = visits.length
  while (from > 1 && visits[from - 2].flavour === last) from -= 1
  return from
}

// The story's run, from a seed chosen so that it settles on Pistachio
// within a few rounds, as most runs do
export const STORY_SEED = 2
export const story = () => shop(STORY_SEED)

// How optimism drains: with a constant step α, each reward closes the same
// share of the gap between a score and the reward, so after k rewards
// (1 − α)^k of the starting gap is left
export const leftAfter = (start: number, reward: number, step: number, tries: number) =>
  reward + (start - reward) * (1 - step) ** tries

// The real system: the 10-armed testbed, with a constant step α = 0.1 for
// both learners. The optimist never picks at random but starts every score
// at `initial`; the realist starts at 0 and picks at random 1 time in 10.
export const STEP = 0.1
export const STEPS = 1000
export const MACHINES = 500
export const STARTS = [0, 1, 5, 20] as const
export const optimist = (initial: number): Method => ({ kind: 'greedy', epsilon: 0, initial, step: STEP })
export const realist: Method = { kind: 'greedy', epsilon: 0.1, initial: 0, step: STEP }

// The testbed runs the page shows, worked out once each: the same machines
// for every setting
const worked = new Map<string, Run>()
export function machines(who: 'realist' | number): Run {
  const key = String(who)
  let result = worked.get(key)
  if (!result) {
    result = testbed(who === 'realist' ? realist : optimist(who), { machines: MACHINES, steps: STEPS })
    worked.set(key, result)
  }
  return result
}

// The shop again, with many customers, and a change: after CHANGE_AT
// visits Mint gets a new recipe and becomes the best in the shop. You
// order your top-rated flavour every time, starting from 10s; a friend
// picks at random 1 visit in 10, starting from `friendStart`. Both rate
// the way the story does.
export const CUSTOMERS = 500
export const SHOP_VISITS = 300
export const CHANGE_AT = 100
export const MINT = 5
export const NEW_MINT = 9
export const FRIEND_EPSILON = 0.1
export const FRIEND_STARTS = [0, 10] as const
export const you: Method = { kind: 'greedy', epsilon: 0, initial: HOPE, step: SHARE }
export const friend = (start: number): Method => ({ kind: 'greedy', epsilon: FRIEND_EPSILON, initial: start, step: SHARE })

// For each visit, the share of customers who ordered the best flavour (the
// best at that visit, so Mint once its recipe changes)
export function customers(method: Method, { count = CUSTOMERS, visits = SHOP_VISITS, change = CHANGE_AT, seed = 1 } = {}): number[] {
  const world = seeded(seed)
  const luck = seeded(seed + 1)
  const best = Array.from({ length: visits }, () => 0)
  for (let c = 0; c < count; c++) {
    const usually = [...USUALLY]
    const customer = learner(method, usually.length, luck)
    for (let v = 0; v < visits; v++) {
      if (v === change) usually[MINT] = NEW_MINT
      const flavour = customer.choose(v + 1)
      customer.learn(flavour, scoop(world, usually[flavour]))
      if (flavour === top(usually)) best[v] += 1
    }
  }
  return best.map((sum) => sum / count)
}

const crowds = new Map<string, number[]>()
export function crowd(who: 'you' | number): number[] {
  const key = String(who)
  let result = crowds.get(key)
  if (!result) {
    result = customers(who === 'you' ? you : friend(who))
    crowds.set(key, result)
  }
  return result
}

// The mean of `values` from `from` up to `to`
export const meanOf = (values: number[], from = 0, to = values.length) =>
  values.slice(from, to).reduce((sum, value) => sum + value, 0) / (to - from)

// Each value averaged with its neighbours, `window` wide, so a chart of
// shares shows the trend rather than the luck of the step
export function smooth(values: number[], window: number): number[] {
  const half = Math.floor(window / 2)
  return values.map((_, i) => {
    const near = values.slice(Math.max(0, i - half), i + half + 1)
    return near.reduce((sum, value) => sum + value, 0) / near.length
  })
}

// "62%"
export const percent = (share: number) => `${Math.round(share * 100)}%`
