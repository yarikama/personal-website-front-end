import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  batches,
  covered,
  distance,
  ETA,
  flipping,
  flipSettles,
  gradient,
  KAPPA,
  LAB_BATCHES,
  LAB_STEPS,
  labEnd,
  labPlain,
  labPlainEnd,
  labWalk,
  loss,
  MOMENTUM_ETA,
  NOISE,
  normal,
  perStride,
  START,
  steady,
  steadySettles,
  STORY,
  STORY_BATCHES,
  storyAway,
  storyCovered,
  strideAcross,
  strideAlong,
  STRIDES,
  tilt,
  velocityAfter,
  walk,
  weightOf,
} from './model'

describe('the valley', () => {
  it('is gentle along the floor and steep across it', () => {
    expect(loss({ x: 2, y: 0 })).toBe(2)
    expect(loss({ x: 0, y: 0.1 })).toBeCloseTo(0.5 * KAPPA * 0.01, 12)
    expect(gradient({ x: -10, y: 0.5 })).toEqual({ x: -10, y: 100 })
  })

  it('takes a step size that settles plain steps, but only just across', () => {
    expect(ETA * KAPPA).toBeLessThan(2)
    expect(ETA * KAPPA).toBeGreaterThan(1.8)
  })
})

describe('a walk with momentum', () => {
  it('works out by hand for its first two steps', () => {
    const { path, velocity } = walk(0.9, 2)
    // v₁ = g(start) = (−10, 30); w₁ = start − 0.0095 v₁
    expect(velocity[0]).toEqual({ x: -10, y: 30 })
    expect(path[1].x).toBeCloseTo(-9.905, 12)
    expect(path[1].y).toBeCloseTo(-0.135, 12)
    // v₂ = 0.9 v₁ + g(w₁) = (−9 − 9.905, 27 − 27)
    expect(velocity[1].x).toBeCloseTo(-18.905, 12)
    expect(velocity[1].y).toBeCloseTo(0, 12)
    expect(path[2].x).toBeCloseTo(-9.905 + 0.0095 * 18.905, 12)
    expect(path[2].y).toBeCloseTo(-0.135, 12)
  })

  it('is plain gradient descent at β = 0: each axis shrinks by 1 − ηλ a step', () => {
    const { path } = walk(0, 40)
    path.forEach((p, k) => {
      expect(p.x).toBeCloseTo((1 - ETA) ** k * START.x, 10)
      expect(p.y).toBeCloseTo((1 - ETA * KAPPA) ** k * START.y, 10)
    })
  })

  it('follows the heavy-ball recurrence on each axis, for random settings', () => {
    const random = seeded(646)
    for (let trial = 0; trial < 200; trial++) {
      const beta = 0.99 * random()
      const eta = 0.009 * random()
      const start = { x: -20 * random(), y: 2 * random() - 1 }
      const { path } = walk(beta, 30, [], start, eta)
      // w_{k+1} = (1 + β − ηλ) w_k − β w_{k−1}, with w₁ = (1 − ηλ) w₀
      for (const [axis, curve] of [['x', 1], ['y', KAPPA]] as const) {
        let before = start[axis]
        let now = (1 - eta * curve) * before
        expect(path[1][axis]).toBeCloseTo(now, 9)
        for (let k = 2; k <= 30; k++) {
          const next = (1 + beta - eta * curve) * now - beta * before
          before = now
          now = next
          expect(path[k][axis]).toBeCloseTo(now, 9)
        }
      }
    }
  })
})

describe('what the velocity settles to', () => {
  it('piles up to 1/(1 − β) for a steady gradient, and shrinks to 1/(1 + β) for a flipping one', () => {
    expect(steady(0.9)).toBeCloseTo(10, 12)
    expect(steady(0.5)).toBe(2)
    expect(flipping(0.9)).toBeCloseTo(0.526, 3)
    expect(tilt(0.5)).toBeCloseTo(3, 12)
    expect(tilt(0.9)).toBeCloseTo(19, 10)
    expect(tilt(0.99)).toBeCloseTo(199, 8)
    expect(weightOf(0.9, 10)).toBeCloseTo(0.349, 3)
  })

  it('matches running the update, against the closed-form sums, for random β', () => {
    const random = seeded(17)
    for (let trial = 0; trial < 300; trial++) {
      const beta = 0.99 * random()
      const g = 10 * random() - 5
      const n = 1 + Math.floor(200 * random())
      const same = Array.from({ length: n }, () => g)
      const flips = Array.from({ length: n }, (_, k) => (k % 2 === 0 ? g : -g))
      // g(1 + β + … + β^{n−1}), and the same with alternating signs ending on the last gradient
      expect(velocityAfter(beta, same)).toBeCloseTo((g * (1 - beta ** n)) / (1 - beta), 8)
      const last = flips[n - 1]
      expect(velocityAfter(beta, flips)).toBeCloseTo((last * (1 - (-beta) ** n)) / (1 + beta), 8)
    }
    // After many steps the sums reach their limits
    expect(velocityAfter(0.9, Array(400).fill(1))).toBeCloseTo(steady(0.9), 10)
    expect(Math.abs(velocityAfter(0.9, Array.from({ length: 400 }, (_, k) => (k % 2 ? -1 : 1))))).toBeCloseTo(
      flipping(0.9),
      10,
    )
  })
})

