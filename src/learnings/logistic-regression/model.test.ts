import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  BEST,
  chanceOf,
  chanceOfTruth,
  constantLoss,
  CUTOFF,
  cutoffWrong,
  descend,
  drawPatients,
  fit,
  GENTLE,
  gradient,
  GUESS_RATIO,
  halfwayOf,
  HARDEST,
  likelihood,
  logLoss,
  ODD,
  PATIENTS,
  pullOf,
  PULLS,
  safeStep,
  SEARCH,
  SPAM_SHARE,
  STEEP,
  sigmoid,
  surpriseOf,
  totalLoss,
  TRUE,
  weightsAt,
  WORKED,
  wrongAt,
  type Patient,
  type Weights,
} from './model'

describe('the sigmoid', () => {
  it('turns a score of 0 into a half, and is symmetric', () => {
    expect(sigmoid(0)).toBe(0.5)
    for (const z of [-30, -2, -0.5, 0.5, 2, 30]) expect(sigmoid(z) + sigmoid(-z)).toBeCloseTo(1, 12)
  })

  it('matches 1 / (1 + e^−z) by hand', () => {
    expect(sigmoid(0.5)).toBeCloseTo(0.6225, 4)
    expect(sigmoid(-2)).toBeCloseTo(0.1192, 4)
  })

  it('never reaches 0 or 1, even far out', () => {
    expect(sigmoid(-700)).toBeGreaterThan(0)
    expect(sigmoid(30)).toBeLessThan(1)
  })
})

describe('the log loss', () => {
  it('is ln(1 ÷ the chance given to what happened)', () => {
    expect(logLoss(1, 0.9)).toBeCloseTo(Math.log(1 / 0.9), 12)
    expect(logLoss(0, 0.9)).toBeCloseTo(Math.log(10), 12)
    expect(logLoss(1, 0.2)).toBeCloseTo(1.6094, 4)
  })

  it('charges the 90% mistake about 2.5 times the 60% one', () => {
    expect(GUESS_RATIO).toBeCloseTo(Math.log(10) / Math.log(2.5), 12)
    expect(GUESS_RATIO.toFixed(1)).toBe('2.5')
  })

  it('from the score agrees with ln(1 ÷ chance), and stays finite when very sure and wrong', () => {
    for (const p of PATIENTS) {
      expect(surpriseOf(GENTLE, p)).toBeCloseTo(-Math.log(chanceOfTruth(GENTLE, p)), 10)
    }
    const far: Weights = { w: 1000, b: 0 }
    const wrong: Patient = { temp: 37, flu: true }
    expect(surpriseOf(far, wrong)).toBeCloseTo(1000, 6)
  })

  it('totals to −ln of the likelihood', () => {
    expect(totalLoss(GENTLE, PATIENTS)).toBeCloseTo(-Math.log(likelihood(GENTLE, PATIENTS)), 10)
  })

  it('is n ln 2 for a flat 50%', () => {
    expect(totalLoss({ w: 0, b: 0 }, PATIENTS)).toBeCloseTo(PATIENTS.length * Math.log(2), 12)
  })
})

// A numerical derivative of the total loss, the referee for the gradient
function numerical(weights: Weights, patients: Patient[], h = 1e-6): Weights {
  const f = (w: Weights) => totalLoss(w, patients)
  return {
    w: (f({ ...weights, w: weights.w + h }) - f({ ...weights, w: weights.w - h })) / (2 * h),
    b: (f({ ...weights, b: weights.b + h }) - f({ ...weights, b: weights.b - h })) / (2 * h),
  }
}

describe('the gradient, Σ (chance − label) × (x, 1)', () => {
  it('matches a numerical derivative on seeded data and weights', () => {
    const random = seeded(11)
    for (let trial = 0; trial < 50; trial++) {
      const patients = drawPatients(100 + trial, 30)
      const weights = { w: -3 + 10 * random(), b: -3 + 6 * random() }
      const g = gradient(weights, patients)
      const n = numerical(weights, patients)
      expect(g.w).toBeCloseTo(n.w, 5)
      expect(g.b).toBeCloseTo(n.b, 5)
    }
  })

  it('is zero at the best fit, where the pulls balance', () => {
    const g = gradient(BEST, PATIENTS)
    expect(Math.abs(g.w)).toBeLessThan(1e-8)
    expect(Math.abs(g.b)).toBeLessThan(1e-8)
  })
})

describe('gradient descent', () => {
  it('never raises the loss with the safe step, on seeded data', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const patients = drawPatients(seed)
      const path = descend({ w: 0, b: 0 }, patients, 300, safeStep(patients))
      for (let i = 1; i < path.length; i++) {
        expect(totalLoss(path[i], patients)).toBeLessThanOrEqual(totalLoss(path[i - 1], patients) + 1e-12)
      }
    }
  })

  it('reaches the minimum from anywhere: every start lands on the same weights', () => {
    const random = seeded(3)
    for (let i = 0; i < 10; i++) {
      const start = { w: -5 + 15 * random(), b: -5 + 10 * random() }
      const end = fit(PATIENTS, start)
      expect(end.w).toBeCloseTo(BEST.w, 5)
      expect(end.b).toBeCloseTo(BEST.b, 5)
    }
  })

  it('beats every weight on a grid around it', () => {
    const best = totalLoss(BEST, PATIENTS)
    for (let w = 0; w <= 8; w += 0.25) {
      for (let b = -3; b <= 3; b += 0.25) expect(totalLoss({ w, b }, PATIENTS)).toBeGreaterThanOrEqual(best - 1e-9)
    }
  })

  it('keeps steepening on a clean split, with the boundary held still', () => {
    const patients = drawPatients(5, 40, TRUE, true)
    const once = descend({ w: 1, b: 0 }, patients, 1500).at(-1)!
    const twice = descend(once, patients, 1500).at(-1)!
    expect(wrongAt(once, patients)).toBe(0)
    expect(twice.w).toBeGreaterThan(once.w + 1)
    expect(totalLoss(twice, patients)).toBeLessThan(totalLoss(once, patients))
    expect(Math.abs(halfwayOf(twice) - halfwayOf(once))).toBeLessThan(0.05)
  })
})

