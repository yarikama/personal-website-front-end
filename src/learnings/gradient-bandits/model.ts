import { gauss, learner, meanOf, softmax, testbed, type Run } from '../../components/explain/bandit'
import { seeded } from '../../components/explain/random'

// A learner that keeps no scores: a preference for each option ("habit
// strength"), turned into chances by softmax, and nudged after each choice
// by how the reward compares with the usual reward, the baseline.

// One step of the rule, worked by hand: the chosen option's preference moves
// by α(R − R̄)(1 − π), every other one's by −α(R − R̄)π. The shared testbed's
// learner does the same; this one is here to test against and to show the
// numbers the clips work.
export function nudge(preferences: number[], chosen: number, surprise: number, alpha: number): number[] {
  const chances = softmax(preferences)
  return preferences.map((h, a) => h + alpha * surprise * ((a === chosen ? 1 : 0) - chances[a]))
}

// Preferences back from chances. Every step adds as much to the chosen one
// as it takes from the others, so preferences that start at 0 always sum to
// 0, and that fixes the amount softmax forgets.
export function preferencesOf(chances: number[]): number[] {
  // (A chance too small for a double still has a preference, far below)
  const logs = chances.map((chance) => Math.log(Math.max(chance, 1e-300)))
  const mean = logs.reduce((sum, value) => sum + value, 0) / logs.length
  return logs.map((value) => value - mean)
}

// The story: three ways to work, and how many minutes early each one gets
// you in on a usual morning, give or take TRAFFIC
export const ROUTES = ['Highway', 'River road', 'Back streets'] as const
export const ROUTE_EARLY = [11, 14, 9]
export const TRAFFIC = 3
export const RIVER = 1
// How far one surprise moves a habit
export const STORY_ALPHA = 0.1
export const STORY_MORNINGS = 60

export interface Morning {
  route: number
  // Minutes early, whole minutes
  early: number
  // The usual, counting this morning, and how this morning compares with it
  // (0 with no baseline: every early minute counts as a win)
  usual: number
  surprise: number
  // Habits and chances once this morning is learned from
  habits: number[]
  chances: number[]
}

export interface Commute {
  mornings: Morning[]
}

// Someone new to the area, learning a habit for each route. `script` fixes
// the first mornings (route and minutes early), for a story told with fixed
// numbers; the rest follow the habits, with traffic from `random`.
export function commute(
  random: () => number,
  mornings: number,
  baseline: boolean,
  script: { route: number; early: number }[] = [],
  alpha = STORY_ALPHA
): Commute {
  const agent = learner({ kind: 'gradient', alpha, baseline }, ROUTES.length, random)
  const record: Morning[] = []
  let usual = 0
  for (let day = 0; day < mornings; day++) {
    const scripted = script[day]
    const route = scripted ? scripted.route : agent.choose(day + 1)
    const early = scripted
      ? scripted.early
      : Math.max(0, Math.round(ROUTE_EARLY[route] + TRAFFIC * gauss(random)))
    usual += (early - usual) / (day + 1)
    agent.learn(route, early)
    const chances = [...agent.scores()]
    record.push({
      route,
      early,
      usual,
      surprise: baseline ? early - usual : early,
      habits: preferencesOf(chances),
      chances,
    })
  }
  return { mornings: record }
}

// The story's first three mornings: the highway is the first and so the
// usual, the back streets come in under it, the river road well over it
export const SCRIPT = [
  { route: 0, early: 11 },
  { route: 2, early: 7 },
  { route: 1, early: 16 },
]

// Seeds picked so that you settle on the river road, as nearly everyone
// with a baseline does, and your neighbour, without one, locks onto the
// highway, as about three neighbours in ten do (settledOnRiver)
export const STORY_SEED = { you: 9, neighbour: 23 }

export const story = () => ({
  you: commute(seeded(STORY_SEED.you), STORY_MORNINGS, true, SCRIPT),
  neighbour: commute(seeded(STORY_SEED.neighbour), STORY_MORNINGS, false, SCRIPT),
})

// Share of the mornings from `from` on spent on `route`
export const shareOn = (run: Commute, route: number, from = 0) =>
  run.mornings.slice(from).filter((morning) => morning.route === route).length / (run.mornings.length - from)

// Many commuters with the story's first three mornings, each run to the
// end, to say what the story's two would usually end up doing: the share whose likeliest route at the end is the
// river road
export function settledOnRiver(baseline: boolean, people: number, seed: number): number {
  const random = seeded(seed)
  let found = 0
  for (let p = 0; p < people; p++) {
    const run = commute(random, STORY_MORNINGS, baseline, SCRIPT)
    const last = run.mornings.at(-1)!.chances
    if (last.indexOf(Math.max(...last)) === RIVER) found += 1
  }
  return found / people
}

// The real thing, one machine: ten arms paying about 4 each, a learner's
// chances after every pull. The arms' means and the payouts come from one
// seed, the learner's picks from another, like the testbed.
export const ARMS = 10
export const CENTRE = 4
export const PULLS = 1000

// The machine the page shows: a clear best arm, found with the baseline and
// missed without it, at either step
export const MACHINE_SEED = 21

export interface Machine {
  means: number[]
  best: number
  // The arm pulled at each step, and the chances after it
  arms: number[]
  chances: number[][]
}

export function machine(seed: number, alpha: number, baseline: boolean): Machine {
  const world = seeded(seed)
  const luck = seeded(seed + 1)
  const means = Array.from({ length: ARMS }, () => CENTRE + gauss(world))
  const best = means.indexOf(Math.max(...means))
  const agent = learner({ kind: 'gradient', alpha, baseline }, ARMS, luck)
  const arms: number[] = []
  const chances: number[][] = []
  for (let t = 0; t < PULLS; t++) {
    const arm = agent.choose(t + 1)
    agent.learn(arm, means[arm] + gauss(world))
    arms.push(arm)
    chances.push([...agent.scores()])
  }
  return { means, best, arms, chances }
}

// The testbed the page shows: ten arms whose means sit around 4, so every
// reward is positive. Fewer machines than the book's 2000, to stay quick in
// the page; worked out once for each setting, on the same machines.
export const MACHINES = 300
const worked = new Map<string, Run>()
export function shifted(alpha: number, baseline: boolean): Run {
  const key = `${alpha} ${baseline}`
  let run = worked.get(key)
  if (!run) {
    run = testbed({ kind: 'gradient', alpha, baseline }, { machines: MACHINES, steps: PULLS, centre: CENTRE, seed: 1 })
    worked.set(key, run)
  }
  return run
}

// The share on the best arm over the last 100 pulls
export const lateBest = (run: Run) => meanOf(run.best, PULLS - 100)

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
