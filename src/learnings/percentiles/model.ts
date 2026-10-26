import { between } from '../../components/explain/random'

export const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length

// The value that a fraction `q` of the values are at or below: sort them,
// and take the one at that rank (rounding the rank up). The median is q = 0.5.
export function percentile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)]
}

// The story's ten coffee orders, in minutes, in the order they were served:
// nine near two minutes, and one while the machine was jammed
export const COFFEE = [2.1, 1.8, 2.4, 2.0, 20, 1.9, 2.2, 2.3, 1.7, 2.0]

// A server's response times in ms: mostly 20 to 80, now and then 300 to 900
export function sampleResponses(random: () => number, count: number): number[] {
  return Array.from({ length: count }, () =>
    random() < 0.03 ? between(random, 300, 900) : 20 + 60 * random() ** 2
  )
}

// The same responses with the slowest one replaced by `slowest` ms
export function withSlowest(values: number[], slowest: number): number[] {
  const at = values.indexOf(Math.max(...values))
  return values.map((value, i) => (i === at ? slowest : value))
}
