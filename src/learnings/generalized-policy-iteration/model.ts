import { seeded } from '../../components/explain/random'
import {
  ALWAYS_ROLL,
  BOARD,
  both,
  changed,
  FINISH,
  greedy,
  ROLL,
  solve,
  SPOTS,
  state,
  STEP,
  sweep,
  worth,
  zeros,
  type Plan,
} from '../../components/explain/ladders'
import { best } from '../../components/explain/planning'

// Generalized policy iteration on the board: two jobs take turns. Judging
// (evaluation) moves the values towards the current way of playing's own
// values; improving moves the way of playing towards the better move by the
// current values. How much judging comes between improvements, the grain,
// is a choice: a single square, one sweep, a few, or until settled.
//
// Two numbers say how far each job is from done:
//   off:     how far the values are from the way of playing's own values,
//            on the square furthest off (0 once judging has nothing to do)
//   unhappy: the squares whose move is not the better one by the values
//            (none once improving has nothing to do)
// Each job drives its own number down and can push the other's up. They
// can only both be at rest on the best play.

export const THETA = 0.001

export const GRAINS = ['square', 1, 3, 'settled'] as const
export type Grain = (typeof GRAINS)[number]

export const grainName = (grain: Grain) =>
  grain === 'square' ? '1 square' : grain === 'settled' ? 'until settled' : `${grain} sweep${grain === 1 ? '' : 's'}`

// A sweep is one update for every square you can stand on
export const PER_SWEEP = SPOTS.length

// ——— Whether a way of playing ever finishes ———

// A way of playing that steps on 18 and on 27 goes round for ever: 18 steps
// onto the ladder at 19 up to 27, and 27 steps onto the snake at 28 back to
// 18. Its values are minus infinity, so a run must never pass through one.
export function finishes(plan: Plan): boolean {
  const reaches = new Set([state(FINISH)])
  let grew = true
  while (grew) {
    grew = false
    for (const sq of SPOTS) {
      const s = state(sq)
      if (reaches.has(s)) continue
      if (BOARD.moves[s][plan[s]].some(({ next }) => reaches.has(next))) {
        reaches.add(s)
        grew = true
      }
    }
  }
  return SPOTS.every((sq) => reaches.has(state(sq)))
}

// ——— The two numbers ———

// How far `values` are from `plan`'s own values, on the square furthest off
export const offBy = (values: number[], plan: Plan) => {
  if (!finishes(plan)) return Infinity
  const own = solve(plan)
  return Math.max(...SPOTS.map((sq) => Math.abs(values[state(sq)] - own[state(sq)])))
}

// The squares where the other move is worth more than the plan's, by
// `values`. A tie leaves the plan alone, as greedy() does.
export const unhappy = (values: number[], plan: Plan, slack = 1e-9) =>
  SPOTS.filter((sq) => {
    const [roll, step] = both(values, sq)
    const mine = plan[state(sq)] === ROLL ? roll : step
    return Math.max(roll, step) > mine + slack
  })

// How far off the values are, for a label: "2.92", or "<0.01"
export const offText = (off: number) => (off < 0.01 ? '<0.01' : off.toFixed(2))

// ——— A run ———

export interface Moment {
  // Square updates so far (a sweep is PER_SWEEP of them)
  updates: number
  values: number[]
  plan: Plan
  // What happened just before this moment: the start, judging, or an
  // improvement, and the squares an improvement switched
  kind: 'start' | 'judge' | 'improve'
  switched: number[]
  off: number
  unhappy: number[]
}

export interface Run {
  grain: Grain
  moments: Moment[]
  plan: Plan
  updates: number
  // Improvements that switched at least one square
  switches: number
}

const moment = (updates: number, values: number[], plan: Plan, kind: Moment['kind'], switched: number[] = []) => ({
  updates,
  values,
  plan,
  kind,
  switched,
  off: offBy(values, plan),
  unhappy: unhappy(values, plan),
})

