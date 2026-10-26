// A seeded random number generator (mulberry32): the same seed gives the
// same numbers, so a figure opens the same way every time and a test can
// count on what it draws. Each call returns a number in [0, 1).
export function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A number between `low` and `high`, from `random`
export const between = (random: () => number, low: number, high: number) => low + random() * (high - low)
