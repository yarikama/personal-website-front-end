// What it costs to carry `load` (in multiples of today's), the two ways,
// in multiples of today's machine. Illustrative shapes, not prices: a bigger
// machine costs more than in proportion and stops at the biggest one made;
// more machines cost in proportion, plus the fixed cost of making many
// machines work as one.

// The biggest machine on sale, in multiples of today's
export const BIGGEST = 16

// One machine big enough for `load`, or null if none is made that big
export const scaleUpCost = (load: number) => (load > BIGGEST ? null : load ** 1.6)

// Enough of today's machines for `load`, and the work of running them as one
export const scaleOutCost = (load: number) => 2 + 1.1 * Math.ceil(load)

// The smallest load at which more machines cost less than a bigger one
export function crossover(): number {
  for (let load = 1; load <= BIGGEST; load += 0.1) {
    const up = scaleUpCost(load)
    if (up !== null && scaleOutCost(load) < up) return Math.round(load * 10) / 10
  }
  return BIGGEST
}
