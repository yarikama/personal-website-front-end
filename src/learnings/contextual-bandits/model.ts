import { gauss, learner, type Learner, type Method } from '../../components/explain/bandit'
import { seeded } from '../../components/explain/random'

// The story: two ways to work, and two kinds of morning. Whether a route
// gets you in on time is luck, but the odds depend on the sky.
export const ROUTES = ['Bike', 'Train'] as const
export const SKIES = ['Dry', 'Rain'] as const
// The chance each route gets you in on time: ON_TIME[sky][route]
export const ON_TIME = [
  [0.9, 0.6],
  [0.3, 0.8],
]
// The share of mornings it rains
export const RAIN = 0.5

const chance = (sky: number, rain: number) => (sky === 1 ? rain : 1 - rain)

// A route's on-time chance over every kind of morning, as someone who never
// looks at the sky sees it
export const routeAverage = (route: number, onTime = ON_TIME, rain = RAIN) =>
  onTime.reduce((sum, row, sky) => sum + chance(sky, rain) * row[route], 0)

// The best you can do never looking: the best of the routes' averages
export const blindBest = (onTime = ON_TIME, rain = RAIN) =>
  Math.max(...onTime[0].map((_, route) => routeAverage(route, onTime, rain)))

// The best you can do looking first: each sky's best route, averaged over
// the skies. Never less than blindBest: the average of the bests is at
// least the best of the averages.
export const lookingBest = (onTime = ON_TIME, rain = RAIN) =>
  onTime.reduce((sum, row, sky) => sum + chance(sky, rain) * Math.max(...row), 0)

export interface Morning {
  sky: number
  route: number
  onTime: boolean
}

export interface Commute {
  // Whether you looked at the sky, and so kept a table of scores per sky
  look: boolean
  mornings: Morning[]
}

// Picking a route now and then at random, to keep checking the other one
export const EPSILON = 0.1

// Mornings of commuting. Never looking, you keep one table: a score per
// route, the share of its mornings on time. Looking, you keep a table per
// sky, and pick from the one for today's sky. Each table first tries every
// route once, then picks its best, except one morning in 10 at random.
export function commute(random: () => number, mornings: number, look: boolean): Commute {
  const tables: Learner[] = SKIES.slice(0, look ? 2 : 1).map(() =>
    learner({ kind: 'greedy', epsilon: EPSILON }, ROUTES.length, random)
  )
  const tried = tables.map(() => ROUTES.map(() => false))
  const record: Morning[] = []
  for (let t = 0; t < mornings; t++) {
    const sky = random() < RAIN ? 1 : 0
    const table = look ? sky : 0
    const untried = tried[table].indexOf(false)
    const route = untried !== -1 ? untried : tables[table].choose(t + 1)
    tried[table][route] = true
    const onTime = random() < ON_TIME[sky][route]
    tables[table].learn(route, onTime ? 1 : 0)
    record.push({ sky, route, onTime })
  }
  return { look, mornings: record }
}

export interface Score {
  // On time, and rides, on this route in this table
  onTime: number
  rides: number
}

// The tables after the first `count` mornings: tables[table][route]. One
// table never looking, one per sky looking.
export function tables({ look, mornings }: Commute, count: number): Score[][] {
  const result = SKIES.slice(0, look ? 2 : 1).map(() => ROUTES.map(() => ({ onTime: 0, rides: 0 })))
  for (const morning of mornings.slice(0, count)) {
    const score = result[look ? morning.sky : 0][morning.route]
    score.rides += 1
    if (morning.onTime) score.onTime += 1
  }
  return result
}

// A table's favourite route once every route has been ridden, or null
export function favourite(table: Score[]): number | null {
  if (table.some((score) => score.rides === 0)) return null
  const shares = table.map((score) => score.onTime / score.rides)
  return shares.indexOf(Math.max(...shares))
}

// Mornings on time among the first `count`
export const onTimeCount = ({ mornings }: Commute, count = mornings.length) =>
  mornings.slice(0, count).filter((morning) => morning.onTime).length

