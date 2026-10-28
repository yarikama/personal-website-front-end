import { discounted, forever } from '../../components/explain/mdp'

// The return: all the reward still to come, each step further off counted
// at γ times the one before. A task that never ends needs γ below 1 for the
// sum to stay finite; one that ends can add up plainly.

export { discounted, forever }

// What a reward k steps off is worth now, k from 0: γ^k
export const weight = (gamma: number, k: number) => gamma ** k

// A reward of 1 every step: what the first n are worth now
export const pile = (gamma: number, n: number) =>
  gamma === 1 ? n : (1 - gamma ** n) / (1 - gamma)

// The steps within which half of a stream's whole worth arrives: the least
// n with 1 − γⁿ ≥ ½. (0 when only the first step counts.)
export const halfWithin = (gamma: number) => (gamma === 0 ? 1 : Math.ceil(Math.log(0.5) / Math.log(gamma)))

// How far ahead γ looks, roughly: 1 / (1 − γ) steps
export const horizon = (gamma: number) => forever(gamma)

export const GAMMAS = [0, 0.5, 0.9, 0.99] as const
export const GAMMA = 0.9
// Steps the stream figure draws
export const DAYS = 40

// ——— Episodes: two ways out of a maze ———

// Moves to the exit on each route; leaving pays 1, then the episode is over
export const SHORT = 6
export const LONG = 20
export const ROUTE_GAMMAS = [1, 0.99, 0.9] as const

// The rewards of a route of `moves` moves: 0, 0, …, then 1 on the last
export const route = (moves: number) => Array.from({ length: moves }, (_, i) => (i === moves - 1 ? 1 : 0))

// ——— A pole that falls: −1 when it does, 0 on every other step ———

export const fall = (steps: number, gamma: number) => discounted(route(steps).map((r) => -r), gamma)

// "0.59", "10", "∞"
export function show(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '∞'
  // 1 / (1 − 0.9) is 10.000000000000002 in floating point
  const near = Math.round(value * 1e6) / 1e6
  return `${near < 0 ? '−' : ''}${Number.isInteger(near) ? Math.abs(near) : Math.abs(near).toFixed(digits)}`
}
