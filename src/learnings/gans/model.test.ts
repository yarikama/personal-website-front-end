import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  CHECK_FAKES,
  CHECK_MOST,
  chanceReal,
  cashierGradient,
  COINS,
  earlyNonSaturating,
  earlyOriginal,
  factorOf,
  FIRST_ALIKE,
  FIRST_VARIED,
  firstReachNew,
  FOOLED_AT,
  fooled,
  forgerLoss,
  frameAt,
  LAB_ROUNDS,
  labRun,
  mean,
  NEW_CENTRE,
  nearNew,
  NON_SATURATING,
  objectiveOf,
  OLD_CENTRE,
  ONE_KIND,
  ORIGINAL,
  play,
  roundsWithoutNew,
  POWERS,
  REAL_CENTRE,
  scoreOf,
  sigmoid,
  slopeOf,
  STORY,
  STORY_ROUNDS,
  storyEnd,
  teach,
  TWO_KINDS,
  UNSURE,
  valueAtEven,
  valueOf,
  WORKED,
  type Cashier,
} from './model'

// Small weights keep the score moderate, so 1 − D keeps its digits in the
// numerical checks
const randomCashier = (random: () => number): Cashier => ({
  w: Array.from({ length: POWERS }, () => random() - 0.5),
  c: random() - 0.5,
})

describe('the coins', () => {
  it('are bumps where the page says', () => {
    expect(ONE_KIND).toHaveLength(COINS)
    expect(Math.abs(mean(ONE_KIND) - REAL_CENTRE)).toBeLessThan(0.2)
    expect(Math.abs(mean(TWO_KINDS.slice(0, COINS / 2)) - OLD_CENTRE)).toBeLessThan(0.25)
    expect(Math.abs(mean(TWO_KINDS.slice(COINS / 2)) - NEW_CENTRE)).toBeLessThan(0.25)
    expect(Math.abs(mean(FIRST_VARIED) - 2.5)).toBeLessThan(0.1)
    expect(new Set(FIRST_ALIKE).size).toBe(1)
  })
})

describe('the cashier', () => {
  it('is unsure, one half everywhere, before its first lesson', () => {
    for (const x of [0, 3, 8, 12]) expect(chanceReal(UNSURE, x)).toBe(0.5)
  })

  it('has a slope that matches the score’s, numerically', () => {
    const random = seeded(1)
    for (let i = 0; i < 200; i++) {
      const d = randomCashier(random)
      const x = random() * 12
      const h = 1e-5
      const numeric = (scoreOf(d, x + h) - scoreOf(d, x - h)) / (2 * h)
      expect(slopeOf(d, x)).toBeCloseTo(numeric, 5)
    }
  })

  it('climbs the objective along its gradient, which matches a numerical one', () => {
    const random = seeded(2)
    for (let i = 0; i < 50; i++) {
      const d = randomCashier(random)
      const fakes = Array.from({ length: 8 }, () => random() * 12)
      const g = cashierGradient(d, ONE_KIND, fakes)
      const h = 1e-5
      const nudged = (k: number, by: number): Cashier =>
        k < POWERS ? { w: d.w.map((w, i) => (i === k ? w + by : w)), c: d.c } : { w: d.w, c: d.c + by }
      for (let k = 0; k <= POWERS; k++) {
        const numeric = (objectiveOf(nudged(k, h), ONE_KIND, fakes) - objectiveOf(nudged(k, -h), ONE_KIND, fakes)) / (2 * h)
        const analytic = k < POWERS ? g.w[k] : g.c
        expect(Math.abs(analytic - numeric)).toBeLessThan(1e-4 * Math.max(1, Math.abs(numeric)))
      }
    }
  })

  it('learns to call the first fakes fake', () => {
    const d = teach(UNSURE, ONE_KIND, FIRST_VARIED)
    expect(objectiveOf(d, ONE_KIND, FIRST_VARIED)).toBeGreaterThan(objectiveOf(UNSURE, ONE_KIND, FIRST_VARIED))
    expect(chanceReal(d, 2.5)).toBeLessThan(0.1)
    expect(chanceReal(d, 8)).toBeGreaterThan(0.5)
  })

  it('stays at one half when fakes and real coins are the same coins', () => {
    const d = teach(UNSURE, ONE_KIND, ONE_KIND, 200)
    for (const x of ONE_KIND) expect(chanceReal(d, x)).toBeCloseTo(0.5, 6)
  })
})

