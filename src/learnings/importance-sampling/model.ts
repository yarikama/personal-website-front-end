import { seeded } from '../../components/explain/random'

// Judging your own commute from a friend's log of theirs. A commute has a
// few junctions; at each you take the main road or the side street. The
// main road is quick but jams one time in four; the side street is slower
// and never jams. You take the main road 4 times in 5 (the target policy);
// your friend, whose trips are the only ones logged, flips a coin (the
// behaviour policy). Weighting each logged trip by how much likelier you
// would have made its turns turns the friend's log into a log of yours, on
// average: importance sampling, ordinary and weighted.

export type Turn = 'main' | 'side'

// One junction of a trip: the turn taken, and whether the main road jammed
export interface Leg {
  turn: Turn
  jammed: boolean
}
export type Trip = Leg[]

export const CLEAR = 8
export const JAMMED = 20
export const JAM = 0.25
export const SIDE = 16
export const JUNCTIONS = 3

// The chance of taking the main road at a junction: yours and your friend's
export const YOU = 0.8
export const COIN = 0.5

export const legMinutes = (leg: Leg) => (leg.turn === 'side' ? SIDE : leg.jammed ? JAMMED : CLEAR)
export const tripMinutes = (trip: Trip) => trip.reduce((total, leg) => total + legMinutes(leg), 0)

// How likely a habit that takes the main road with chance `main` is to take `turn`
export const chance = (turn: Turn, main: number) => (turn === 'main' ? main : 1 - main)

// One leg's share of the weight, and a trip's: how much likelier you are
// to have made its turns than your friend was. The jams are left out on
// purpose: a road jams as often whoever drives it, so its odds would be
// the same above and below the line, and cancel.
export const legRatio = (turn: Turn, behaviour: number, target = YOU) => chance(turn, target) / chance(turn, behaviour)
export const ratio = (trip: Trip, behaviour: number, target = YOU) =>
  trip.reduce((product, leg) => product * legRatio(leg.turn, behaviour, target), 1)

// The true average commute for a habit, worked out from the roads' odds
// (which the estimates never look at): every junction costs the same on
// average, 11 minutes on the main road and 16 on the side street
export const MAIN_MEAN = (1 - JAM) * CLEAR + JAM * JAMMED
export const legMean = (main: number) => main * MAIN_MEAN + (1 - main) * SIDE
export const value = (main: number, junctions = JUNCTIONS) => junctions * legMean(main)

export const TRUE = value(YOU)
export const FRIEND = value(COIN)

// One trip, driven by a habit that takes the main road with chance `main`
export function drive(random: () => number, main: number, junctions = JUNCTIONS): Trip {
  return Array.from({ length: junctions }, () => {
    const turn: Turn = random() < main ? 'main' : 'side'
    const jammed = random() < JAM
    return { turn, jammed: turn === 'main' && jammed }
  })
}

export const driveMany = (random: () => number, main: number, count: number, junctions = JUNCTIONS): Trip[] =>
  Array.from({ length: count }, () => drive(random, main, junctions))

// What the friend's log says about your commute. Ordinary importance
// sampling divides the weighted minutes by the number of trips; weighted
// importance sampling divides them by the total weight.
export interface Sums {
  trips: number
  weight: number
  weighted: number
}

export const noSums = (): Sums => ({ trips: 0, weight: 0, weighted: 0 })
export const add = (sums: Sums, minutes: number, weight: number): Sums => ({
  trips: sums.trips + 1,
  weight: sums.weight + weight,
  weighted: sums.weighted + weight * minutes,
})
export const ordinaryOf = (sums: Sums) => (sums.trips ? sums.weighted / sums.trips : NaN)
export const weightedOf = (sums: Sums) => (sums.weight ? sums.weighted / sums.weight : NaN)

export function sumsOf(trips: Trip[], behaviour: number): Sums {
  return trips.reduce((sums, trip) => add(sums, tripMinutes(trip), ratio(trip, behaviour)), noSums())
}

export const ordinary = (trips: Trip[], behaviour: number) => ordinaryOf(sumsOf(trips, behaviour))
export const weighted = (trips: Trip[], behaviour: number) => weightedOf(sumsOf(trips, behaviour))
export const plain = (trips: Trip[]) => trips.reduce((total, trip) => total + tripMinutes(trip), 0) / trips.length

