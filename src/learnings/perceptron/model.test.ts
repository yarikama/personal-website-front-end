import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  CHECK,
  crate,
  dot,
  guess,
  isRight,
  LAB,
  labCrate,
  MADE_ANGLE,
  margin,
  messyCrate,
  mistakeBound,
  norm,
  perceptron,
  predict,
  radius,
  rescale,
  storyCrate,
  storyMoments,
  unit,
  visits,
  weightsAfter,
  widestGap,
  worked,
  wrongCount,
  type Example,
} from './model'

const close = (a: number, b: number, digits = 9) => expect(a).toBeCloseTo(b, digits)

describe('the classifier, by hand', () => {
  it('calls a point by the sign of w · x, and the line itself no answer', () => {
    expect(predict([1, 2], [3, -1])).toBe(1)
    expect(predict([1, 2], [-3, 1])).toBe(-1)
    expect(predict([1, 2], [2, -1])).toBe(0)
    expect(predict([0, 0], [5, 5])).toBe(0)
    expect(isRight([0, 0], { x: [5, 5], y: 1 })).toBe(false)
  })

  it('measures the margin as the nearest point’s signed distance', () => {
    // w = (3, 4), |w| = 5: (1, 1) at 7/5, (−2, 0) labelled −1 at 6/5
    close(
      margin(
        [
          { x: [1, 1], y: 1 },
          { x: [-2, 0], y: -1 },
        ],
        [3, 4],
      ),
      1.2,
    )
    // A point on the wrong side makes it negative
    close(margin([{ x: [1, 1], y: -1 }], [3, 4]), -1.4)
  })

  it('measures R as the farthest point from the middle', () => {
    close(
      radius([
        { x: [3, 4], y: 1 },
        { x: [-1, 0], y: -1 },
      ]),
      5,
    )
  })

  it('puts the limit at (R/γ)², and none without a gap', () => {
    close(mistakeBound(2, 0.5), 16)
    expect(mistakeBound(1, 0)).toBe(Infinity)
    expect(mistakeBound(1, -0.1)).toBe(Infinity)
    expect(CHECK).toEqual({ r: 1.2, gamma: 0.2, before: 36, after: 144 })
  })
})

describe('the perceptron, by hand', () => {
  it('adds y x on each mistake and stops after a clean round', () => {
    // From w = 0: (2, 1) +1 is a mistake, w = (2, 1). (1, 3) −1: w · x = 5,
    // wrong, w = (1, −2). (−1, 1) −1: w · x = −3, right. Round 2: (2, 1)
    // gives 0, wrong, w = (3, −1); (1, 3) gives 0, wrong, w = (2, −4);
    // (−1, 1) gives −6, right. Round 3: (2, 1) gives 0 again, wrong,
    // w = (4, −3); then −5 and −7, right. Round 4: 5, −5, −7, all right.
    const data: Example[] = [
      { x: [2, 1], y: 1 },
      { x: [1, 3], y: -1 },
      { x: [-1, 1], y: -1 },
    ]
    const run = perceptron(data)
    expect(run.mistakes.map((m) => [m.pass, m.at])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ])
    expect(run.mistakes.map((m) => m.after)).toEqual([
      [2, 1],
      [1, -2],
      [3, -1],
      [2, -4],
      [4, -3],
    ])
    expect(run.settled).toBe(true)
    expect(run.passes).toBe(4)
    expect(weightsAfter(run, 0)).toEqual([0, 0])
    expect(weightsAfter(run, 2)).toEqual([1, -2])
    expect(wrongCount(data, weightsAfter(run, 4))).toBe(1)
    expect(wrongCount(data, weightsAfter(run, 5))).toBe(0)
  })

  it('keeps every look in order, with the weights before and after', () => {
    const data = crate(5, 30, 0.3)
    const run = perceptron(data)
    const all = visits(data, run)
    expect(all.length).toBe(run.passes * data.length)
    expect(all.filter((v) => v.wrong).length).toBe(run.mistakes.length)
    for (let i = 1; i < all.length; i++) expect(all[i].before).toEqual(all[i - 1].after)
    for (const v of all) {
      expect(v.wrong).toBe(!isRight(v.before, data[v.at]))
      if (!v.wrong) expect(v.after).toEqual(v.before)
    }
  })

  it('raises y (w · x) for the missed point by |x|² on each update', () => {
    const data = crate(9, 40, 0.1)
    const run = perceptron(data)
    for (const m of run.mistakes) {
      const { x, y } = data[m.at]
      close(y * dot(m.after, x) - y * dot(m.before, x), dot(x, x))
    }
  })
})

