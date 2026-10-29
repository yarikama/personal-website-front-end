import { seeded } from '../../components/explain/random'

// Snakes and ladders on a board of 20 squares, and learning how many turns a
// game still takes from each square by playing games and averaging: Monte
// Carlo prediction, with the dice as the policy.

export const FINISH = 20
export const DIE = 6
export const START = 1

// Where a ladder's foot or a snake's head sends you. You never stand on
// these squares: you land, and move on at once.
export const LADDERS: Record<number, number> = { 3: 13, 5: 15 }
export const SNAKES: Record<number, number> = { 14: 4, 17: 7 }
const JUMPS: Record<number, number> = { ...LADDERS, ...SNAKES }

// The squares a turn can start on: every one before the finish, except the
// foot of a ladder and the head of a snake
export const SQUARES = Array.from({ length: FINISH - 1 }, (_, i) => i + 1).filter((square) => !(square in JUMPS))

// Where a roll takes you: forward by the roll, no further than the finish,
// then up a ladder or down a snake if you landed on one
export function land(square: number, roll: number): number {
  const to = Math.min(FINISH, square + roll)
  return JUMPS[to] ?? to
}

// One game: the squares you stand on at the start of each turn, from the
// first square to the finish. `game.length - 1` turns.
export type Game = number[]

export function gameFromRolls(rolls: number[]): Game {
  const game = [START]
  for (const roll of rolls) {
    const at = game[game.length - 1]
    if (at === FINISH) break
    game.push(land(at, roll))
  }
  return game
}

export function playGame(random: () => number): Game {
  const game = [START]
  while (game[game.length - 1] !== FINISH) game.push(land(game[game.length - 1], 1 + Math.floor(random() * DIE)))
  return game
}

// Every square the token touches in a game, in order: where each roll
// lands, then where a ladder or snake takes it. For drawing the moves.
export function waypoints(rolls: number[]): number[] {
  const points = [START]
  let at = START
  for (const roll of rolls) {
    if (at === FINISH) break
    const landed = Math.min(FINISH, at + roll)
    points.push(landed)
    at = land(at, roll)
    if (at !== landed) points.push(at)
  }
  return points
}

export const playGames = (random: () => number, count: number): Game[] =>
  Array.from({ length: count }, () => playGame(random))

// What one game teaches: for each turn, the square you stood on and how many
// turns it then took to finish (the return, counted in turns). With
// `firstVisit`, a square you stood on twice gives only its first count.
export interface Sample {
  square: number
  left: number
}

export function samples(game: Game, firstVisit = false): Sample[] {
  const turns = game.length - 1
  const seen = new Set<number>()
  const out: Sample[] = []
  game.slice(0, -1).forEach((square, turn) => {
    if (firstVisit && seen.has(square)) return
    seen.add(square)
    out.push({ square, left: turns - turn })
  })
  return out
}

// Each square's running average of the counts it has seen, and how many
export interface Estimate {
  mean: number
  count: number
}

export const noEstimates = (): Estimate[] => Array.from({ length: FINISH + 1 }, () => ({ mean: 0, count: 0 }))

// The update: new = old + (1 / n) × (count − old), which keeps the exact
// average without storing every count
export const average = (old: number, sample: number, n: number) => old + (sample - old) / n

export function learn(estimates: Estimate[], game: Game, firstVisit = false): Estimate[] {
  const next = estimates.map((estimate) => ({ ...estimate }))
  for (const { square, left } of samples(game, firstVisit)) {
    const estimate = next[square]
    estimate.count += 1
    estimate.mean = average(estimate.mean, left, estimate.count)
  }
  return next
}

export const learnAll = (games: Game[], firstVisit = false): Estimate[] =>
  games.reduce((estimates, game) => learn(estimates, game, firstVisit), noEstimates())

// The true number of turns left from each square, worked out from the
// board's rules (which the averages never look at): a square is one turn
// plus the average over the six rolls of where each lands. Repeated until
// it stops changing.
export function turnsLeft(): number[] {
  const values = Array<number>(FINISH + 1).fill(0)
  for (let pass = 0; pass < 10_000; pass++) {
    let change = 0
    for (const square of SQUARES) {
      let total = 0
      for (let roll = 1; roll <= DIE; roll++) total += values[land(square, roll)]
      const value = 1 + total / DIE
      change = Math.max(change, Math.abs(value - values[square]))
      values[square] = value
    }
    if (change < 1e-12) break
  }
  return values
}

export const TRUE = turnsLeft()

// How far the averages are from the truth, over the squares that have been
// stood on at least once: the mean of the misses, in turns
export function meanMiss(estimates: Estimate[]): number {
  const seen = SQUARES.filter((square) => estimates[square].count > 0)
  if (!seen.length) return 0
  return seen.reduce((total, square) => total + Math.abs(estimates[square].mean - TRUE[square]), 0) / seen.length
}

// The story's first two games, rolled by hand: the first climbs to 13, is
// bitten back to 7 and stands there twice; the second climbs a ladder to 15
// and is bitten back to 7 too
export const STORY_ROLLS = [
  [6, 6, 4, 5, 6, 2],
  [4, 2, 6, 6, 1],
]
export const STORY_GAMES = STORY_ROLLS.map(gameFromRolls)

// The story's hundred games after those, and the run of games the figure
// to play with starts from
export const STORY_SEED = 7
export const STORY_COUNT = 100
export const PLAY_SEED = 3

// The story's hundred more games, and every square's averages after each,
// from the two games by hand on
export const STORY_MORE = playGames(seeded(STORY_SEED), STORY_COUNT)
export const STORY_AFTER: Estimate[][] = STORY_MORE.reduce<Estimate[][]>(
  (all, game) => [...all, learn(all[all.length - 1], game)],
  [learnAll(STORY_GAMES)]
)

// The guess at the top: from the first square a game takes about 6.7 turns,
// with a spread of about 4.1, so an average of n games is typically off by
// 4.1 / √n: half a turn after about 70 games
export const GUESS_GAMES = 70
export const typicalMiss = (spread: number, games: number) => spread / Math.sqrt(games)
