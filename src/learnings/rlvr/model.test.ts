import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  finalNumber,
  FIRST_DRAW,
  GROUP,
  GUESS_RATIO,
  mean,
  partial,
  passes,
  QUESTIONS,
  rewardsOf,
  rightAdvantage,
  sample,
  score,
  signed,
  spread,
  STORY,
  storyRight,
  storyScored,
  WORKED,
  wrongAdvantage,
} from './model'

describe('the group-relative advantage', () => {
  it('matches the lecture’s five answers, three right', () => {
    const { mean: m, spread: s, advantages } = score([1, 0, 1, 1, 0])
    expect(m).toBeCloseTo(0.6, 12)
    expect(s).toBeCloseTo(Math.sqrt(0.24), 12)
    expect(advantages[0]).toBeCloseTo(0.816, 3)
    expect(advantages[1]).toBeCloseTo(-1.225, 3)
  })

  it('works the page’s three numbers out by hand', () => {
    // 7 of 8 right: mean 7/8, spread √(7/64) = √7 / 8
    expect(score(rewardsOf(7, 8)).spread).toBeCloseTo(Math.sqrt(7) / 8, 12)
    expect(WORKED.map((w) => w.right.toFixed(2))).toEqual(['2.65', '1.00', '0.38'])
    expect(WORKED.map((w) => w.wrong.toFixed(2))).toEqual(['-0.38', '-1.00', '-2.65'])
    expect(GUESS_RATIO).toBeCloseTo(7, 12)
  })

  it('is zero for a group that is all right or all wrong', () => {
    expect(score(rewardsOf(8, 8)).advantages).toEqual(Array(8).fill(0))
    expect(score(rewardsOf(0, 8)).advantages).toEqual(Array(8).fill(0))
    expect(rightAdvantage(8, 8)).toBe(0)
    expect(wrongAdvantage(0, 8)).toBe(0)
  })

  it('gives partial credit a full-sized push', () => {
    expect(partial.mean).toBeCloseTo(0.85, 12)
    expect(partial.spread).toBeCloseTo(0.05, 12)
    partial.advantages.forEach((a, i) => expect(a).toBeCloseTo(i % 2 === 0 ? 1 : -1, 9))
  })

  it('matches the closed form, and always sums to zero with spread one, on random groups', () => {
    const random = seeded(7)
    for (let trial = 0; trial < 300; trial++) {
      const n = 2 + Math.floor(random() * 15)
      const k = Math.floor(random() * (n + 1))
      const { advantages } = score(rewardsOf(k, n))
      advantages.forEach((a, i) => expect(a).toBeCloseTo(i < k ? rightAdvantage(k, n) : wrongAdvantage(k, n), 9))
      // Scores of any kind: centred, and scaled to spread 1 unless all equal
      const rewards = Array.from({ length: n }, () => Math.round(random() * 4) / 4)
      const scored = score(rewards)
      expect(mean(scored.advantages)).toBeCloseTo(0, 9)
      expect(spread(scored.advantages)).toBeCloseTo(spread(rewards) === 0 ? 0 : 1, 9)
      // Shifting or stretching every score leaves the advantages alone
      const moved = score(rewards.map((r) => 3 * r + 2)).advantages
      moved.forEach((a, i) => expect(a).toBeCloseTo(scored.advantages[i], 9))
    }
  })
})

describe('the story', () => {
  it('has 7, 1 and 8 right of 8', () => {
    expect(STORY.every((p) => p.answers.length === GROUP)).toBe(true)
    expect(storyRight).toEqual([7, 1, 8])
    expect(signed(storyScored[0].advantages[0])).toBe('+0.38')
    expect(signed(storyScored[0].advantages[3])).toBe('−2.65')
    expect(signed(storyScored[1].advantages[4])).toBe('+2.65')
    expect(signed(storyScored[2].advantages[0])).toBe('0.00')
  })
})

describe('the checker', () => {
  it('reads only the last number', () => {
    expect(finalNumber('22 − 7 = 15, 15 ÷ 3 = 5')).toBe(5)
    expect(finalNumber('22 + 7 = 29, 29 ÷ 3 ≈ 9.67')).toBe(9.67)
    expect(finalNumber('no number')).toBeNull()
    expect(passes('22 ÷ 3 ≈ 7, 7 − 2 = 5', 5)).toBe(true)
  })

  it('passes every sound working and fails every wrong one, for each question', () => {
    for (const q of QUESTIONS) {
      for (const w of q.right) expect(passes(w, q.key), w).toBe(true)
      for (const w of q.wrong) expect(passes(w, q.key), w).toBe(false)
      for (const w of q.luckyWorking) expect(passes(w, q.key), w).toBe(true)
    }
  })
})

describe('the lab', () => {
  it('opens the second question on a group with one lucky answer among six passed', () => {
    const g = sample(1, FIRST_DRAW)
    expect(g.right).toBe(6)
    expect(g.answers.filter((a) => a.kind === 'lucky')).toHaveLength(1)
  })

  it('samples right answers about as often as each question’s chance', () => {
    QUESTIONS.forEach((question, q) => {
      let right = 0
      const draws = 1500
      for (let d = 0; d < draws; d++) right += sample(q, d).answers.filter((a) => a.kind === 'right').length
      expect(right / (draws * GROUP)).toBeCloseTo(question.chance, 1)
    })
  })

  it('scores each group with the group’s own mean and spread', () => {
    for (let d = 0; d < 50; d++) {
      const g = sample(2, d)
      const again = score(g.answers.map((a) => a.reward))
      expect(g.advantages).toEqual(again.advantages)
      expect(g.right).toBe(g.answers.filter((a) => a.reward === 1).length)
    }
  })
})
