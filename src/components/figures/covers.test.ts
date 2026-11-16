import { describe, expect, it } from 'vitest'
import type { Vec2, Vec3 } from '../../lib/hairline'
import * as keepFig from './keep'
import * as rockerFig from './rocker'
import * as growFig from './grow'
import { figureOf } from '../../projects/figures'

const inFrame = ([x, y]: Vec2) => x >= 8 && x <= 392 && y >= 8 && y <= 312
const stops = (tour: ReadonlyArray<Vec2 | null>) => tour.filter((s): s is Vec2 => s !== null)

describe.each([
  ['keep', keepFig.EXTREMES, keepFig.P, keepFig.keep.tour],
  ['rocker', rockerFig.EXTREMES, rockerFig.P, rockerFig.rocker.tour],
  ['grow', growFig.EXTREMES, growFig.P, growFig.grow.tour],
] as const)('%s', (_name, extremes: readonly Vec3[], P, tour) => {
  it('keeps its most extreme pose inside the 400 × 320 frame', () => {
    for (const [x, y, z] of extremes) expect(inFrame(P(x, y, z))).toBe(true)
  })
  it('tours points inside the frame, and ends by returning to rest', () => {
    for (const s of stops(tour)) expect(inFrame(s)).toBe(true)
    expect(tour.at(-1)).toBeNull()
  })
})

describe('keep, the token pruning cover', () => {
  const kept = (h: number[]) => h.filter((v) => v > 0).length

  it('always keeps exactly a quarter of the tiles', () => {
    expect(kept(keepFig.heights(null, 1.8))).toBe(keepFig.K)
    for (const p of stops(keepFig.keep.tour)) expect(kept(keepFig.heights(keepFig.over(p), 1.8))).toBe(keepFig.K)
    expect(keepFig.K * 4).toBe(keepFig.NX * keepFig.NY)
  })

  it('keeps the camera brand at rest, and the tile under the prompt when one is asked', () => {
    const rest = keepFig.heights(null, 1.8)
    const tallest = rest.indexOf(Math.max(...rest))
    expect(tallest % keepFig.NX).toBeGreaterThanOrEqual(4)
    expect(Math.floor(tallest / keepFig.NX)).toBeLessThanOrEqual(2)
    const at = keepFig.over([146, 169])!
    const h = keepFig.heights(at, 1.8)
    expect(h[Math.floor(at[1] / 13) * keepFig.NX + Math.floor(at[0] / 13)]).toBeGreaterThan(0)
  })

  it('lets go off the image', () => {
    expect(keepFig.over([20, 20])).toBeNull()
  })
})

describe('rocker, the tool poisoning cover', () => {
  it('steers toward the closed cup on the left of the fulcrum and the leak on the right', () => {
    const [left, right, middle] = stops(rockerFig.rocker.tour)
    expect(rockerFig.heading(rockerFig.aim(left) * 10)).toBe('→ kept')
    expect(rockerFig.heading(rockerFig.aim(right) * 10)).toBe('→ leak')
    expect(rockerFig.heading(rockerFig.aim(middle) * 10)).toBe('level')
  })
})

describe('grow, the GNN scheduling cover', () => {
  it('grows with the pointer from left to right, and its lap visits three sizes', () => {
    expect(growFig.band([0, 160])).toBe(growFig.NMIN)
    expect(growFig.band([400, 160])).toBe(growFig.NMAX)
    const sizes = stops(growFig.grow.tour).map(growFig.band)
    expect(new Set(sizes).size).toBe(3)
  })
  it('raises its pillar with the count of machines', () => {
    expect(growFig.pillar(growFig.NMAX)).toBeGreaterThan(growFig.pillar(growFig.REST_N))
  })
})

describe('the featured projects', () => {
  it('each have a drawn cover', () => {
    expect(figureOf('prompt-aware-image-token-pruning')).toBe(keepFig.keep)
    expect(figureOf('defending-llm-agents-against-tool-schema-poisoning')).toBe(rockerFig.rocker)
    expect(figureOf('cross-size-generalization-gnn-job-shop-scheduling')).toBe(growFig.grow)
  })
})