// Judging for whole sweeps between improvements: `grain` sweeps (or until
// the biggest change is under θ), then switch every square to its better
// move; stop once an improvement switches nothing after the values settled
function bySweeps(grain: number | 'settled', theta: number): Run {
  let plan = ALWAYS_ROLL
  let values = zeros()
  let updates = 0
  let switches = 0
  const moments: Moment[] = [moment(0, values, plan, 'start')]
  for (let round = 0; round < 1000; round++) {
    let delta = Infinity
    for (let k = 0; grain === 'settled' ? delta >= theta : k < grain; k++) {
      const pass = sweep(values, plan)
      values = pass.values
      delta = pass.delta
      updates += PER_SWEEP
      moments.push(moment(updates, values, plan, 'judge'))
      if (delta < theta) break
    }
    const next = greedy(values, plan)
    const switched = changed(plan, next)
    if (switched.length > 0) {
      switches += 1
      plan = next
      moments.push(moment(updates, values, plan, 'improve', switched))
    } else if (delta < theta) break
  }
  return { grain: grain === 'settled' ? 'settled' : (grain as Grain), moments, plan, updates, switches }
}

// The finest grain: update one square's value by its move, then at once
// give that one square its better move, and on to the next square. Each
// pass visits every square once, in a shuffled order; stop after a pass
// that changed no value by θ or more and switched nothing.
export const SHUFFLE_SEED = 3

export function bySquares(theta: number, seed = SHUFFLE_SEED): Run {
  const random = seeded(seed)
  let plan = ALWAYS_ROLL
  const values = zeros()
  let updates = 0
  let switches = 0
  const moments: Moment[] = [moment(0, [...values], plan, 'start')]
  for (let pass = 0; pass < 1000; pass++) {
    const order = [...SPOTS]
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    let delta = 0
    let switchedAny = false
    for (const sq of order) {
      const s = state(sq)
      const value = worth(values, sq, plan[s])
      delta = Math.max(delta, Math.abs(value - values[s]))
      values[s] = value
      updates += 1
      const [roll, step] = both(values, sq)
      const better = Math.abs(roll - step) <= 1e-9 ? plan[s] : roll > step ? ROLL : STEP
      if (better !== plan[s]) {
        plan = plan.map((move, t) => (t === s ? better : move))
        switches += 1
        switchedAny = true
        moments.push(moment(updates, [...values], plan, 'improve', [sq]))
      } else {
        moments.push(moment(updates, [...values], plan, 'judge'))
      }
    }
    if (delta < theta && !switchedAny) break
  }
  return { grain: 'square', moments, plan, updates, switches }
}

export const generalized = (grain: Grain, theta = THETA): Run =>
  grain === 'square' ? bySquares(theta) : bySweeps(grain, theta)

const runs = new Map<Grain, Run>()
export function run(grain: Grain): Run {
  let result = runs.get(grain)
  if (!result) {
    result = generalized(grain)
    runs.set(grain, result)
  }
  return result
}

// The moment a run is at after `updates` square updates: the last one at
// or before it
export function at(run: Run, updates: number): number {
  let lo = 0
  let hi = run.moments.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (run.moments[mid].updates <= updates) lo = mid
    else hi = mid - 1
  }
  return lo
}

// How many moves a run has switched by `updates` square updates
export const switchedBy = (run: Run, updates: number) =>
  run.moments.slice(0, at(run, updates) + 1).reduce((sum, m) => sum + m.switched.length, 0)

export const sameAsBest = (plan: Plan) => changed(plan, best()).length === 0

// ——— The story: judging until settled between improvements ———

export const STORY_GRAIN: Grain = 'settled'

export const story = () => run(STORY_GRAIN)

// The story's rounds: for each improvement that switched a square, the
// moment just before it (the judging's end) and the improvement itself
export function storyRounds() {
  const { moments } = story()
  return moments.flatMap((m, i) => (m.kind === 'improve' ? [{ before: i - 1, after: i }] : []))
}

// ——— Why the end is the best ———

// At the end: on a square, the plan's move, both moves' worth, and the value
export function restingOn(sq: number, grain: Grain = 'settled') {
  const end = run(grain).moments.at(-1)!
  const [roll, step] = both(end.values, sq)
  return { value: end.values[state(sq)], roll, step, move: end.plan[state(sq)] }
}