describe('fitted chances', () => {
  // Many patients from the true curve: the fit finds it, and its chances
  // match how often flu happens
  const patients = drawPatients(2026, 20_000)
  const fitted = fit(patients, { w: 0, b: 0 }, 1e-6, 20_000)

  it('recover the true curve', () => {
    expect(fitted.w).toBeCloseTo(TRUE.w, 0)
    expect(Math.abs(fitted.w - TRUE.w)).toBeLessThan(0.15)
    expect(Math.abs(halfwayOf(fitted) - halfwayOf(TRUE))).toBeLessThan(0.03)
  })

  it('are calibrated: in each band of predicted chance, flu happens about that often', () => {
    const bands = Array.from({ length: 5 }, () => ({ n: 0, flu: 0, said: 0 }))
    for (const p of patients) {
      const chance = chanceOf(fitted, p.temp)
      const band = bands[Math.min(4, Math.floor(chance * 5))]
      band.n++
      band.said += chance
      if (p.flu) band.flu++
    }
    for (const band of bands) {
      expect(band.n).toBeGreaterThan(500)
      expect(Math.abs(band.flu / band.n - band.said / band.n)).toBeLessThan(0.03)
    }
  })

  it('overall, add up to the number of flu cases (the pulls on b sum to zero)', () => {
    const said = patients.reduce((s, p) => s + chanceOf(fitted, p.temp), 0)
    const flu = patients.filter((p) => p.flu).length
    expect(Math.abs(said - flu)).toBeLessThan(1)
  })
})

describe('the story', () => {
  it('has a rule that gets 2 wrong, and a best curve that also gets 2 wrong', () => {
    expect(cutoffWrong(PATIENTS)).toBe(2)
    expect(wrongAt(BEST, PATIENTS)).toBe(2)
    expect(CUTOFF).toBe(38)
  })

  it('tells the numbers the page says', () => {
    expect(chanceOfTruth(GENTLE, ODD)).toBeCloseTo(0.289, 3)
    expect(surpriseOf(GENTLE, ODD)).toBeCloseTo(1.24, 2)
    expect(totalLoss(GENTLE, PATIENTS)).toBeCloseTo(6.25, 2)
    expect(totalLoss(STEEP, PATIENTS)).toBeCloseTo(10.74, 2)
    expect(chanceOfTruth(STEEP, ODD)).toBeLessThan(0.01)
    expect(surpriseOf(STEEP, ODD)).toBeCloseTo(5.08, 2)
    expect(totalLoss({ w: 0, b: 0 }, PATIENTS)).toBeCloseTo(11.09, 2)
    expect(totalLoss(BEST, PATIENTS)).toBeCloseTo(5.62, 2)
    expect(halfwayOf(BEST).toFixed(1)).toBe('37.9')
  })

  it('searches down to the best curve, never up', () => {
    for (let i = 1; i < SEARCH.length; i++) {
      expect(totalLoss(SEARCH[i], PATIENTS)).toBeLessThanOrEqual(totalLoss(SEARCH[i - 1], PATIENTS))
    }
    expect(totalLoss(SEARCH.at(-1)!, PATIENTS).toFixed(2)).toBe(totalLoss(BEST, PATIENTS).toFixed(2))
  })

  it('works three patients as the page shows them', () => {
    const shown = WORKED.map((p) => {
      const chance = chanceOf(BEST, p.temp)
      return [Math.round(100 * chance), surpriseOf(BEST, p).toFixed(2), pullOf(chance, p.flu).toFixed(2)]
    })
    expect(shown).toEqual([
      [98, '0.02', '-0.02'],
      [20, '1.59', '-0.80'],
      [79, '1.56', '0.79'],
    ])
  })

  it('converts a slope and a 50% point to weights and back', () => {
    const w = weightsAt(2.5, 37.6)
    expect(halfwayOf(w)).toBeCloseTo(37.6, 12)
    expect(chanceOf(w, 37.6)).toBeCloseTo(0.5, 12)
  })
})

describe('the checks', () => {
  it('quick check: the hesitant fine email pulls hardest', () => {
    expect(HARDEST.name).toBe('Fine, given 45%')
    expect(PULLS.filter((e) => e.chance >= 0.5 !== e.spam)).toEqual([])
  })

  it('check yourself: one constant chance does best at the share that is spam', () => {
    expect(constantLoss(0)).toBe(Infinity)
    let bestQ = 0.01
    for (let q = 0.01; q < 1; q += 0.01) if (constantLoss(q) < constantLoss(bestQ)) bestQ = q
    expect(bestQ).toBeCloseTo(SPAM_SHARE, 2)
    expect([SPAM_SHARE, 0.5, 0.7].map((q) => constantLoss(q).toFixed(2))).toEqual(['0.61', '0.69', '0.95'])
  })
})
