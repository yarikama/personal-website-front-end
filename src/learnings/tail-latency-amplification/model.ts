import { between } from '../../components/explain/random'

// A call (or a page) slower than this counts as slow
export const SLOW_MS = 300

// The chance a page is slow when it waits on n calls, each slow with
// chance p: it is fast only if every call is
export const slowChance = (p: number, n: number) => 1 - (1 - p) ** n

// One call's response time: 20 to 80 ms, mostly near 20; with chance p a
// pause (a garbage collection, a lost packet, a busy disk) makes it 400 to
// 900 ms
export function sampleCall(random: () => number, p: number): number {
  return random() < p ? between(random, 400, 900) : 20 + 60 * random() ** 2
}

// The response times of the n calls behind one page
export const samplePage = (random: () => number, p: number, n: number) =>
  Array.from({ length: n }, () => sampleCall(random, p))

// Whether each of `count` pages (or dinners) of n calls (or guests) was
// slow: had at least one call slower than SLOW_MS
export const slowPages = (random: () => number, p: number, n: number, count: number) =>
  Array.from({ length: count }, () => Math.max(...samplePage(random, p, n)) > SLOW_MS)

// The dinner the story tells is the same model, read in minutes: a call of
// 20 to 80 ms is a friend 2 to 8 minutes after the hour, a slow one of 400
// to 900 ms a friend 40 to 90 minutes late, and SLOW_MS is half an hour
export const MS_PER_MINUTE = 10

// "1%" for 0.01, "0.1%" for 0.001
export const percent = (p: number) => `${Number((p * 100).toFixed(1))}%`
