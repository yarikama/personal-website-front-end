// The Markov decision process pages' toolkit: a small world of states and
// actions, where each action from each state leads to a next state and a
// reward with some chance, p(s′, r | s, a). On a world that small, the value
// of every state can be worked out exactly, for a given way of acting (a
// policy) or for the best one, and the figures then only draw.

// One way an action can turn out: where it leads, what it pays, how likely
export interface Outcome {
  next: number
  reward: number
  chance: number
}

export interface Mdp {
  // A name for each state, for tests and labels
  names: string[]
  // moves[s][a]: how action a from state s can turn out. A state with no
  // actions is terminal: the episode ends there and it is worth 0.
  moves: Outcome[][][]
}

// A policy: for each state, the chance of each of its actions
export type Policy = number[][]

// Every action equally likely in every state
export const uniform = (mdp: Mdp): Policy => mdp.moves.map((actions) => actions.map(() => 1 / actions.length))

// The policy that always takes `pick(s)` in state s
export const always = (mdp: Mdp, pick: (state: number) => number): Policy =>
  mdp.moves.map((actions, s) => actions.map((_, a) => (a === pick(s) ? 1 : 0)))

// What an action is worth from a state, given what every state is worth:
// Σ p(s′, r | s, a) · (r + γ v(s′)), the reward plus the discounted value of
// where it lands, averaged over how it can turn out
export const backup = (mdp: Mdp, values: number[], gamma: number, state: number, action: number) =>
  mdp.moves[state][action].reduce((sum, { next, reward, chance }) => sum + chance * (reward + gamma * values[next]), 0)

// Every action's worth from `state`: q(s, a) for each a
export const actionValues = (mdp: Mdp, values: number[], gamma: number, state: number) =>
  mdp.moves[state].map((_, a) => backup(mdp, values, gamma, state, a))

// One pass of the Bellman equation over every state: each state's value
// becomes the average, over the policy's actions, of what they are worth
// given the old values. (A pass of the optimality equation takes the best
// action instead of the average.)
export function sweep(mdp: Mdp, values: number[], gamma: number, policy: Policy | 'best'): number[] {
  return mdp.moves.map((actions, s) => {
    if (actions.length === 0) return 0
    const worth = actionValues(mdp, values, gamma, s)
    return policy === 'best' ? Math.max(...worth) : worth.reduce((sum, q, a) => sum + policy[s][a] * q, 0)
  })
}

// The values after each pass, from all zeros, until no value moves by more
// than `tolerance` (or `most` passes): the first is all zeros, the last the
// answer. A figure plays them to show the values settling.
export function sweeps(mdp: Mdp, gamma: number, policy: Policy | 'best', tolerance = 1e-9, most = 5000): number[][] {
  const passes = [mdp.names.map(() => 0)]
  for (let i = 0; i < most; i++) {
    const before = passes[passes.length - 1]
    const after = sweep(mdp, before, gamma, policy)
    passes.push(after)
    if (after.every((value, s) => Math.abs(value - before[s]) <= tolerance)) break
  }
  return passes
}

// v_π: what every state is worth when acting by `policy`
export const evaluate = (mdp: Mdp, policy: Policy, gamma: number) => sweeps(mdp, gamma, policy).at(-1)!

// v*: what every state is worth when acting as well as possible
export const optimal = (mdp: Mdp, gamma: number) => sweeps(mdp, gamma, 'best').at(-1)!

// The actions that are best by `values`, one step ahead: those within
// `slack` of the best, so ties all show
export function greedy(mdp: Mdp, values: number[], gamma: number, slack = 1e-6): number[][] {
  return mdp.moves.map((actions, s) => {
    if (actions.length === 0) return []
    const worth = actionValues(mdp, values, gamma, s)
    const top = Math.max(...worth)
    return worth.flatMap((q, a) => (q >= top - slack ? [a] : []))
  })
}

// The policy that takes the first of the best actions by `values`
export const greedyPolicy = (mdp: Mdp, values: number[], gamma: number): Policy => {
  const best = greedy(mdp, values, gamma)
  return always(mdp, (s) => best[s][0] ?? 0)
}

// The discounted return of a run of rewards: R₁ + γR₂ + γ²R₃ + …
export const discounted = (rewards: number[], gamma: number) =>
  rewards.reduceRight((rest, reward) => reward + gamma * rest, 0)