// Both estimates after every trip of a log
export function running(trips: Trip[], behaviour: number) {
  const out = { ordinary: [] as number[], weighted: [] as number[] }
  let sums = noSums()
  for (const trip of trips) {
    sums = add(sums, tripMinutes(trip), ratio(trip, behaviour))
    out.ordinary.push(ordinaryOf(sums))
    out.weighted.push(weightedOf(sums))
  }
  return out
}

// The weighted estimate, one trip at a time, keeping only the estimate V
// and the weight so far C: C ← C + W, then V ← V + (W ÷ C)(G − V)
export interface Running {
  estimate: number
  weight: number
}

export function step(state: Running, minutes: number, weight: number): Running {
  if (weight === 0) return state
  const total = state.weight + weight
  return { weight: total, estimate: state.estimate + (weight / total) * (minutes - state.estimate) }
}

// Every way one trip can go, with its chance under a habit: for checking
// averages exactly, not by sampling
export function outcomes(main: number, junctions = JUNCTIONS): { trip: Trip; chance: number }[] {
  const legs: { leg: Leg; chance: number }[] = [
    { leg: { turn: 'main', jammed: false }, chance: main * (1 - JAM) },
    { leg: { turn: 'main', jammed: true }, chance: main * JAM },
    { leg: { turn: 'side', jammed: false }, chance: 1 - main },
  ]
  let all = [{ trip: [] as Trip, chance: 1 }]
  for (let j = 0; j < junctions; j++) {
    all = all.flatMap(({ trip, chance }) => legs.map((l) => ({ trip: [...trip, l.leg], chance: chance * l.chance })))
  }
  return all.filter((o) => o.chance > 0)
}

// What the weighted estimate says on average after one trip of the
// friend's, and after two, worked out from every way the trips can go:
// after one it is just that trip's minutes, so on average the friend's
// commute, not yours; after two it has come part of the way back
export const WEIGHTED_ON_AVERAGE = (() => {
  const all = outcomes(COIN)
  let one = 0
  let two = 0
  for (const a of all) {
    one += a.chance * tripMinutes(a.trip)
    const wa = ratio(a.trip, COIN)
    for (const b of all) {
      const wb = ratio(b.trip, COIN)
      two += a.chance * b.chance * ((wa * tripMinutes(a.trip) + wb * tripMinutes(b.trip)) / (wa + wb))
    }
  }
  return { one, two }
})()

// What the ordinary estimate can say after one trip: from the lightest
// trip's minutes times its weight to the heaviest's
export const ONE_TRIP = (() => {
  const says = outcomes(COIN).map((o) => ratio(o.trip, COIN) * tripMinutes(o.trip))
  return { low: Math.min(...says), high: Math.max(...says) }
})()

// The story's friend's log: five trips, coin-flipped
const leg = (turn: Turn, jammed = false): Leg => ({ turn, jammed })
export const STORY_TRIPS: Trip[] = [
  [leg('main'), leg('main'), leg('side')],
  [leg('main'), leg('main', true), leg('main')],
  [leg('side'), leg('side'), leg('main', true)],
  [leg('side'), leg('main'), leg('side')],
  [leg('main'), leg('side'), leg('side')],
]

// Then a long log of the friend's, and the two estimates over it. The
// seed is one whose run tells what runs do in general (see model.test.ts):
// the ordinary estimate wanders well away early on, the weighted one stays
// close, and both end near 36.
export const STORY_SEED = 10
export const STORY_COUNT = 1000
export const STORY_LOG = driveMany(seeded(STORY_SEED), COIN, STORY_COUNT)
export const STORY_RUN = running(STORY_LOG, COIN)

// The figure to play with: many friends' logs at once, for a friend who
// takes the main road with chance `behaviour`, on trips of `junctions`.
// Worked out once per setting and kept, since the figure only draws.
export const PLAY_TRIPS = 1000
export const PLAY_SHOWN = 8
export const PLAY_RUNS = 200
export const JUNCTION_CHOICES = [3, 6, 12] as const

