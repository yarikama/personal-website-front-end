import { seeded } from '../../components/explain/random'

// A friend's notes on her trips to work: bus or bike to the station, then
// whichever train comes, the fast one or the slow one. Replaying the same
// notes until the numbers settle, Monte Carlo and TD(0) give different
// answers: the average of what followed each place, or the answer of the
// model the notes suggest.

// The places, as states. The office is the end.
export const BUS = 0
export const BIKE = 1
export const STATION = 2
export const FAST = 3
export const SLOW = 4
export const PLACES = ['Bus', 'Bike', 'Station', 'Fast train', 'Slow train'] as const
export const COUNT = PLACES.length

// One move: from a state, its reward (here the minutes it took), and the
// state it led to (null: the end)
export interface Move {
  from: number
  reward: number
  to: number | null
}
export type Episode = Move[]

// One trip as noted: how she got to the station, how long that took, which
// train came, and how long it took
export interface Trip {
  by: typeof BUS | typeof BIKE
  leg: number
  train: typeof FAST | typeof SLOW
  ride: number
}

export const tripMoves = ({ by, leg, train, ride }: Trip): Episode => [
  { from: by, reward: leg, to: STATION },
  { from: STATION, reward: 0, to: train },
  { from: train, reward: ride, to: null },
]

export const total = (trip: Trip) => trip.leg + trip.ride

// What one episode teaches Monte Carlo: each state it visited, and all the
// reward from there to the end (the return)
export function returns(episode: Episode): { state: number; left: number }[] {
  const out: { state: number; left: number }[] = []
  let left = 0
  for (let i = episode.length - 1; i >= 0; i--) {
    left += episode[i].reward
    out.unshift({ state: episode[i].from, left })
  }
  return out
}

// Batch Monte Carlo's answer, worked out directly: each state's average
// return in the notes (null for a state the notes never visit). Of all
// numbers, the average has the least squared error against those returns.
export function averageReturns(episodes: Episode[], count: number): (number | null)[] {
  const sum = Array<number>(count).fill(0)
  const visits = Array<number>(count).fill(0)
  for (const episode of episodes) {
    for (const { state, left } of returns(episode)) {
      sum[state] += left
      visits[state] += 1
    }
  }
  return sum.map((s, state) => (visits[state] ? s / visits[state] : null))
}

// The model the notes suggest: from each state, how often it led to each
// other state (and to the end), and the average reward of a move from it
export interface Model {
  visits: number[]
  // next[s][t]: the share of moves from s that led to t
  next: number[][]
  // The share of moves from s that ended the episode
  ends: number[]
  // The average reward of a move from s: here, its minutes
  reward: number[]
}

export function estimateModel(episodes: Episode[], count: number): Model {
  const visits = Array<number>(count).fill(0)
  const moves = Array.from({ length: count }, () => Array<number>(count).fill(0))
  const ends = Array<number>(count).fill(0)
  const reward = Array<number>(count).fill(0)
  for (const episode of episodes) {
    for (const { from, reward: r, to } of episode) {
      visits[from] += 1
      reward[from] += r
      if (to === null) ends[from] += 1
      else moves[from][to] += 1
    }
  }
  const share = (n: number, s: number) => (visits[s] ? n / visits[s] : 0)
  return {
    visits,
    next: moves.map((row, s) => row.map((n) => share(n, s))),
    ends: ends.map(share),
    reward: reward.map(share),
  }
}

// The model's values, solved exactly: V = reward + next × V, by Gaussian
// elimination. That takes the whole n × n table and about n³ steps. A state
// the notes never visit keeps `unseen`.
export function solveModel(model: Model, unseen = 0): number[] {
  const n = model.visits.length
  // Rows of (I − next) | reward; an unvisited state is fixed at `unseen`
  const rows = model.next.map((row, s) =>
    model.visits[s]
      ? [...row.map((p, t) => (t === s ? 1 : 0) - p), model.reward[s]]
      : [...row.map((_, t) => (t === s ? 1 : 0)), unseen]
  )
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) if (Math.abs(rows[r][col]) > Math.abs(rows[pivot][col])) pivot = r
    ;[rows[col], rows[pivot]] = [rows[pivot], rows[col]]
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const factor = rows[r][col] / rows[col][col]
      for (let c = col; c <= n; c++) rows[r][c] -= factor * rows[col][c]
    }
  }
  return rows.map((row, s) => row[n] / row[s])
}

export type Method = 'td' | 'mc'

