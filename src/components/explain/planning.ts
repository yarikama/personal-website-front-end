import {
  ALWAYS_ROLL,
  both,
  changed,
  greedy,
  solve,
  SPOTS,
  state,
  sweep,
  sweeps,
  zeros,
  type Pass,
  type Plan,
} from './ladders'

// Policy iteration on the board: judge a way of playing (policy
// evaluation), switch every square to the move that is best by those
// values (policy improvement), and repeat until no square switches. Each
// round is at least as good as the last everywhere, and there are only so
// many ways to play, so it ends, and on the best.

// Evaluations run until the biggest change is under this
export const THETA = 0.001

export interface Round {
  // The way of playing judged this round, and the sweeps that judged it,
  // starting from the last round's values
  plan: Plan
  passes: Pass[]
  values: number[]
  // The squares that switch move after it, and the plan they make
  switched: number[]
  next: Plan
}

// Rounds from always rolling until no square switches; the last round
// switches nothing
export function rounds(start: Plan = ALWAYS_ROLL, theta = THETA): Round[] {
  const result: Round[] = []
  let plan = start
  let values = zeros()
  for (let round = 0; round < 50; round++) {
    const passes = sweeps(plan, theta, 'copies', values)
    values = passes.at(-1)!.values
    const next = greedy(values, plan)
    const switched = changed(plan, next)
    result.push({ plan, passes, values, switched, next })
    if (switched.length === 0) break
    plan = next
  }
  return result
}

let cached: Round[] | null = null
export const ROUNDS = () => (cached ??= rounds())

// The best play and its values
export const best = () => ROUNDS().at(-1)!.plan
export const bestValues = () => solve('best')

// Both moves' worth from a square, by a round's values: [roll, step]
export const options = (round: Round, sq: number) => both(round.values, sq)

// ——— Judging less: a few sweeps between improvements ———

export const JUDGE = [1, 3, 'settled'] as const
export type Judge = (typeof JUDGE)[number]

export interface Point {
  // Sweeps done so far, square 1's value then, the plan that sweep judged,
  // whether an improvement followed it, and whether that switched a square
  sweeps: number
  start: number
  plan: Plan
  improved: boolean
  switched: boolean
}

export interface Run {
  points: Point[]
  plan: Plan
  sweeps: number
  // Improvements that switched at least one square
  switches: number
}

// Generalized policy iteration: `judge` sweeps of evaluation (or until the
// biggest change is under θ), then an improvement, again and again, until
// an improvement switches nothing and the values have settled
export function generalized(judge: Judge, theta = THETA): Run {
  let plan = ALWAYS_ROLL
  let values = zeros()
  const points: Point[] = [{ sweeps: 0, start: 0, plan, improved: false, switched: false }]
  let switches = 0
  for (let round = 0; round < 1000; round++) {
    let delta = Infinity
    for (let k = 0; judge === 'settled' ? delta >= theta : k < judge; k++) {
      const pass = sweep(values, plan)
      values = pass.values
      delta = pass.delta
      points.push({ sweeps: points.length, start: values[state(1)], plan, improved: false, switched: false })
      if (delta < theta) break
    }
    const next = greedy(values, plan)
    const switched = changed(plan, next)
    points[points.length - 1].improved = true
    if (switched.length > 0) {
      switches += 1
      points[points.length - 1].switched = true
      plan = next
    } else if (delta < theta) break
  }
  return { points, plan, sweeps: points.length - 1, switches }
}

const runs = new Map<Judge, Run>()
export function judged(judge: Judge): Run {
  let run = runs.get(judge)
  if (!run) {
    run = generalized(judge)
    runs.set(judge, run)
  }
  return run
}

// The squares where two plans agree, out of all you can stand on
export const agree = (a: Plan, b: Plan) => SPOTS.every((sq) => a[state(sq)] === b[state(sq)])
