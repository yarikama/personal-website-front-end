import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  ALL_PROMPTS,
  argmax,
  blankHappy,
  calibrate,
  calibratedHappy,
  cardTexts,
  lean,
  logit,
  pair,
  pct,
  pHappy,
  platt,
  QUICK_AFTER,
  RANGE_AFTER,
  RANGE_BEFORE,
  REVIEWS,
  rightAfter,
  rightBefore,
  scores,
  sigmoid,
  softmax,
  STORY,
  TOPIC_AFTER,
  TOPIC_SCORES,
  weightsOf,
  WORKED,
  type Prompt,
} from './model'

// A random distribution over k labels, none too close to zero
function randomDistribution(random: () => number, k: number): number[] {
  const raw = Array.from({ length: k }, () => 0.05 + random())
  const total = raw.reduce((a, b) => a + b, 0)
  return raw.map((x) => x / total)
}

describe('contextual calibration by hand', () => {
  it('turns the blank input itself into even odds', () => {
    expect(calibrate([0.3, 0.7], [0.3, 0.7])).toEqual([0.5, 0.5])
    expect(scores([0.3, 0.7], [0.3, 0.7])).toEqual([1, 1])
  })

  it('sets W to one over the blank input’s chances', () => {
    const w = weightsOf([0.3, 0.7])
    expect(w[0]).toBeCloseTo(10 / 3)
    expect(w[1]).toBeCloseTo(10 / 7)
  })

  it('works the course slide’s example both ways', () => {
    // p̂_cf = [0.3, 0.7], p̂ = [0.2, 0.8]: W p̂ = [0.667, 1.143]
    const s = scores([0.2, 0.8], [0.3, 0.7])
    expect(s[0]).toBeCloseTo(0.667, 3)
    expect(s[1]).toBeCloseTo(1.143, 3)
    // Rescaled to add to one, and through the paper's softmax: same pick
    expect(calibrate([0.2, 0.8], [0.3, 0.7])[1]).toBeCloseTo(0.632, 3)
    expect(platt([0.2, 0.8], [0.3, 0.7])[1]).toBeCloseTo(0.617, 3)
  })

  it('can flip a prediction that only beat 50% by less than the lean', () => {
    // The quick check: blank 80% happy, review 72% happy
    expect(QUICK_AFTER).toBeCloseTo(0.72 / 0.8 / (0.72 / 0.8 + 0.28 / 0.2), 10)
    expect(pct(QUICK_AFTER)).toBe('39%')
  })

  it('works three labels: the check yourself', () => {
    expect(TOPIC_SCORES.map((x) => +x.toFixed(2))).toEqual([0.9, 0.83, 1.5])
    expect(argmax([0.45, 0.25, 0.3])).toBe(0)
    expect(argmax(TOPIC_SCORES)).toBe(2)
    expect(TOPIC_AFTER.map(pct)).toEqual(['28%', '26%', '46%'])
  })

  it('matches the clip’s arithmetic from rounded numbers', () => {
    // The clip shows p̂_cf = [0.22, 0.78] and p̂ = [0.41, 0.59]
    const s = scores([0.41, 0.59], [0.22, 0.78])
    expect(s.map((x) => x.toFixed(2))).toEqual(['1.86', '0.76'])
    expect(calibrate([0.41, 0.59], [0.22, 0.78]).map((x) => x.toFixed(2))).toEqual(['0.71', '0.29'])
  })
})

