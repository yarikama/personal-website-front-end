import { between } from '../../components/explain/random'

// A call (or a page) slower than this counts as slow
export const SLOW_MS = 300

// The chance a page is slow when it waits on n calls, each slow with
// chance p: it is fast only if every call is
export const slowChance = (p: number, n: number) => 1 - (1 - p) ** n

// How often each of n calls must be fast for a page to be slow at most
// `target` of the time: as a percentile, 0.9999 for p99.99
export const neededPercentile = (target: number, n: number) => (1 - target) ** (1 / n)

// One call's response time: 20 to 80 ms, mostly near 20; with chance p a
// pause (a garbage collection, a lost packet, a busy disk) makes it 400 to
// 900 ms
export function sampleCall(random: () => number, p: number): number {
  return random() < p ? between(random, 400, 900) : 20 + 60 * random() ** 2
}

// The response times of the n calls behind one page
export const samplePage = (random: () => number, p: number, n: number) =>
  Array.from({ length: n }, () => sampleCall(random, p))

// "1%" for 0.01, "0.1%" for 0.001
export const percent = (p: number) => `${Number((p * 100).toFixed(1))}%`

// "p99.99" for 0.9999, "p99" for 0.99
export const percentileName = (fraction: number) => `p${Number((fraction * 100).toFixed(2))}`
