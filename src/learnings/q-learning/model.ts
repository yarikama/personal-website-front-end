import { gridworld, type Cell } from '../../components/explain/mdp'
import { seeded } from '../../components/explain/random'
import { averageTotals, route, smooth, train, type Method, type Settings, type Training } from '../../components/explain/gridLearning'

// The walk to the station along a river with no railing. The quickest way
// runs right along the edge; a random step there can land you in the water.
// Sarsa scores the ways you really take, random steps included, and learns
// to keep away from the edge. Q-learning scores each way by the best way on
// from where it lands, as if you'll never step at random again, and learns
// the edge: quickest once you stop exploring, wetter while you still do.

export const WIDTH = 7
export const HOME: Cell = { x: 0, y: 2 }
export const STATION: Cell = { x: WIDTH - 1, y: 2 }
// Falling in ends the walk: you go home to change, the worst morning there is
export const WET = -100
export const RIVERSIDE = gridworld({
  width: WIDTH,
  height: 4,
  ends: [...Array.from({ length: WIDTH }, (_, x) => ({ at: { x, y: 3 }, reward: WET })), { at: STATION, reward: -1 }],
  step: -1,
  bump: -1,
})
export const START = RIVERSIDE.at(HOME)
// A walk that ends in the river pays at least this little
export const BAD = WET / 2

// The two ways to go, in minutes: along the edge, and along the far street,
// two blocks back from the water
export const EDGE = WIDTH - 1
export const FAR = WIDTH + 3

export const STORY: Settings = { epsilon: 0.1, alpha: 0.5, gamma: 1 }
export const MORNINGS = 500
// Seeds whose runs end on the routes the two methods settle on in general
// (see model.test.ts): the far street for Sarsa, the edge for Q-learning
export const SEEDS = { sarsa: 6, q: 6 }

export const learn = (method: Method, seed: number, settings: Settings = STORY, count = MORNINGS): Training =>
  train(RIVERSIDE, method, settings, START, count, seeded(seed), BAD, true)

export const story = () => ({ you: learn('sarsa', SEEDS.sarsa), friend: learn('q', SEEDS.q) })

// The route a learner has settled on, once it stops stepping at random
export const settled = (training: Training) => route(RIVERSIDE, training.tables.at(-1)!, START)

export const wetMornings = (training: Training) => training.walks.filter((w) => w.bad).length

// Which mornings ended in the river, from 0
export const wetWhen = (training: Training) => training.walks.flatMap((w, i) => (w.bad ? [i] : []))

// What each morning paid on average over many learners, and how often it
// ended in the river, smoothed: what a method does in general
export const EPSILONS = [0.05, 0.1, 0.2] as const
export const RUNS = 40

export function curves(method: Method, epsilon: number) {
  const { totals, bad } = averageTotals(RIVERSIDE, method, { ...STORY, epsilon }, START, MORNINGS, RUNS, 1000, BAD)
  return { totals: smooth(totals, 15), wet: bad }
}

// The share of mornings that ended wet, over the last `last` of them
export const lateWet = (wet: number[], last = 100) => wet.slice(-last).reduce((sum, w) => sum + w, 0) / last
