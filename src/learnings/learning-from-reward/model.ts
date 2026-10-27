// Flipping a pancake: how hard you flick the pan decides how far it turns
// and how high it flies. All the cook ever learns is how it went.

export type Outcome = 'flipped' | 'unturned' | 'floor'

// How hard a flick can be, on a scale the figure draws
export const MIN_FLICK = 0
export const MAX_FLICK = 10

// Each unit of flick turns the pancake 36°: a flick of 5 turns it over
export const DEGREES_PER_FLICK = 36
// A flick this hard throws it off the pan
export const FLOOR_FLICK = 7.5
// Within this many degrees of a half turn, it lands the other side up
const LANDS_FLAT = 30

export const turnOf = (flick: number) => flick * DEGREES_PER_FLICK

export function outcomeOf(flick: number): Outcome {
  if (flick >= FLOOR_FLICK) return 'floor'
  return Math.abs(turnOf(flick) - 180) <= LANDS_FLAT ? 'flipped' : 'unturned'
}

// The score the kitchen gives: all the cook is ever told
export const REWARD: Record<Outcome, number> = { flipped: 1, unturned: 0, floor: -1 }

export const rewardOf = (flick: number) => REWARD[outcomeOf(flick)]

// The flicks that turn it over, for drawing the band the tries close in on
export const FLIPS_FROM = (180 - LANDS_FLAT) / DEGREES_PER_FLICK
export const FLIPS_TO = (180 + LANDS_FLAT) / DEGREES_PER_FLICK

// A dozen tries, the way a person makes them: far off at first, then
// closing in on what worked. Too soft, too hard, too soft, a little too
// much, and then flips, each a little different
export const DOZEN_TRIES = [2, 8.5, 3, 7, 3.8, 6.2, 4.6, 5.6, 4.8, 5.3, 5, 5.1]