// One pass of batch updating: every move's nudge worked out with the values
// held still, all added up, then applied at once
export function batchPass(values: number[], episodes: Episode[], method: Method, step: number): number[] {
  const change = Array<number>(values.length).fill(0)
  for (const episode of episodes) {
    if (method === 'mc') {
      for (const { state, left } of returns(episode)) change[state] += step * (left - values[state])
    } else {
      for (const { from, reward, to } of episode) {
        const target = reward + (to === null ? 0 : values[to])
        change[from] += step * (target - values[from])
      }
    }
  }
  return values.map((value, state) => value + change[state])
}

// Pass after pass until no value moves by more than `still`: the values
// after each pass, the first being the starting guess
export function replay(episodes: Episode[], method: Method, step: number, start: number[], still = 0.005, most = 2000): number[][] {
  const passes = [start]
  for (let pass = 0; pass < most; pass++) {
    const before = passes[passes.length - 1]
    const after = batchPass(before, episodes, method, step)
    passes.push(after)
    if (Math.max(...after.map((value, s) => Math.abs(value - before[s]))) < still) break
  }
  return passes
}

// Every guess starts here, in minutes, before any notes
export const FIRST_GUESS = 25
export const firstGuesses = () => Array<number>(COUNT).fill(FIRST_GUESS)

// The story's notebook: six trips by hand. The bike was quicker to the
// station, but both bike days met the slow train.
export const STORY: Trip[] = [
  { by: BUS, leg: 15, train: FAST, ride: 10 },
  { by: BUS, leg: 15, train: FAST, ride: 10 },
  { by: BIKE, leg: 12, train: SLOW, ride: 30 },
  { by: BUS, leg: 15, train: SLOW, ride: 30 },
  { by: BUS, leg: 15, train: FAST, ride: 10 },
  { by: BIKE, leg: 12, train: SLOW, ride: 30 },
]
export const STORY_EPISODES = STORY.map(tripMoves)
export const STORY_MC = averageReturns(STORY_EPISODES, COUNT) as number[]
export const STORY_MODEL = estimateModel(STORY_EPISODES, COUNT)
export const STORY_TD = solveModel(STORY_MODEL, FIRST_GUESS)

// The world the notes come from. She takes the bus three days in four.
// With trains that run on their own, the fast one comes half the time,
// whoever is waiting: where you are says all that matters (Markov). With a
// bus timed to meet the fast train, how you came matters too: it is there
// for 4 bus riders in 5, and 1 cyclist in 5, but the notes only say
// "station".
export type World = 'own' | 'timed'
export const BUS_SHARE = 0.75
export const LEG = { [BUS]: 15, [BIKE]: 12 } as const
export const RIDE = { [FAST]: 10, [SLOW]: 30 } as const
export const fastChance = (world: World, by: Trip['by']) => (world === 'own' ? 0.5 : by === BUS ? 0.8 : 0.2)

// Within 15% of the usual minutes, either way
const about = (minutes: number, random: () => number) => minutes * (0.85 + 0.3 * random())

export function sampleTrip(random: () => number, world: World): Trip {
  const by = random() < BUS_SHARE ? BUS : BIKE
  const leg = about(LEG[by], random)
  const train = random() < fastChance(world, by) ? FAST : SLOW
  return { by, leg, train, ride: about(RIDE[train], random) }
}

export const sampleNotebook = (random: () => number, world: World, trips: number): Trip[] =>
  Array.from({ length: trips }, () => sampleTrip(random, world))

// The true minutes left from each place. The station's is over everyone
// who reaches it, which is all a learner that only sees "station" can know.
export function trueValues(world: World): number[] {
  const after = (by: Trip['by']) => fastChance(world, by) * RIDE[FAST] + (1 - fastChance(world, by)) * RIDE[SLOW]
  const fastShare = BUS_SHARE * fastChance(world, BUS) + (1 - BUS_SHARE) * fastChance(world, BIKE)
  return [
    LEG[BUS] + after(BUS),
    LEG[BIKE] + after(BIKE),
    fastShare * RIDE[FAST] + (1 - fastShare) * RIDE[SLOW],
    RIDE[FAST],
    RIDE[SLOW],
  ]
}

// Both methods' settled answers for a notebook, worked out directly
export function settled(trips: Trip[]): Record<Method, number[]> {
  const episodes = trips.map(tripMoves)
  return {
    mc: averageReturns(episodes, COUNT).map((value) => value ?? FIRST_GUESS),
    td: solveModel(estimateModel(episodes, COUNT), FIRST_GUESS),
  }
}

// How far a notebook's answers are from the truth on the bus and the bike,
// the two ways to start: the root mean square, over those the notes visit
export function tripMiss(trips: Trip[], values: number[], world: World): number | null {
  const truth = trueValues(world)
  const seen = [BUS, BIKE].filter((by) => trips.some((trip) => trip.by === by))
  if (!seen.length) return null
  return Math.sqrt(seen.reduce((sum, s) => sum + (values[s] - truth[s]) ** 2, 0) / seen.length)
}

