import {
  A,
  A_,
  B,
  B_,
  board,
  evaluate,
  MOVES,
  run,
  sweeps,
  uniform,
  type Policy,
  type Visit,
} from '../../components/explain/mdp'
import { seeded } from '../../components/explain/random'

// The Bellman equation on a board game: a spinner picks each move, so a
// square's worth is the average, over the four moves, of what the move pays
// plus γ times the worth of where it lands.

export const WORLD = board()
export const GAMMA = 0.9
export const FAIR = uniform(WORLD)
export const SQUARE = {
  a: WORLD.at(A),
  a_: WORLD.at(A_),
  b: WORLD.at(B),
  b_: WORLD.at(B_),
}

// How much a turn later counts, for the figure to play with
export const GAMMAS = [0.5, 0.9, 0.99] as const

const solved = new Map<number, number[]>()
// Every square's worth with the fair spinner: v_π
export function worth(gamma: number = GAMMA): number[] {
  let values = solved.get(gamma)
  if (!values) {
    values = evaluate(WORLD, FAIR, gamma)
    solved.set(gamma, values)
  }
  return values
}

// The passes of the equation from all zeros: each square becomes the
// average of its four moves, given the last pass's numbers. They stop
// once no square moves by a thousandth, and end on the exact answer.
export const PASSES = [...sweeps(WORLD, GAMMA, FAIR, 0.001).slice(0, -1), worth()]

export interface Branch {
  move: (typeof MOVES)[number]
  reward: number
  next: number
  // The worth of where it lands, and the move's worth: reward + γ·that
  there: number
  total: number
  // Into the edge: you stay where you are
  stay: boolean
}

// The four moves from `state`, each with what it is worth
export function branches(state: number, values: number[], gamma: number): Branch[] {
  return WORLD.moves[state].map((outcomes, a) => {
    const { next, reward } = outcomes[0]
    return { move: MOVES[a], reward, next, there: values[next], total: reward + gamma * values[next], stay: next === state }
  })
}

// What the spinner's chances make of the four: Σ π(a|s)·(r + γv(s′))
export const average = (state: number, values: number[], gamma: number, policy: Policy = FAIR) =>
  branches(state, values, gamma).reduce((sum, branch, a) => sum + policy[state][a] * branch.total, 0)

// ——— The story: a walk where the spinner sends you ———

export const STORY_START = WORLD.at({ x: 2, y: 2 })
export const STORY_SEED = 338
export const STORY_MOVES = 12

export const story = (): Visit[] => run(WORLD, FAIR, STORY_START, STORY_MOVES, seeded(STORY_SEED))

// The first move into the edge, and the first jump from A, by index
export const firstBump = (visits: Visit[]) => visits.findIndex((visit) => visit.reward === -1)
export const firstJump = (visits: Visit[]) => visits.findIndex((visit) => visit.reward === 10)

// "−1.3", "8.8", "+10"
export const signed = (value: number, digits = 1) => {
  const text = Math.abs(value).toFixed(digits)
  return Number(text) === 0 ? (0).toFixed(digits) : `${value < 0 ? '−' : ''}${text}`
}

// A spinner that leans: on every square, `lean` of the time it points the
// way that brings you closer to A (split between two such ways), and the
// rest of the time any of the four
export function towardA(lean = 0.7): Policy {
  return WORLD.moves.map((_, s) => {
    const { x, y } = WORLD.cell(s)
    const closer = [y > A.y, x < A.x, y < A.y, x > A.x]
    const count = closer.filter(Boolean).length
    return closer.map((c) => (count === 0 ? 0.25 : (c ? lean / count : 0) + (1 - lean) / 4))
  })
}
