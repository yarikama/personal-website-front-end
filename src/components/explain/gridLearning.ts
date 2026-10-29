import { argmax } from './bandit'
import { gridworld, type Cell, type Gridworld } from './mdp'
import { seeded } from './random'

// Learning to act from experience alone: a score for every move from every
// place, Q(s, a), learned while walking, with no map of where moves lead.
// After each move, its score is nudged toward what it paid plus the score
// of what comes next. The three pages of "Learning to act" differ only in
// what "what comes next" is:
//   sarsa     the move you actually take next, Q(s′, a′)
//   expected  the average over the moves you might take next
//   q         the best move next, max Q(s′, a), whatever you then do
// The q-learning page imports this file.

export type Method = 'sarsa' | 'expected' | 'q'

// A score as the pages write it: "−12", "0"; "−2.3" with a digit
export const score = (value: number, digits = 0) => {
  const text = Math.abs(value).toFixed(digits)
  return Number(text) === 0 ? (0).toFixed(digits) : `${value < 0 ? '−' : ''}${text}`
}

export interface Settings {
  // How often a move is picked at random instead of the best-scored one
  epsilon: number
  // How far one surprise moves a score
  alpha: number
  // How much a step later counts
  gamma: number
}

// A score for every move from every state; a state with no moves (the end)
// has none, and is worth 0
export type Table = number[][]

export const blank = (world: Gridworld): Table => world.moves.map((actions) => actions.map(() => 0))

// The chance of each move under ε-greedy: the best-scored move (ties shared)
// most of the time, any move with chance ε
export function chances(scores: number[], epsilon: number): number[] {
  const top = Math.max(...scores)
  const best = scores.filter((score) => score === top).length
  return scores.map((score) => epsilon / scores.length + (score === top ? (1 - epsilon) / best : 0))
}

// An ε-greedy pick: says whether it was a random one
export function choose(scores: number[], epsilon: number, random: () => number): { action: number; explored: boolean } {
  if (random() < epsilon) return { action: Math.floor(random() * scores.length), explored: true }
  return { action: argmax(scores, random), explored: false }
}

// What a method counts as the worth of carrying on from `next`, having
// picked `action` there (none at the end, where nothing follows)
export function onward(method: Method, scores: number[], action: number | null, epsilon: number): number {
  if (scores.length === 0) return 0
  if (method === 'q') return Math.max(...scores)
  if (method === 'expected') return chances(scores, epsilon).reduce((sum, p, a) => sum + p * scores[a], 0)
  return scores[action!]
}

// The new score for a move: old + α · (reward + γ · onward − old)
export const nudge = (old: number, reward: number, onward: number, settings: Pick<Settings, 'alpha' | 'gamma'>) =>
  old + settings.alpha * (reward + settings.gamma * onward - old)

export interface Step {
  state: number
  action: number
  reward: number
  next: number
  // Whether the move was a random one
  explored: boolean
  // The move's score before and after this step's update
  before: number
  after: number
}

// One walk from `start` to an end (or `most` steps), learning as it goes:
// `table` is updated in place. Sarsa picks its next move before the update,
// as its target needs it; the others pick after.
export function walk(
  world: Gridworld,
  table: Table,
  method: Method,
  settings: Settings,
  start: number,
  random: () => number,
  most = 1000
): Step[] {
  const steps: Step[] = []
  let state = start
  let pick = choose(table[state], settings.epsilon, random)
  for (let t = 0; t < most; t++) {
    const { next, reward } = world.moves[state][pick.action][0]
    const ahead = table[next]
    const later = method === 'sarsa' && ahead.length > 0 ? choose(ahead, settings.epsilon, random) : null
    const before = table[state][pick.action]
    const after = nudge(before, reward, onward(method, ahead, later?.action ?? null, settings.epsilon), settings)
    table[state][pick.action] = after
    steps.push({ state, action: pick.action, reward, next, explored: pick.explored, before, after })
    if (ahead.length === 0) break
    state = next
    pick = later ?? choose(table[state], settings.epsilon, random)
  }
  return steps
}

export interface Walk {
  steps: Step[]
  // What the walk paid in all, and whether it ended in a bad end (a cell
  // that pays less than `bad`)
  total: number
  bad: boolean
}

export interface Training {
  walks: Walk[]
  // The table after each walk; tables[0] is before the first
  tables: Table[]
}

// `count` walks from `start`, one learner, the same table throughout
export function train(
  world: Gridworld,
  method: Method,
  settings: Settings,
  start: number,
  count: number,
  random: () => number,
  bad = -Infinity,
  keep = false
): Training {
  const table = blank(world)
  const walks: Walk[] = []
  const tables: Table[] = keep ? [table.map((row) => [...row])] : []
  for (let i = 0; i < count; i++) {
    const steps = walk(world, table, method, settings, start, random)
    const total = steps.reduce((sum, step) => sum + step.reward, 0)
    walks.push({ steps, total, bad: steps.at(-1)!.reward < bad })
    if (keep) tables.push(table.map((row) => [...row]))
  }
  return { walks, tables }
}