describe('the mistake bound, on seeded crates', () => {
  it('never makes more than (R/γ)² mistakes, γ from the line the crate was made with', () => {
    const random = seeded(1)
    for (let trial = 0; trial < 200; trial++) {
      const n = 10 + Math.floor(random() * 300)
      const gap = 0.02 + random() * 0.6
      const data = crate(1000 + trial, n, gap)
      // A known separator: the made line's arrow, of length 1
      const known = margin(data, unit(MADE_ANGLE))
      expect(known).toBeGreaterThanOrEqual(gap / 2 - 1e-12)
      const run = perceptron(data, 10_000)
      expect(run.settled).toBe(true)
      expect(run.mistakes.length).toBeLessThanOrEqual(mistakeBound(radius(data), known))
    }
  })

  it('ends with no point called wrong whenever a line splits the data', () => {
    const random = seeded(2)
    for (let trial = 0; trial < 200; trial++) {
      const data = crate(2000 + trial, 5 + Math.floor(random() * 200), 0.01 + random() * 0.5)
      const run = perceptron(data, 10_000)
      expect(run.settled).toBe(true)
      expect(wrongCount(data, weightsAfter(run, run.mistakes.length))).toBe(0)
    }
  })

  it('finds a gap at least as wide as any of many directions, checked by brute force', () => {
    const random = seeded(3)
    for (let trial = 0; trial < 60; trial++) {
      const data = crate(3000 + trial, 20 + Math.floor(random() * 60), -0.2 + random() * 0.7)
      const { angle, gamma } = widestGap(data)
      close(margin(data, unit(angle)), gamma, 12)
      for (let i = 0; i < 720; i++) {
        expect(gamma).toBeGreaterThanOrEqual(margin(data, unit((2 * Math.PI * i) / 720)) - 1e-12)
      }
    }
  })

  it('never settles on points no line through the middle splits', () => {
    // (1, 0) is +1 and (2, 0) is −1: any w calls both the same way
    const tiny: Example[] = [
      { x: [1, 0], y: 1 },
      { x: [2, 0], y: -1 },
    ]
    const run = perceptron(tiny, 500)
    expect(run.settled).toBe(false)
    expect(widestGap(tiny).gamma).toBeLessThanOrEqual(0)
    for (let pass = 0; pass < 500; pass++) expect(run.mistakes.some((m) => m.pass === pass)).toBe(true)
    // And on overlapping crates, a mistake in every one of the last rounds
    for (const seed of [1, 2, 3, 4, 5]) {
      const data = crate(seed, 60, -0.2)
      const long = perceptron(data, 400)
      expect(long.settled).toBe(false)
      expect(widestGap(data).gamma).toBeLessThan(0)
      for (let pass = 390; pass < 400; pass++) expect(long.mistakes.some((m) => m.pass === pass)).toBe(true)
    }
  })

  it('makes the same mistakes, with the same bound, when every coordinate is scaled', () => {
    const random = seeded(4)
    for (let trial = 0; trial < 50; trial++) {
      const data = crate(4000 + trial, 50, -0.1 + random() * 0.5)
      const by = 0.01 + random() * 100
      const a = perceptron(data, 300)
      const b = perceptron(rescale(data, by), 300)
      expect(b.mistakes.map((m) => [m.pass, m.at])).toEqual(a.mistakes.map((m) => [m.pass, m.at]))
      const ga = widestGap(data).gamma
      const gb = widestGap(rescale(data, by)).gamma
      if (ga > 0) close(mistakeBound(radius(rescale(data, by)), gb) / mistakeBound(radius(data), ga), 1, 6)
    }
  })
})

describe('the page’s numbers', () => {
  it('the guess: well under 50 mistakes on a thousand avocados, under a limit near 42', () => {
    const g = guess()
    expect(g.data.length).toBe(1000)
    expect(g.run.settled).toBe(true)
    expect(g.run.mistakes.length).toBeLessThan(50)
    expect(g.run.mistakes.length).toBeLessThanOrEqual(g.bound)
    expect(g.bound).toBeGreaterThan(35)
    expect(g.bound).toBeLessThan(50)
  })

  it('the story: a tidy crate that settles, a run of right calls, then an unripe one called ripe', () => {
    const tidy = storyCrate()
    expect(tidy.run.settled).toBe(true)
    expect(tidy.run.mistakes.length).toBeGreaterThanOrEqual(5)
    const { calls, mistake } = storyMoments(tidy.data, tidy.run)
    expect(calls.every((v) => !v.wrong)).toBe(true)
    const point = tidy.data[mistake.at]
    expect(point.y).toBe(-1)
    expect(predict(mistake.before, point.x)).toBe(1)
    // The story says the update carries it out of the ripe side
    expect(predict(mistake.after, point.x)).toBe(-1)
    // and the arrows, drawn at 0.7, stay in the chart
    expect(norm(mistake.after) * 0.7).toBeLessThan(1.4)
  })

  it('the messy crate never settles, with wrong calls every round', () => {
    const messy = messyCrate()
    expect(messy.run.settled).toBe(false)
    expect(messy.gamma).toBeLessThan(0)
    const looks = visits(messy.data, messy.run, 8)
    for (let pass = 0; pass < 8; pass++) {
      expect(looks.filter((v) => v.pass === pass && v.wrong).length).toBeGreaterThan(3)
    }
  })

  it('the worked crates: a wide gap, a narrow one with a far higher limit, and none', () => {
    const [wide, narrow, overlapping] = worked()
    expect(wide.bound).toBeLessThan(narrow.bound / 10)
    for (const c of [wide, narrow]) {
      expect(c.run.settled).toBe(true)
      expect(c.run.mistakes.length).toBeLessThanOrEqual(c.bound)
    }
    expect(overlapping.bound).toBe(Infinity)
    expect(overlapping.run.settled).toBe(false)
  })

  it('the lab: every gap on the slider gives points inside the chart', () => {
    for (let gap = LAB.gaps[0]; gap <= LAB.gaps[1] + 1e-9; gap += LAB.step) {
      const c = labCrate(Number(gap.toFixed(2)))
      expect(c.r).toBeLessThan(1.45)
      expect(c.run.settled).toBe(c.gamma > 0)
      if (c.gamma > 0) expect(c.run.mistakes.length).toBeLessThanOrEqual(c.bound)
    }
  })
})
