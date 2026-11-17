import { DOMAIN, grid, type Landscape } from './model'

// Where a landscape sits in a drawing: its x along [left, right], its
// height scaled so the lowest and highest ground on DOMAIN fill [top, bottom]
export interface Box {
  left: number
  right: number
  top: number
  bottom: number
}

export function placer(landscape: Landscape, box: Box) {
  const heights = grid(321).map(landscape.f)
  const low = Math.min(...heights)
  const high = Math.max(...heights)
  const span = high - low || 1
  const x = (v: number) => box.left + ((v - DOMAIN[0]) / (DOMAIN[1] - DOMAIN[0])) * (box.right - box.left)
  const y = (v: number) => box.bottom - ((v - low) / span) * (box.bottom - box.top)
  // Back from a drawing's x to the ground's, kept on the ground
  const fromX = (px: number) =>
    Math.max(DOMAIN[0], Math.min(DOMAIN[1], DOMAIN[0] + ((px - box.left) / (box.right - box.left)) * (DOMAIN[1] - DOMAIN[0])))
  // The ground from a to b as an SVG path
  const path = (a = DOMAIN[0], b = DOMAIN[1], n = 160) =>
    grid(n, a, b)
      .map((v, i) => `${i ? 'L' : 'M'}${x(v).toFixed(1)},${y(landscape.f(v)).toFixed(1)}`)
      .join(' ')
  // The ground and everything under it, for a fill
  const under = () => `${path()} L${box.right},${box.bottom + 14} L${box.left},${box.bottom + 14} Z`
  return { x, y, fromX, path, under, at: (v: number) => ({ x: x(v), y: y(landscape.f(v)) }) }
}

// Dots piled where walkers stopped: two to a row, rising from the ground.
// `count` dots above the point (px, py), as centres.
export function pile(px: number, py: number, count: number, r = 5) {
  return Array.from({ length: count }, (_, i) => ({
    x: px + (i % 2 === 0 ? -1 : 1) * (r + 0.5),
    y: py - r - 2 - Math.floor(i / 2) * (2 * r + 1),
  }))
}