// The story: some mornings never looking, then as many looking first
export const STORY_MORNINGS = 60
// Seeds picked so the runs land on the arithmetic, with the bike ridden
// often enough to have a real score: never looking, the train wins and 42
// mornings of 60 are on time (70%); looking first, the rule comes out as
// dry → bike, rain → train, and 51 of 60 are (85%)
export const STORY_SEED = { blind: 29, look: 3 }

export const story = () => ({
  blind: commute(seeded(STORY_SEED.blind), STORY_MORNINGS, false),
  look: commute(seeded(STORY_SEED.look), STORY_MORNINGS, true),
})

// The real system: several slot machines with ARMS arms each, and every
// step one of them, picked at random, is the one you face. A sign on the
// front (a shape) says which. One learner keeps a single table of scores and
// ignores the sign; the other keeps a table per sign.
export const ARMS = 10
export const STEPS = 1000
export const RUNS = 400
export const SIGNS = [1, 2, 4, 8] as const

// One table, ignoring the sign: a constant step, so it tracks a world that
// seems to keep changing, which is the best a single table can try
export const ONE_TABLE: Method = { kind: 'greedy', epsilon: EPSILON, step: 0.1 }
// A table per sign: plain averages, as on one machine that never changes
export const PER_SIGN: Method = { kind: 'greedy', epsilon: EPSILON }

export interface Signs {
  // For each step, averaged over the runs: the share that pulled the best
  // arm of the machine faced at that step, and the reward
  best: number[]
  reward: number[]
}

// The machines' arm values for one run: means[sign][arm]
export const machinesOf = (random: () => number, signs: number, arms = ARMS) =>
  Array.from({ length: signs }, () => Array.from({ length: arms }, () => gauss(random)))

// Many runs of `signs` machines, each run new machines. The machines, which
// one comes up and what it pays come from `seed`, the learner's luck from
// another, so the two learners face exactly the same steps.
export function signs(
  count: number,
  perSign: boolean,
  { runs = RUNS, steps = STEPS, arms = ARMS, seed = 1 } = {}
): Signs {
  const world = seeded(seed)
  const luck = seeded(seed + 1)
  const best = Array.from({ length: steps }, () => 0)
  const reward = Array.from({ length: steps }, () => 0)
  for (let r = 0; r < runs; r++) {
    const means = machinesOf(world, count, arms)
    const tops = means.map((row) => row.indexOf(Math.max(...row)))
    const agents = Array.from({ length: perSign ? count : 1 }, () =>
      learner(perSign ? PER_SIGN : ONE_TABLE, arms, luck)
    )
    for (let t = 0; t < steps; t++) {
      const sign = Math.floor(world() * count)
      const arm = agents[perSign ? sign : 0].choose(t + 1)
      const paid = means[sign][arm] + gauss(world)
      agents[perSign ? sign : 0].learn(arm, paid)
      reward[t] += paid
      if (arm === tops[sign]) best[t] += 1
    }
  }
  return { best: best.map((sum) => sum / runs), reward: reward.map((sum) => sum / runs) }
}

// The runs the page shows, for each number of signs, worked out once
const worked = new Map<string, Signs>()
export function signsFor(count: number, perSign: boolean): Signs {
  const key = `${count}:${perSign}`
  let result = worked.get(key)
  if (!result) {
    result = signs(count, perSign)
    worked.set(key, result)
  }
  return result
}

// The machines the figure draws, and the order their signs come up in
export const SHOWN_SEED = 5
export function shown(count: number, length = 24) {
  const random = seeded(SHOWN_SEED)
  const means = machinesOf(random, count)
  const order = Array.from({ length }, () => Math.floor(random() * count))
  return { means, order, tops: means.map((row) => row.indexOf(Math.max(...row))) }
}

// The mean of `values` from `from` to the end
export const meanOf = (values: number[], from = 0) =>
  values.slice(from).reduce((sum, value) => sum + value, 0) / (values.length - from)

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