describe('the forger’s two losses', () => {
  it('push a fake by D or by 1 − D times the score’s slope: the slopes of the losses', () => {
    const random = seeded(3)
    for (let i = 0; i < 200; i++) {
      const d = randomCashier(random)
      const x = random() * 12
      const h = 1e-4
      const lossAt = (loss: typeof ORIGINAL, at: number) => forgerLoss(loss, chanceReal(d, at))
      for (const loss of [ORIGINAL, NON_SATURATING]) {
        const downhill = -(lossAt(loss, x + h) - lossAt(loss, x - h)) / (2 * h)
        expect(factorOf(loss, chanceReal(d, x)) * slopeOf(d, x)).toBeCloseTo(downhill, 4)
      }
    }
  })

  it('give the worked numbers: equal at one half, 9 and 99 times apart below', () => {
    expect(WORKED.map((d) => factorOf(NON_SATURATING, d) / factorOf(ORIGINAL, d))).toEqual([
      1,
      expect.closeTo(9, 9),
      expect.closeTo(99, 9),
    ])
  })

  it('under the original loss move the fake the cashier likes best furthest', () => {
    expect(CHECK_MOST.chance).toBe(0.95)
    const pulls = CHECK_FAKES.map((f) => factorOf(ORIGINAL, f.chance))
    expect(Math.max(...pulls)).toBe(factorOf(ORIGINAL, CHECK_MOST.chance))
    // and the non-saturating loss favours the worst
    const other = CHECK_FAKES.map((f) => factorOf(NON_SATURATING, f.chance))
    expect(other.indexOf(Math.max(...other))).toBe(0)
  })

  it('agree with sigmoid by hand', () => {
    expect(sigmoid(0)).toBe(0.5)
    expect(sigmoid(Math.log(9))).toBeCloseTo(0.9, 12)
  })
})

describe('the value of the game', () => {
  it('is −log 4 when the cashier says one half to everything', () => {
    expect(valueAtEven).toBeCloseTo(-Math.log(4), 12)
    expect(valueOf(UNSURE, ONE_KIND, FIRST_VARIED)).toBeCloseTo(-Math.log(4), 12)
  })

  it('ends the story close to −log 4', () => {
    expect(valueOf(storyEnd.cashier, ONE_KIND, storyEnd.fakes)).toBeCloseTo(-Math.log(4), 2)
  })
})

describe('the story', () => {
  it('starts with the cashier sure the fakes are fake and ends with it guessing', () => {
    expect(STORY).toHaveLength(STORY_ROUNDS)
    expect(fooled(STORY[0])).toBeLessThan(0.05)
    expect(FOOLED_AT).toBe(12)
    expect(fooled(storyEnd)).toBeCloseTo(0.5, 2)
    expect(Math.abs(mean(storyEnd.fakes) - mean(ONE_KIND))).toBeLessThan(0.1)
  })

  it('moves fakes first and the curve second within a round', () => {
    const half = frameAt(STORY, 0.5)
    expect(half.cashier).toEqual(STORY[0].cashier)
    expect(half.fakes).toEqual(STORY[1].fakes)
    expect(frameAt(STORY, 1)).toEqual(STORY[1])
    expect(frameAt(STORY, 1e9)).toEqual(storyEnd)
  })
})

describe('the lab', () => {
  it('shows the original loss stalling while the cashier wins', () => {
    expect(earlyOriginal()).toBeLessThan(1.2)
    expect(earlyNonSaturating()).toBeGreaterThan(4)
  })

  it('bunches a varied batch on the old kind for a long while before some peel off', () => {
    const run = labRun('Two kinds', NON_SATURATING, 'Varied')
    expect(roundsWithoutNew(run)).toBe(27)
    expect(firstReachNew(run)).toBe(67)
    expect(nearNew(run[LAB_ROUNDS - 1].fakes)).toBeGreaterThanOrEqual(COINS / 4)
  })

  it('collapses for good from a batch of identical coins: one weight, never the new kind', () => {
    for (const loss of [ORIGINAL, NON_SATURATING]) {
      const run = labRun('Two kinds', loss, 'All alike')
      expect(run.every((r) => nearNew(r.fakes) === 0)).toBe(true)
      expect(run.every((r) => new Set(r.fakes).size === 1)).toBe(true)
      expect(fooled(run[LAB_ROUNDS - 1])).toBeLessThan(0.4)
    }
  })

  it('keeps any batch of identical coins identical, whatever the real coins', () => {
    const random = seeded(4)
    for (let i = 0; i < 20; i++) {
      const real = Array.from({ length: 10 }, () => random() * 12)
      const at = random() * 12
      const run = play(real, Array(6).fill(at), NON_SATURATING, 30)
      expect(run.every((r) => new Set(r.fakes).size === 1)).toBe(true)
    }
  })
})
