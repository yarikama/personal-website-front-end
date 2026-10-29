import {
  A,
  A_,
  B,
  B_,
  actionValues,
  board,
  evaluate,
  greedy,
  greedyPolicy,
  MOVES,
  optimal,
  run,
  uniform,
  type Visit,
} from '../../components/explain/mdp'
import { seeded } from '../../components/explain/random'

// The best you can do on the board: v*, where each square is worth its best
// move's reward plus γ times the best worth of where it lands, and the
// moves that reach it, found by looking one step ahead.

export const WORLD = board()
export const GAMMA = 0.9
export const GAMMAS = [0.5, 0.9, 0.99] as const
export const SQUARE = {
  a: WORLD.at(A),
  a_: WORLD.at(A_),
  b: WORLD.at(B),
  b_: WORLD.at(B_),
}

const solved = new Map<number, number[]>()
// v*: every square's worth with the best play
export function best(gamma: number = GAMMA): number[] {
  let values = solved.get(gamma)
  if (!values) {
    values = optimal(WORLD, gamma)
    solved.set(gamma, values)
  }
  return values
}

// What A was worth with a fair spinner choosing, on the page before
export const spinnerA = () => evaluate(WORLD, uniform(WORLD), GAMMA)[SQUARE.a]

// The best moves from every square, one step ahead on v*: ties all kept
export const bestMoves = (gamma: number = GAMMA) => greedy(WORLD, best(gamma), gamma)

export interface Option {
  move: (typeof MOVES)[number]
  reward: number
  there: number
  total: number
  stay: boolean
  best: boolean
}

// The four moves from `state`, each worth its reward plus γ·v*(where it
// lands), with the best marked
export function options(state: number, gamma: number): Option[] {
  const values = best(gamma)
  const worth = actionValues(WORLD, values, gamma, state)
  const top = Math.max(...worth)
  return WORLD.moves[state].map((outcomes, a) => {
    const { next, reward } = outcomes[0]
    return { move: MOVES[a], reward, there: values[next], total: worth[a], stay: next === state, best: worth[a] >= top - 1e-6 }
  })
}

// 10 every `every` turns, for ever: 10 + γ^every·10 + γ^(2·every)·10 + …
export const loop = (pay: number, every: number, gamma: number) => pay / (1 - gamma ** every)

// Squares, other than B, whose best moves head for B rather than A: where
// following the arrows reaches B first
export function headsForB(gamma: number): number[] {
  const policy = greedyPolicy(WORLD, best(gamma), gamma)
  return WORLD.names.flatMap((_, s) => {
    if (s === SQUARE.b) return []
    const visits = run(WORLD, policy, s, 12, () => 0)
    const first = visits.find((visit) => visit.state === SQUARE.a || visit.state === SQUARE.b)
    return first?.state === SQUARE.b ? [s] : []
  })
}

// ——— The story: from A′, the best play, round and round ———

export const STORY_MOVES = 15
export const story = (): Visit[] => run(WORLD, greedyPolicy(WORLD, best(), GAMMA), SQUARE.a_, STORY_MOVES, seeded(1))

// "24.4", "−1.3"
export const signed = (value: number, digits = 1) => {
  const text = Math.abs(value).toFixed(digits)
  return Number(text) === 0 ? (0).toFixed(digits) : `${value < 0 ? '−' : ''}${text}`
}

// How many states some games have, for the last section
export const SIZES = [
  { label: 'This board', value: '25' },
  { label: 'Tic-tac-toe', value: '5,478' },
  { label: 'Backgammon', value: '~10²⁰' },
]