// Following the best-scored moves from `start` (the first of equals), with
// no random ones: the route the table now recommends. Stops at an end, on
// coming round to a cell it has been to, or after `most` moves.
export function route(world: Gridworld, table: Table, start: number, most = 60): number[] {
  const cells = [start]
  let state = start
  for (let t = 0; t < most && table[state].length > 0; t++) {
    const scores = table[state]
    state = world.moves[state][scores.indexOf(Math.max(...scores))][0].next
    if (cells.includes(state)) break
    cells.push(state)
  }
  return cells
}

// The best-scored moves from every state that has been scored at all
export const bestMoves = (table: Table): number[][] =>
  table.map((scores) => {
    if (scores.length === 0 || scores.every((score) => score === 0)) return []
    const top = Math.max(...scores)
    return scores.flatMap((score, a) => (score === top ? [a] : []))
  })

// The average, over `runs` learners, of each walk's total: what a method
// does in general, not what luck did once
export function averageTotals(
  world: Gridworld,
  method: Method,
  settings: Settings,
  start: number,
  count: number,
  runs: number,
  seed: number,
  bad = -Infinity
): { totals: number[]; bad: number[] } {
  const totals = Array<number>(count).fill(0)
  const bads = Array<number>(count).fill(0)
  for (let run = 0; run < runs; run++) {
    const { walks } = train(world, method, settings, start, count, seeded(seed + run), bad)
    walks.forEach((w, i) => {
      totals[i] += w.total / runs
      bads[i] += (w.bad ? 1 : 0) / runs
    })
  }
  return { totals, bad: bads }
}

// Each value averaged with its neighbours, `window` wide
export function smooth(values: number[], window: number): number[] {
  const half = Math.floor(window / 2)
  return values.map((_, i) => {
    const part = values.slice(Math.max(0, i - half), i + half + 1)
    return part.reduce((sum, v) => sum + v, 0) / part.length
  })
}

// ——— The story: walking to the station in a new town ———

// Six blocks by four. Every block you walk costs a minute; walking into a
// building or off the map costs a minute and gets you nowhere. Reaching the
// station ends the walk.
export const HOME: Cell = { x: 0, y: 3 }
export const STATION: Cell = { x: 5, y: 0 }
export const BUILDINGS: Cell[] = [
  { x: 1, y: 1 },
  { x: 1, y: 2 },
  { x: 3, y: 0 },
  { x: 3, y: 1 },
  { x: 3, y: 2 },
]
export const TOWN = gridworld({
  width: 6,
  height: 4,
  walls: BUILDINGS,
  ends: [{ at: STATION, reward: -1 }],
  step: -1,
  bump: -1,
})
export const START = TOWN.at(HOME)
// The fewest minutes from home to the station
export const SHORTEST = 8

export const STORY: Settings = { epsilon: 0.1, alpha: 0.5, gamma: 1 }
export const STORY_SEED = 26
export const STORY_MORNINGS = 30

export const story = () => train(TOWN, 'sarsa', STORY, START, STORY_MORNINGS, seeded(STORY_SEED), -Infinity, true)

// Minutes a walk took: each step costs one
export const minutes = (w: Walk) => w.steps.length

// The first morning, from `from`, on which a walk took no more than
// `within` minutes, from 1
export const firstWithin = (walks: Walk[], within: number) => walks.findIndex((w) => minutes(w) <= within) + 1

// The table partway through a training: after morning `morning`'s first
// `steps` steps (morning from 0), from the table before that morning
export function tableAt(training: Training, morning: number, steps: number): Table {
  const table = training.tables[morning].map((row) => [...row])
  for (const step of training.walks[morning].steps.slice(0, steps)) table[step.state][step.action] = step.after
  return table
}

// What an update aimed at, worked back from what it did: the score of the
// way onward that Sarsa used, given the step and the settings
export const onwardOf = (step: Step, settings: Settings) =>
  (step.before + (step.after - step.before) / settings.alpha - step.reward) / settings.gamma

// The cells a walk went through, home first
export const cellsOf = (w: Walk) => [w.steps[0].state, ...w.steps.map((step) => step.next)]

// The step the story stops on to show one update: the first, from the
// second morning on, that moves to a new corner, and on to a third, from a
// way scored −1 or less, toward a way onward scored at least half a
// minute differently, and that lands visibly apart from it, so every number in it
// is something
export function zoomStep(training: Training, settings: Settings = STORY): { morning: number; index: number } {
  for (let morning = 1; morning < training.walks.length; morning++) {
    const steps = training.walks[morning].steps
    const index = steps.findIndex((step, i) => {
      const onward = onwardOf(step, settings)
      const then = steps[i + 1]
      return (
        step.next !== step.state &&
        then !== undefined &&
        then.next !== then.state &&
        then.next !== step.state &&
        TOWN.moves[step.next].length > 0 &&
        step.before <= -1 &&
        onward <= -1 &&
        Math.abs(onward - step.before) >= 0.5 &&
        Math.abs(onward - step.after) >= 0.5
      )
    })
    if (index >= 0) return { morning, index }
  }
  return { morning: 1, index: 0 }
}