// The figure to replay: notebooks of ten trips, and the step of each pass
export const NOTEBOOK = 10
export const BATCH_STEP = 0.05
export const NOTEBOOKS = 2000

// The figure to replay starts on this notebook; each new one is the next seed
export const PLAY_SEED = 25

export interface Replayed {
  trips: Trip[]
  passes: Record<Method, number[][]>
  settled: Record<Method, number[]>
}

// A notebook and both methods' passes over it, worked out once and kept
const replays = new Map<string, Replayed>()
export function replayNotebook(world: World, seed: number): Replayed {
  const key = `${world} ${seed}`
  let found = replays.get(key)
  if (!found) {
    const trips = sampleNotebook(seeded(seed), world, NOTEBOOK)
    const episodes = trips.map(tripMoves)
    found = {
      trips,
      passes: { td: replay(episodes, 'td', BATCH_STEP, firstGuesses()), mc: replay(episodes, 'mc', BATCH_STEP, firstGuesses()) },
      settled: settled(trips),
    }
    replays.set(key, found)
  }
  return found
}

// The typical miss of each method over many notebooks, in each world
export function typicalMiss(world: World, method: Method, notebooks = NOTEBOOKS, trips = NOTEBOOK): number {
  let sum = 0
  let counted = 0
  for (let k = 0; k < notebooks; k++) {
    const notebook = sampleNotebook(seeded(1000 + k), world, trips)
    const miss = tripMiss(notebook, settled(notebook)[method], world)
    if (miss === null) continue
    sum += miss ** 2
    counted += 1
  }
  return Math.sqrt(sum / counted)
}

export const MISSES: Record<World, Record<Method, number>> = {
  own: { td: typicalMiss('own', 'td'), mc: typicalMiss('own', 'mc') },
  timed: { td: typicalMiss('timed', 'td'), mc: typicalMiss('timed', 'mc') },
}

// The story's hundred notebooks of ten trips, trains on their own: each
// method's settled number for the bike
export const STORY_NOTEBOOKS = 100
export const STORY_SEED = 7
export const BIKE_ANSWERS: { td: number; mc: number }[] = (() => {
  const random = seeded(STORY_SEED)
  const out: { td: number; mc: number }[] = []
  while (out.length < STORY_NOTEBOOKS) {
    const notebook = sampleNotebook(random, 'own', NOTEBOOK)
    if (!notebook.some((trip) => trip.by === BIKE)) continue
    const { td, mc } = settled(notebook)
    out.push({ td: td[BIKE], mc: mc[BIKE] })
  }
  return out
})()

export const spreadOf = (values: number[], truth: number) =>
  Math.sqrt(values.reduce((sum, value) => sum + (value - truth) ** 2, 0) / values.length)

// Learning online, one trip at a time, as the trips happen: each move
// nudges its state a step toward its target, and nothing is replayed
export function learnTrip(values: number[], trip: Trip, method: Method, step: number): number[] {
  const next = [...values]
  const episode = tripMoves(trip)
  if (method === 'mc') {
    for (const { state, left } of returns(episode)) next[state] += step * (left - next[state])
  } else {
    for (const { from, reward, to } of episode) {
      next[from] += step * (reward + (to === null ? 0 : next[to]) - next[from])
    }
  }
  return next
}

export const STEPS = [0.05, 0.1, 0.2] as const
export const CURVE_TRIPS = 100
export const CURVE_RUNS = 300

// How far off bus and bike are after each trip, averaged over runs: the
// first is before any trip. Both methods see the same trips.
export function learningCurve(method: Method, step: number, runs = CURVE_RUNS, trips = CURVE_TRIPS): number[] {
  const truth = trueValues('own')
  const sums = Array<number>(trips + 1).fill(0)
  for (let run = 0; run < runs; run++) {
    const random = seeded(run + 1)
    let values = firstGuesses()
    for (let k = 0; k <= trips; k++) {
      if (k > 0) values = learnTrip(values, sampleTrip(random, 'own'), method, step)
      sums[k] += Math.sqrt(((values[BUS] - truth[BUS]) ** 2 + (values[BIKE] - truth[BIKE]) ** 2) / 2)
    }
  }
  return sums.map((sum) => sum / runs)
}

export const CURVES = STEPS.map((step) => ({ step, td: learningCurve('td', step), mc: learningCurve('mc', step) }))

// What solving the model directly costs, against TD, for n states
export const modelNumbers = (n: number) => n * n
export const solveSteps = (n: number) => n ** 3
export const tdNumbers = (n: number) => n