describe('contextual calibration against references', () => {
  it('always maps the blank input to uniform, for any number of labels', () => {
    const random = seeded(1)
    for (let n = 0; n < 300; n++) {
      const k = 2 + Math.floor(random() * 5)
      const pcf = randomDistribution(random, k)
      for (const q of calibrate(pcf, pcf)) expect(q).toBeCloseTo(1 / k, 12)
      for (const q of platt(pcf, pcf)) expect(q).toBeCloseTo(1 / k, 12)
    }
  })

  it('picks the same label as the paper’s softmax(W p̂ + b) with b = 0', () => {
    const random = seeded(2)
    for (let n = 0; n < 500; n++) {
      const k = 2 + Math.floor(random() * 5)
      const pcf = randomDistribution(random, k)
      const p = randomDistribution(random, k)
      // W p̂ as a matrix product with the diagonal W, written out
      const w = weightsOf(pcf)
      const wp = p.map((_, i) => p.reduce((sum, pj, j) => sum + (i === j ? w[i] : 0) * pj, 0))
      expect(argmax(calibrate(p, pcf))).toBe(argmax(wp))
      expect(argmax(platt(p, pcf))).toBe(argmax(wp))
      expect(calibrate(p, pcf).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
    }
  })

  it('for two labels, subtracts the blank input’s log-odds', () => {
    const random = seeded(3)
    for (let n = 0; n < 500; n++) {
      const p = 0.02 + 0.96 * random()
      const pcf = 0.02 + 0.96 * random()
      const q = calibrate(pair(p), pair(pcf))[1]
      expect(logit(q)).toBeCloseTo(logit(p) - logit(pcf), 9)
    }
  })

  it('does not care whether p̂ was renormalized first', () => {
    const random = seeded(4)
    for (let n = 0; n < 200; n++) {
      const pcf = randomDistribution(random, 3)
      const p = randomDistribution(random, 3)
      const scaled = p.map((x) => x * 0.37)
      calibrate(scaled, pcf).forEach((q, i) => expect(q).toBeCloseTo(calibrate(p, pcf)[i], 12))
    }
  })

  it('softmax is a distribution', () => {
    const s = softmax([1000, 1001])
    expect(s[0] + s[1]).toBeCloseTo(1)
    expect(s[1]).toBeCloseTo(sigmoid(1))
  })
})

describe('the toy model', () => {
  it('leans with the majority and the most recent labels', () => {
    expect(lean(['P', 'P', 'P', 'P'])).toBeGreaterThan(lean(['N', 'N', 'P', 'P']))
    expect(lean(['N', 'N', 'P', 'P'])).toBeGreaterThan(0)
    expect(lean(['P', 'P', 'N', 'N'])).toBeLessThan(0)
    // Recency all but cancels three happy labels with one unhappy at the end
    expect(Math.abs(lean(['P', 'P', 'P', 'N']))).toBeLessThan(0.1)
  })

  it('gives the blank card exactly the lean', () => {
    for (const prompt of ALL_PROMPTS) expect(logit(blankHappy(prompt))).toBeCloseTo(lean(prompt), 10)
  })

  it('once calibrated, hears only the words, whatever the prompt', () => {
    for (const prompt of ALL_PROMPTS)
      for (const review of REVIEWS) expect(calibratedHappy(prompt, review)).toBeCloseTo(sigmoid(review.evidence), 10)
  })

  it('agrees with a brute-force count of right answers', () => {
    const random = seeded(5)
    for (let n = 0; n < 50; n++) {
      const prompt = [0, 1, 2, 3].map(() => (random() < 0.5 ? 'P' : 'N')) as unknown as Prompt
      let before = 0
      for (const r of REVIEWS) if ((r.evidence + lean(prompt) > 0) === r.happy) before++
      expect(rightBefore(prompt)).toBe(before)
      expect(rightAfter(prompt)).toBe(REVIEWS.filter((r) => r.evidence > 0 === r.happy).length)
    }
  })

  it('has every prompt once, sorted by lean', () => {
    expect(new Set(ALL_PROMPTS.map((p) => p.join(''))).size).toBe(16)
    for (let i = 1; i < 16; i++) expect(lean(ALL_PROMPTS[i])).toBeGreaterThanOrEqual(lean(ALL_PROMPTS[i - 1]))
    expect(RANGE_BEFORE).toEqual([7, 11])
    expect(RANGE_AFTER).toEqual([11, 11])
  })

  it('gives each card its own text', () => {
    expect(new Set(cardTexts(['P', 'P', 'P', 'P'])).size).toBe(4)
    expect(cardTexts(['N', 'P', 'P', 'N'])[0]).toBe(cardTexts(['N', 'N', 'P', 'P'])[0])
  })
})

describe('the story’s numbers', () => {
  it('sorts 11, then 8, then 7, and 11 again once calibrated', () => {
    expect(rightBefore(STORY.mixed)).toBe(11)
    expect(rightBefore(STORY.happyLast)).toBe(8)
    expect(rightBefore(STORY.allHappy)).toBe(7)
    expect(rightAfter(STORY.allHappy)).toBe(11)
    expect(pct(blankHappy(STORY.allHappy))).toBe('86%')
    expect(pct(blankHappy(STORY.happyLast))).toBe('78%')
  })

  it('works the three numbers', () => {
    const before = WORKED.map((r) => pct(pHappy(STORY.happyLast, r)))
    const after = WORKED.map((r) => pct(calibratedHappy(STORY.happyLast, r)))
    expect(before).toEqual(['90%', '71%', '59%'])
    expect(after).toEqual(['71%', '41%', '29%'])
  })
})
