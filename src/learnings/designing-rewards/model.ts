import { always, discounted, greedy, greedyPolicy, gridworld, optimal, run, type Grid, type Visit } from '../../components/explain/mdp'

// The agent maximises the reward it is given, not what was meant by it. A
// courier robot on a grid: delivering at G pays 10 and ends the run. Add a
// small bonus for passing a checkpoint, meant as a hint, and the best thing
// to do becomes circling the checkpoint for ever.

export const GAMMA = 0.9
export const START = { x: 0, y: 4 }
export const GOAL = { x: 7, y: 0 }
export const CHECKPOINT = { x: 1, y: 3 }
export const DELIVERY = 10
export const BONUS = 1

export const SCHEMES = ['Delivery only', 'Delivery + checkpoint'] as const
export type Scheme = (typeof SCHEMES)[number]

export const grid = (scheme: Scheme): Grid => ({
  width: 8,
  height: 5,
  ends: [{ at: GOAL, reward: DELIVERY }],
  bonuses: scheme === 'Delivery only' ? [] : [{ at: CHECKPOINT, reward: BONUS }],
  bump: 0,
})

const worlds = new Map<Scheme, ReturnType<typeof solve>>()
function solve(scheme: Scheme) {
  const world = gridworld(grid(scheme))
  const values = optimal(world, GAMMA)
  return { world, values, arrows: greedy(world, values, GAMMA), policy: greedyPolicy(world, values, GAMMA) }
}

// The grid under a scheme, the best values, the best moves and the policy
export function courier(scheme: Scheme) {
  let solved = worlds.get(scheme)
  if (!solved) {
    solved = solve(scheme)
    worlds.set(scheme, solved)
  }
  return solved
}

export const MOVES_SHOWN = 30

// The courier's run from the start, by the best policy for the scheme
export function trip(scheme: Scheme, moves = MOVES_SHOWN): Visit[] {
  const { world, policy } = courier(scheme)
  return run(world, policy, world.at(START), moves, () => 0)
}

export const delivered = (visits: Visit[]) => visits.some((visit) => visit.reward === DELIVERY)
export const points = (visits: Visit[]) => visits.reduce((sum, visit) => sum + visit.reward, 0)

// The two choices at the start, worked out: circle the checkpoint, a bonus
// every other move for ever (1 + 0.81 + 0.81² + …, from beside it), or walk
// to the goal, 10 at the end of the walk
export const circling = (gamma = GAMMA) => BONUS / (1 - gamma * gamma)
export const walking = (moves: number, gamma = GAMMA) => discounted([...Array(moves - 1).fill(0), DELIVERY], gamma)
// Moves from the start to the goal
export const DISTANCE = Math.abs(GOAL.x - START.x) + Math.abs(GOAL.y - START.y)

// A policy that heads straight for the goal: up, then right
export const straight = (scheme: Scheme) => {
  const { world } = courier(scheme)
  return always(world, (s) => (world.cell(s).y > GOAL.y ? 0 : 1))
}

// ——— The story: toys and coins ———

export const TOYS = 6
// "5.3"
export const one = (value: number) => value.toFixed(1)
