// How many of `disks` die on an average day, when each lasts `years` on
// average (its mean time to failure)
export const deathsPerDay = (disks: number, years: number) => disks / (years * 365)

// A day's count of something that happens `rate` times a day on average,
// independently (a Poisson draw, by Knuth's method)
export function poisson(random: () => number, rate: number): number {
  const limit = Math.exp(-rate)
  let count = 0
  let product = random()
  while (product > limit) {
    count += 1
    product *= random()
  }
  return count
}

// A year of days, each with how many disks died that day
export const year = (random: () => number, rate: number, days = 364) =>
  Array.from({ length: days }, () => poisson(random, rate))

// Whether unit `i` has a fault at moment `tick`, each unit independently
// with chance `chance`: the same answer for the same unit and moment, so an
// animation can ask again on every frame
export function faulty(i: number, tick: number, chance: number): boolean {
  let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(tick + 1, 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  h ^= h >>> 12
  return (h >>> 0) / 4294967296 < chance
}
