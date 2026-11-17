import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  bendsDown,
  bendValues,
  BOWL,
  chordGap,
  chordTest,
  CREASE,
  DENT,
  DENT_DIP,
  DENT_LOWEST,
  dentTrapped,
  descend,
  DOMAIN,
  family,
  FLAT_BOTTOM,
  FRIENDS,
  LAB_STARTS,
  LARGER,
  leastBend,
  LOPSIDED,
  lowest,
  lowestBasinShare,
  minima,
  one,
  pokes,
  ROPE_WORKED,
  SECOND_VALLEY,
  STORY_START,
  STORY_STARTS,
  STRIDE,
  trapped,
  WORKED_BENDS,
  type Landscape,
} from './model'

const CONVEX = [BOWL, FLAT_BOTTOM, LOPSIDED, CREASE, LARGER, family(0), family(0.5), family(1)]
const NOT_CONVEX = [DENT, family(-1.5), family(-0.5), family(-0.1)]

describe('the rope (the chord)', () => {
  it('sits exactly on a straight line', () => {
    const line = (x: number) => 3 * x - 2
    for (const theta of [0, 0.25, 0.5, 1]) expect(chordGap(line, -1, 1.5, theta)).toBeCloseTo(0, 12)
  })

  it('is above x² by θ(1 − θ)(x − y)², worked by hand', () => {
    // x = −1, y = 1, θ = ½: the ground at 0 is 0, the rope at 1
    expect(chordGap(BOWL.f, -1, 1, 0.5)).toBeCloseTo(-1)
    expect(chordGap(BOWL.f, 0, 1, 0.25)).toBeCloseTo(-0.25 * 0.75)
  })

  it('has ground above it across the dent’s hump, as the page works out', () => {
    expect(ROPE_WORKED.left).toBeCloseTo(-1.8)
    expect(ROPE_WORKED.right).toBeCloseTo(-0.2)
    expect(ROPE_WORKED.rope).toBeCloseTo(-1)
    expect(ROPE_WORKED.ground).toBeCloseTo(0)
    expect(one(ROPE_WORKED.rope)).toBe('−1.0')
    expect(one(ROPE_WORKED.ground)).toBe('0')
    expect(pokes(DENT.f, -1, 1).length).toBe(1)
  })

  it('never has ground above it on a convex function', () => {
    const random = seeded(1)
    for (const landscape of CONVEX) {
      for (let i = 0; i < 300; i++) {
        const x = DOMAIN[0] + random() * 3.2
        const y = DOMAIN[0] + random() * 3.2
        expect(chordGap(landscape.f, x, y, random())).toBeLessThanOrEqual(1e-9)
        expect(pokes(landscape.f, x, y)).toEqual([])
      }
    }
  })
})

describe('the chord test agrees with the second-derivative test', () => {
  const agree = (landscape: Landscape) => {
    const byRope = chordTest(landscape.f) <= 1e-9
    const byBend = leastBend(landscape) >= 0
    expect(byRope, landscape.name).toBe(byBend)
    return byRope
  }

  it('on the page’s functions', () => {
    for (const landscape of CONVEX) expect(agree(landscape)).toBe(true)
    for (const landscape of NOT_CONVEX) expect(agree(landscape)).toBe(false)
  })

  it('at every setting of the lab’s slider, convex exactly when b ≥ 0', () => {
    for (const b of bendValues()) expect(agree(family(b))).toBe(b >= 0)
  })

  it('on seeded random quartics a·x⁴ + c·x² + d·x', () => {
    const random = seeded(2)
    for (let i = 0; i < 100; i++) {
      const a = random() * 2
      const c = -2 + random() * 4
      const d = -1 + random() * 2
      // Keep clear of the edge, where a sampled grid can't see a sliver of
      // bending down
      if (Math.abs(c) < 0.15) continue
      agree({ name: `${a}x⁴ + ${c}x² + ${d}x`, f: (x) => a * x ** 4 + c * x * x + d * x, bend: (x) => 12 * a * x * x + 2 * c })
    }
  })

  it('and the strip of bending down is where f″ < 0', () => {
    expect(bendsDown(BOWL)).toEqual([])
    const [[from, to]] = bendsDown(DENT)
    // 12x² − 4 < 0 for |x| < 1/√3
    expect(from).toBeCloseTo(-1 / Math.sqrt(3), 1)
    expect(to).toBeCloseTo(1 / Math.sqrt(3), 1)
  })

  it('gives the worked bends', () => {
    expect(WORKED_BENDS.map((w) => [w.bend, w.convex])).toEqual([
      [2, true],
      [0, true],
      [-4, false],
    ])
  })
})

describe('the walker who only goes downhill', () => {
  it('stops where the ground is flat', () => {
    const way = descend(BOWL.f, STORY_START)
    expect(way[0]).toBe(STORY_START)
    expect(Math.abs(way.at(-1)!)).toBeLessThanOrEqual(STRIDE)
    for (let i = 1; i < way.length; i++) expect(BOWL.f(way[i])).toBeLessThan(BOWL.f(way[i - 1]))
  })

  it('reaches the lowest point from any start on a convex function', () => {
    for (const landscape of CONVEX) {
      const best = lowest(landscape.f)
      const random = seeded(3)
      for (let i = 0; i < 100; i++) {
        const start = DOMAIN[0] + random() * 3.2
        const end = descend(landscape.f, start).at(-1)!
        expect(trapped(landscape.f, end), `${landscape.name} from ${start}`).toBe(false)
        expect(Math.abs(end - best.x)).toBeLessThanOrEqual(STRIDE + 1e-3)
      }
    }
  })

  it('gets stuck in the dent from the story’s start', () => {
    const end = descend(DENT.f, STORY_START).at(-1)!
    expect(trapped(DENT.f, end)).toBe(true)
    expect(Math.abs(end - DENT_DIP.x)).toBeLessThanOrEqual(STRIDE)
    // The two flat spots of x⁴ − 2x² + 0.8x
    expect(DENT_LOWEST.x).toBeCloseTo(-1.088, 2)
    expect(DENT_DIP.x).toBeCloseTo(0.884, 1)
  })

  it('can be stuck on ground that is not convex, or not', () => {
    expect(minima(family(-2).f)).toHaveLength(2)
    expect(minima(family(-1.2).f)).toHaveLength(1)
    expect(SECOND_VALLEY).toBe(-1.3)
    // Not convex, one valley: nobody is stuck
    expect(LAB_STARTS.some((s) => trapped(family(-0.5).f, descend(family(-0.5).f, s).at(-1)!))).toBe(false)
  })
})

describe('the story’s crowd', () => {
  it('all reach the bottom of the bowl', () => {
    expect(STORY_STARTS).toHaveLength(FRIENDS)
    for (const s of STORY_STARTS) expect(trapped(BOWL.f, descend(BOWL.f, s).at(-1)!)).toBe(false)
  })

  it('is stuck in the dent as often as its basin says', () => {
    const share = 1 - lowestBasinShare(DENT.f)
    expect(share).toBeGreaterThan(0.4)
    expect(share).toBeLessThan(0.47)
    expect(dentTrapped).toBe(Math.round(share * FRIENDS))
    expect(dentTrapped).toBe(9)
  })

  it('matches the basin over many seeded starts', () => {
    const random = seeded(4)
    let stuck = 0
    const n = 2000
    for (let i = 0; i < n; i++) {
      const start = DOMAIN[0] + random() * 3.2
      if (trapped(DENT.f, descend(DENT.f, start).at(-1)!)) stuck++
    }
    expect(stuck / n).toBeCloseTo(1 - lowestBasinShare(DENT.f), 1)
  })
})
