import {
  ALWAYS_ROLL,
  BOARD,
  both,
  FACES,
  FINISH,
  GAMMA,
  landing,
  ROLL,
  solve,
  SPOTS,
  square,
  standable,
  state,
  STEP,
  type Plan,
} from '../../components/explain/ladders'
import { evaluate, type Policy } from '../../components/explain/mdp'
import { seeded } from '../../components/explain/random'

// Learning to play the roll-or-step board from games alone: Monte Carlo
// control. Each square keeps two averages, one for rolling and one for
// stepping, of the turns that followed that move to the end of the game.
// After every game each square switches to the move with the better
// average. A move never made has no average, so a plan that never steps
// never learns what stepping is worth, unless games start anywhere with a
// random first move (exploring starts), or a random move is made now and
// then (ε-greedy).

// What a move from a square has been worth so far: the average of what
// followed it (minus the turns left), and how many games that is
export interface Average {
  mean: number
  count: number
}

// By state, [roll, step]
export type Table = Average[][]

export const blank = (): Table => BOARD.names.map(() => [ROLL, STEP].map(() => ({ mean: 0, count: 0 })))

// The move a square takes by its averages: the better one of those tried.
// A move never made has no average and can't be preferred; with neither
// tried, or a tie, the square rolls, the habit you start from.
export function better(table: Table, sq: number): number {
  const [roll, step] = table[state(sq)]
  if (!step.count) return ROLL
  if (!roll.count) return STEP
  return step.mean > roll.mean ? STEP : ROLL
}

export const planOf = (table: Table): Plan =>
  BOARD.names.map((_, s) => (standable(square(s)) ? better(table, square(s)) : ROLL))

// How games are played while learning: how often a move is picked at random
// instead of by the averages (either move, half the time each), and whether
// each game starts on square 1 or anywhere with a random first move
export interface Settings {
  epsilon: number
  anywhere: boolean
}

export const GREEDY: Settings = { epsilon: 0, anywhere: false }

// A game cut off after this many turns: a plan that steps on both 18 and 27
// would go round 18, 27, 28 for ever
export const CAP = 200

export interface Turn {
  from: number
  move: number
  to: number
}

export function game(table: Table, settings: Settings, random: () => number): Turn[] {
  const turns: Turn[] = []
  let at = settings.anywhere ? SPOTS[Math.floor(random() * SPOTS.length)] : 1
  while (at !== FINISH && turns.length < CAP) {
    const free = (settings.anywhere && turns.length === 0) || random() < settings.epsilon
    const move = free ? (random() < 0.5 ? ROLL : STEP) : better(table, at)
    const k = move === ROLL ? 1 + Math.floor(random() * FACES) : 1
    const to = landing(at, k)
    turns.push({ from: at, move, to })
    at = to
  }
  return turns
}

// What one game teaches: each square and move, the first time it was made
// in the game, and the turns that followed it to the end (itself included)
export interface Sample {
  square: number
  move: number
  left: number
}