export interface Spread {
  // The first PLAY_SHOWN logs' running estimates, to draw
  shown: { ordinary: number[]; weighted: number[] }[]
  // How far each estimate typically is from the truth after PLAY_TRIPS
  // trips, over PLAY_RUNS logs: the root of the mean squared miss
  miss: { ordinary: number; weighted: number }
  // The heaviest weight any trip got, over every log
  heaviest: number
  truth: number
}

const spreads = new Map<string, Spread>()

export function spread(behaviour: number, junctions: number): Spread {
  const key = `${behaviour.toFixed(2)}:${junctions}`
  const kept = spreads.get(key)
  if (kept) return kept
  const truth = value(YOU, junctions)
  const random = seeded(11 + junctions)
  const shown: Spread['shown'] = []
  let squares = { ordinary: 0, weighted: 0 }
  let heaviest = 0
  for (let run = 0; run < PLAY_RUNS; run++) {
    const trips = driveMany(random, behaviour, PLAY_TRIPS, junctions)
    for (const trip of trips) heaviest = Math.max(heaviest, ratio(trip, behaviour))
    if (run < PLAY_SHOWN) {
      const r = running(trips, behaviour)
      shown.push(r)
    }
    const sums = sumsOf(trips, behaviour)
    // With no weight at all, the weighted estimate has nothing to say:
    // count it as missing by the whole truth
    const w = weightedOf(sums)
    squares = {
      ordinary: squares.ordinary + (ordinaryOf(sums) - truth) ** 2,
      weighted: squares.weighted + (Number.isNaN(w) ? truth : w - truth) ** 2,
    }
  }
  const result: Spread = {
    shown,
    miss: { ordinary: Math.sqrt(squares.ordinary / PLAY_RUNS), weighted: Math.sqrt(squares.weighted / PLAY_RUNS) },
    heaviest,
    truth,
  }
  spreads.set(key, result)
  return result
}

// Off-policy Monte Carlo control. The target always takes the move it
// rates best; the behaviour does too, except that one move in `1 / epsilon`
// is picked at random from four (so one of those times in four it is the
// best move anyway). Read from the end of an episode back, every move the
// target would also have made keeps the weight going; the first move it
// would not have made has a target chance of 0, so nothing before it
// counts. Each episode teaches only from its last off-target move on.
export const MOVES = 4

// One episode: for each move, whether it was off the target's choice
export function episode(random: () => number, length: number, epsilon: number): boolean[] {
  return Array.from({ length }, () => random() < epsilon && Math.floor(random() * MOVES) !== 0)
}

// Where the part an episode teaches starts: at its last off-target move,
// whose own score asks only what followed it, or at the start if it had none
export const tailStart = (moves: boolean[]) => Math.max(0, moves.lastIndexOf(true))

// The chance a move is off target
export const offTarget = (epsilon: number) => epsilon * (1 - 1 / MOVES)

// The chance an episode teaches its first move: no off-target move after it
export const reachesStart = (length: number, epsilon: number) => (1 - offTarget(epsilon)) ** (length - 1)

export const LENGTHS = [10, 30, 100] as const
export const EPSILONS = [0.05, 0.1, 0.25] as const
export const TAIL_SHOWN = 12
export const TAIL_RUNS = 4000

export interface Tails {
  shown: boolean[][]
  // The share of all moves that are taught, over TAIL_RUNS episodes
  taught: number
  // The share of episodes that teach the first move
  first: number
}

const tails = new Map<string, Tails>()

export function tailsOf(length: number, epsilon: number): Tails {
  const key = `${length}:${epsilon}`
  const kept = tails.get(key)
  if (kept) return kept
  const random = seeded(5)
  const shown: boolean[][] = []
  let taught = 0
  let first = 0
  for (let run = 0; run < TAIL_RUNS; run++) {
    const moves = episode(random, length, epsilon)
    if (run < TAIL_SHOWN) shown.push(moves)
    const start = tailStart(moves)
    taught += length - start
    if (start === 0) first += 1
  }
  const result = { shown, taught: taught / (TAIL_RUNS * length), first: first / TAIL_RUNS }
  tails.set(key, result)
  return result
}
