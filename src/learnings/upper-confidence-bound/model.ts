import { gauss, learner, meanOf, testbed, type Run } from '../../components/explain/bandit'
import { seeded } from '../../components/explain/random'

// Upper-confidence-bound picking: each option's score (the average of what
// it has paid) plus a bonus for how unsure that score still is. The pick is
// the option whose score plus bonus is highest.

// The doubt bonus, c·√(ln t / N): `t` is the step about to be taken (from 1)
// and `n` how often this option has been tried. An untried option's doubt
// has no limit, so it goes first.
export const bonus = (c: number, t: number, n: number) => (n === 0 ? Infinity : c * Math.sqrt(Math.log(t) / n))

// What the rule ranks options by: how good it looks plus how unsure you are
export const upperBound = (score: number, c: number, t: number, n: number) => score + bonus(c, t, n)

// ——— The story: a year of lunches near a new office ———

export const SPOTS = ['Ramen', 'Salads', 'Tacos', 'Dumplings'] as const
// Each spot's usual standard out of 10, which you can't see
export const SPOT_MEANS = [6.5, 5, 7.5, 6]
// How the first lunch at each went: Ramen had a good day, Tacos an off one
export const SPOT_FIRST = [7, 4.5, 6.5, 5.5]
// Any one lunch is the spot's standard give or take this much
export const LUNCH_NOISE = 1.5
// How much a doubt is worth in the story
export const STORY_C = 2
// A working year of lunches, five a week
export const STORY_LUNCHES = 250
export const STORY_SEED = 12

export interface Lunch {
  spot: number
  rating: number
}

// Lunches chosen by the rule: each spot once, in order, then wherever score
// plus doubt is highest. `first` fixes how the first lunch at each spot went.
export function lunches(random: () => number, days: number, c: number, means: number[], first: number[]): Lunch[] {
  const picker = learner({ kind: 'ucb', c }, means.length, random)
  const tried = means.map(() => 0)
  const record: Lunch[] = []
  for (let day = 1; day <= days; day++) {
    const spot = picker.choose(day)
    const rating =
      tried[spot] === 0 ? first[spot] : Math.min(10, Math.max(0, means[spot] + LUNCH_NOISE * gauss(random)))
    picker.learn(spot, rating)
    tried[spot] += 1
    record.push({ spot, rating })
  }
  return record
}

export const story = () => lunches(seeded(STORY_SEED), STORY_LUNCHES, STORY_C, SPOT_MEANS, SPOT_FIRST)

export interface Standing {
  // Each spot's score (the average of its lunches) and visits so far
  scores: number[]
  visits: number[]
  // The doubt each would carry into the next lunch, and score plus doubt
  doubts: number[]
  tops: number[]
  // Where the next lunch goes: the highest top (the first, on a tie)
  next: number
}

// Where things stand after the first `days` lunches
export function standing(record: Lunch[], days: number, c: number, spots = SPOTS.length): Standing {
  const scores = Array.from({ length: spots }, () => 0)
  const visits = Array.from({ length: spots }, () => 0)
  for (const { spot, rating } of record.slice(0, days)) {
    visits[spot] += 1
    scores[spot] += (rating - scores[spot]) / visits[spot]
  }
  const doubts = visits.map((n) => bonus(c, days + 1, n))
  const tops = scores.map((score, i) => score + doubts[i])
  return { scores, visits, doubts, tops, next: tops.indexOf(Math.max(...tops)) }
}

// The first lunch at `spot` after its first visit, from 1, or null
export function secondVisit(record: Lunch[], spot: number): number | null {
  const first = record.findIndex((lunch) => lunch.spot === spot)
  const second = record.findIndex((lunch, i) => i > first && lunch.spot === spot)
  return second === -1 ? null : second + 1
}

// The lunches (from 1) at `spot`
export const visitsTo = (record: Lunch[], spot: number) =>
  record.flatMap((lunch, i) => (lunch.spot === spot ? [i + 1] : []))

// The lunches (from 1) you went back to `spot` after a gap, leaving out a
// second lunch there the next day
export const returnsTo = (record: Lunch[], spot: number) =>
  visitsTo(record, spot).filter((day, i, days) => i > 0 && day - days[i - 1] > 1)

// ——— One machine with ten arms, played by the rule ———

export const ARMS = 10
export const PULLS = 1000
export const MACHINE_SEED = 7

export interface Pull {
  arm: number
  reward: number
  // Scores and tries after this pull
  scores: number[]
  tries: number[]
}

export interface Machine {
  means: number[]
  pulls: Pull[]
}

// The testbed's kind of machine: arms paying means drawn from a bell
// curve, each pull its mean plus noise of spread 1
export function machine(c: number, seed = MACHINE_SEED, pulls = PULLS): Machine {
  const world = seeded(seed)
  const luck = seeded(seed + 1)
  const means = Array.from({ length: ARMS }, () => gauss(world))
  const picker = learner({ kind: 'ucb', c }, ARMS, luck)
  const tries = means.map(() => 0)
  const record: Pull[] = []
  for (let t = 1; t <= pulls; t++) {
    const arm = picker.choose(t)
    const reward = means[arm] + gauss(world)
    picker.learn(arm, reward)
    tries[arm] += 1
    record.push({ arm, reward, scores: [...picker.scores()], tries: [...tries] })
  }
  return { means, pulls: record }
}

const machines = new Map<number, Machine>()
export function played(c: number): Machine {
  let result = machines.get(c)
  if (!result) {
    result = machine(c)
    machines.set(c, result)
  }
  return result
}

// ——— The testbed: UCB against picking at random 1 time in 10 ———

export const CS = [0.5, 1, 2, 4] as const
export const MACHINES = 500
export const EPSILON = 0.1

const runs = new Map<string, Run>()
function cached(key: string, run: () => Run): Run {
  let result = runs.get(key)
  if (!result) {
    result = run()
    runs.set(key, result)
  }
  return result
}

// The same 500 machines for every method
export const ucbRun = (c: number) => cached(`ucb ${c}`, () => testbed({ kind: 'ucb', c }, { machines: MACHINES }))
export const randomRun = () =>
  cached('greedy', () => testbed({ kind: 'greedy', epsilon: EPSILON }, { machines: MACHINES }))

export { meanOf }

// Each value averaged with its neighbours, `window` wide
export function smooth(values: number[], window: number): number[] {
  const half = Math.floor(window / 2)
  return values.map((_, i) => {
    const near = values.slice(Math.max(0, i - half), i + half + 1)
    return near.reduce((sum, value) => sum + value, 0) / near.length
  })
}

// "62%"
export const percent = (share: number) => `${Math.round(share * 100)}%`