export function samples(turns: Turn[]): Sample[] {
  const seen = new Set<string>()
  const out: Sample[] = []
  turns.forEach(({ from, move }, i) => {
    const key = `${from}:${move}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ square: from, move, left: turns.length - i })
  })
  return out
}

// Fold a game into the averages: new = old + (1 / n) × (−turns left − old)
export function learn(table: Table, turns: Turn[]): Table {
  const next = table.map((moves) => moves.map((average) => ({ ...average })))
  for (const { square: sq, move, left } of samples(turns)) {
    const average = next[state(sq)][move]
    average.count += 1
    average.mean += (-left - average.mean) / average.count
  }
  return next
}

// A run of learning: the averages and the plan after each game (the first
// before any), and the games
export interface Run {
  tables: Table[]
  plans: Plan[]
  games: Turn[][]
}

export function train(settings: Settings, count: number, seed: number): Run {
  const random = seeded(seed)
  const tables = [blank()]
  const games: Turn[][] = []
  for (let i = 0; i < count; i++) {
    const turns = game(tables[i], settings, random)
    games.push(turns)
    tables.push(learn(tables[i], turns))
  }
  return { tables, plans: tables.map(planOf), games }
}

// A plan played with random moves now and then: the plan's move 1 − ε/2 of
// the time, the other ε/2
export const soft = (plan: Plan, epsilon: number): Policy =>
  BOARD.moves.map((moves, s) => moves.map((_, a) => (a === plan[s] ? 1 - epsilon / 2 : epsilon / 2)))

// What a plan is worth on every square, worked out from the board's rules
// (which the learner never sees): minus the turns it takes on average,
// played with random moves `epsilon` of the time. A plan that can go round
// for ever is worth −Infinity.
const worked = new Map<string, number[]>()
export function worth(plan: Plan, epsilon = 0): number[] {
  const key = `${plan.join('')}:${epsilon}`
  let values = worked.get(key)
  if (!values) {
    values = epsilon === 0 && loops(plan) ? BOARD.names.map(() => -Infinity) : evaluate(BOARD, soft(plan, epsilon), GAMMA)
    worked.set(key, values)
  }
  return values
}

// Whether a plan can step round a snake for ever: from some square, only
// steps, back where it began
export function loops(plan: Plan): boolean {
  return SPOTS.some((start) => {
    let at = start
    for (let i = 0; i < SPOTS.length + 1; i++) {
      if (plan[state(at)] !== STEP) return false
      at = landing(at, 1)
      if (at === FINISH) return false
      if (at === start) return true
    }
    return false
  })
}

// The best plan, and the best plan for someone who will keep making random
// moves `epsilon` of the time: the plan whose ε-soft play is worth most,
// found by improving on the ε-soft values until nothing switches
export const BEST = (() => {
  const values = solve('best')
  return BOARD.names.map((_, s) => {
    const sq = square(s)
    if (!standable(sq)) return ROLL
    const [roll, step] = both(values, sq)
    return step > roll + 1e-9 ? STEP : ROLL
  })
})()

const bestSoft = new Map<number, Plan>()
export function bestFor(epsilon: number): Plan {
  const known = bestSoft.get(epsilon)
  if (known) return known
  let plan: Plan = ALWAYS_ROLL
  for (let round = 0; round < 50; round++) {
    const values = worth(plan, epsilon)
    const before = plan
    const next: Plan = before.map((move, s) => {
      const sq = square(s)
      if (!standable(sq)) return move
      const [roll, step] = both(values, sq)
      if (Math.abs(roll - step) <= 1e-9) return move
      return step > roll ? STEP : ROLL
    })
    if (next.every((move, s) => move === before[s])) break
    plan = next
  }
  bestSoft.set(epsilon, plan)
  return plan
}

// The squares where a plan steps, and where it differs from another
export const stepsOn = (plan: Plan) => SPOTS.filter((sq) => plan[state(sq)] === STEP)
export const differ = (a: Plan, b: Plan) => SPOTS.filter((sq) => a[state(sq)] !== b[state(sq)])

// Turns from square 1, by a plan, with random moves `epsilon` of the time
export const fromStart = (plan: Plan, epsilon = 0) => -worth(plan, epsilon)[state(1)]

// The story: 1,000 games each of three ways of learning, from blank
// averages. Rolling everywhere and only ever taking the better average; the
// same, but every game starts on a random square with a random first move;
// and every game from square 1, with a random move one turn in ten. Seeds
// picked so each run ends where such runs typically do (see model.test.ts):
// greedy stuck on rolling, the other two on the best play or as good.
export const GAMES = 1000
export const STARTS: Settings = { epsilon: 0, anywhere: true }
export const RANDOM: Settings = { epsilon: 0.1, anywhere: false }
export const SEEDS = { greedy: 1, starts: 26, random: 9 }

let story: { greedy: Run; starts: Run; random: Run } | null = null
export const STORY = () =>
  (story ??= {
    greedy: train(GREEDY, GAMES, SEEDS.greedy),
    starts: train(STARTS, GAMES, SEEDS.starts),
    random: train(RANDOM, GAMES, SEEDS.random),
  })

// Turns from square 1 by rolling everywhere, and by the best play
export const ROLLING = fromStart(ALWAYS_ROLL)
export const BEST_TURNS = fromStart(BEST)

// "1, 2 and 6"
export const list = (items: (number | string)[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