// The most a reward of 1 every step, forever, is worth: 1 / (1 − γ)
export const forever = (gamma: number) => (gamma < 1 ? 1 / (1 - gamma) : Infinity)

export interface Visit {
  state: number
  action: number
  reward: number
  next: number
}

// A run through the world by `policy`, from `start`, for up to `steps`
// steps or until a terminal state. `random` picks actions and outcomes.
export function run(mdp: Mdp, policy: Policy, start: number, steps: number, random: () => number): Visit[] {
  const visits: Visit[] = []
  let state = start
  for (let t = 0; t < steps && mdp.moves[state].length > 0; t++) {
    const action = pick(policy[state], random)
    const outcomes = mdp.moves[state][action]
    const { next, reward } = outcomes[pick(outcomes.map((o) => o.chance), random)]
    visits.push({ state, action, reward, next })
    state = next
  }
  return visits
}

function pick(chances: number[], random: () => number): number {
  let draw = random()
  for (let i = 0; i < chances.length; i++) {
    draw -= chances[i]
    if (draw < 0) return i
  }
  return chances.length - 1
}

// ——— Gridworlds ———

// The four moves, in this order everywhere
export const MOVES = ['north', 'east', 'south', 'west'] as const
export const STEP: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]

export interface Cell {
  x: number
  y: number
}

export interface Grid {
  width: number
  height: number
  // Leaving this cell, by any move, pays `reward` and lands on `to`
  jumps?: { from: Cell; to: Cell; reward: number }[]
  // Cells that end the episode; stepping onto one pays its reward
  ends?: { at: Cell; reward: number }[]
  // Stepping onto this cell pays its reward, every time
  bonuses?: { at: Cell; reward: number }[]
  // Cells no move can enter
  walls?: Cell[]
  // What a move into the edge or a wall pays (you stay put)
  bump?: number
  // What every other move pays
  step?: number
}

export interface Gridworld extends Mdp {
  grid: Grid
  // The state at a cell, and the cell of a state
  at: (cell: Cell) => number
  cell: (state: number) => Cell
}

// A grid of cells, one state each, moving north, east, south or west; every
// move goes where it says, so each has one outcome with chance 1
export function gridworld(grid: Grid): Gridworld {
  const { width, height, jumps = [], ends = [], bonuses = [], walls = [], bump = -1, step = 0 } = grid
  const at = ({ x, y }: Cell) => y * width + x
  const cell = (state: number): Cell => ({ x: state % width, y: Math.floor(state / width) })
  const same = (a: Cell) => (b: Cell) => a.x === b.x && a.y === b.y
  const names = Array.from({ length: width * height }, (_, s) => `${cell(s).x},${cell(s).y}`)
  const moves = names.map((_, s) => {
    const here = cell(s)
    if (ends.some((end) => same(end.at)(here))) return []
    const jump = jumps.find((j) => same(j.from)(here))
    return STEP.map(([dx, dy]) => {
      if (jump) return [{ next: at(jump.to), reward: jump.reward, chance: 1 }]
      const there = { x: here.x + dx, y: here.y + dy }
      const off = there.x < 0 || there.y < 0 || there.x >= width || there.y >= height || walls.some(same(there))
      if (off) return [{ next: s, reward: bump, chance: 1 }]
      const end = ends.find((e) => same(e.at)(there))
      const bonus = bonuses.find((b) => same(b.at)(there))
      return [{ next: at(there), reward: end ? end.reward : bonus ? bonus.reward : step, chance: 1 }]
    })
  })
  return { names, moves, grid, at, cell }
}

// The board the value pages share: 5 × 5, a move into the edge costs 1,
// leaving A pays 10 and lands on A′, leaving B pays 5 and lands on B′
export const A = { x: 1, y: 0 }
export const A_ = { x: 1, y: 4 }
export const B = { x: 3, y: 0 }
export const B_ = { x: 3, y: 2 }
export const BOARD: Grid = {
  width: 5,
  height: 5,
  jumps: [
    { from: A, to: A_, reward: 10 },
    { from: B, to: B_, reward: 5 },
  ],
  bump: -1,
}
export const board = () => gridworld(BOARD)

// Values row by row, for a figure or a test
export const rows = (world: Gridworld, values: number[]) =>
  Array.from({ length: world.grid.height }, (_, y) =>
    Array.from({ length: world.grid.width }, (_, x) => values[world.at({ x, y })])
  )