describe('mini-batch noise', () => {
  it('draws standard normal numbers', () => {
    const random = seeded(3)
    const draws = Array.from({ length: 20000 }, () => normal(random))
    const mean = draws.reduce((a, b) => a + b, 0) / draws.length
    const variance = draws.reduce((a, b) => a + (b - mean) ** 2, 0) / draws.length
    expect(Math.abs(mean)).toBeLessThan(0.03)
    expect(variance).toBeCloseTo(1, 1)
  })

  it('gives each mini-batch its spread along and across, the same for the same seed', () => {
    const errors = batches(5, 20000)
    const sd = (values: number[]) => Math.sqrt(values.reduce((a, b) => a + b * b, 0) / values.length)
    expect(sd(errors.map((e) => e.x))).toBeCloseTo(NOISE.x, 1)
    expect(sd(errors.map((e) => e.y)) / NOISE.y).toBeCloseTo(1, 1)
    expect(batches(5, 3)).toEqual(errors.slice(0, 3))
    expect(STORY_BATCHES).toHaveLength(STRIDES)
    expect(LAB_BATCHES).toHaveLength(LAB_STEPS)
  })
})

describe('the story', () => {
  it('walks a third of the way, and the sledge, at half the step, ends under 1 m away', () => {
    expect(MOMENTUM_ETA).toBe(ETA / 2)
    expect(Math.round(distance(START))).toBe(10)
    expect(storyCovered(STORY.exact)).toBe(32)
    expect(storyAway(STORY.plain)).toBeCloseTo(6.8, 1)
    expect(storyAway(STORY.momentum)).toBeLessThan(1)
    expect(covered(START)).toBe(0)
  })

  it('walking goes mostly across; the sledge goes mostly along, and swings less', () => {
    const walking = perStride(STORY.plain, STRIDES)
    const sledge = perStride(STORY.momentum, STRIDES)
    expect(walking.y / walking.x).toBeGreaterThan(3)
    expect(sledge.x / sledge.y).toBeGreaterThan(3)
    expect(sledge.x / walking.x).toBeGreaterThan(2.5)
    expect(sledge.y / walking.y).toBeLessThan(0.35)
    const widest = (w: typeof STORY.plain) => Math.max(...w.path.slice(3).map((p) => Math.abs(p.y)))
    expect(widest(STORY.momentum)).toBeLessThan(widest(STORY.plain) / 2)
    expect(perStride(STORY.plain, 0)).toEqual({ x: 0, y: 0 })
  })

  it('half the step and β = 0.9 make a stride 5 along and about a quarter across', () => {
    expect(strideAlong(0.9)).toBeCloseTo(5, 12)
    expect(strideAcross(0.9)).toBeCloseTo(0.263, 3)
  })
})

describe('the lab', () => {
  it('arrives near β = 0.9, and does worse with too little or too much', () => {
    expect(labPlainEnd()).toBeCloseTo(5.6, 1)
    // Half the step and no momentum is slower than plain steps
    expect(labEnd(0)).toBeGreaterThan(labPlainEnd())
    expect(labEnd(0.5)).toBeCloseTo(5.7, 1)
    expect(labEnd(0.9)).toBeLessThan(0.3)
    expect(labEnd(0.99)).toBeGreaterThan(2)
    expect(labWalk(0.9, 'Exact').path).toHaveLength(LAB_STEPS + 1)
  })

  it('with mini-batches, momentum still ends far closer than plain steps', () => {
    expect(distance(labWalk(0.9, 'Mini-batch').path[LAB_STEPS])).toBeLessThan(0.6)
    expect(distance(labPlain('Mini-batch').path[LAB_STEPS])).toBeGreaterThan(5)
  })
})

describe('check yourself', () => {
  it('the steady weight moves about three times as far', () => {
    expect(steadySettles).toBeCloseTo(5, 12)
    expect(flipSettles).toBeCloseTo(1.58, 2)
    expect(Math.round(steadySettles / flipSettles)).toBe(3)
  })
})
