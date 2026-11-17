import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  ANSWERS,
  BLURTED,
  checkRight,
  evenWrong,
  majority,
  P_RIGHT,
  PALM,
  percent,
  RIGHT,
  runProblems,
  sampleChain,
  SCALE,
  SELF_CONSISTENCY,
  STORY_EXACT,
  STORY_K,
  STORY_WRONG,
  storyChains,
  storySingleRight,
  storyTally,
  storyVoteRight,
  trapRight,
  voteRight,
  worked,
  WORKED_STEPS,
} from './model'

// Every way k chains can come out, one by one: the referee for the vote
function bruteForce(p: number, wrong: number[], k: number): number {
  const chances = [p, ...wrong]
  const kinds = chances.length
  let total = 0
  for (let code = 0; code < kinds ** k; code++) {
    const counts = new Array<number>(kinds).fill(0)
    let chance = 1
    for (let i = 0, rest = code; i < k; i++, rest = Math.floor(rest / kinds)) {
      counts[rest % kinds]++
      chance *= chances[rest % kinds]
    }
    const most = Math.max(...counts)
    if (counts[0] === most) total += chance / counts.filter((c) => c === most).length
  }
  return total
}

// Two answers only: the right one wins with more than half, and half the ties
function twoWay(p: number, k: number): number {
  let total = 0
  let choose = 1
  for (let c = 0; c <= k; c++) {
    if (c > 0) choose = (choose * (k - c + 1)) / c
    const chance = choose * p ** c * (1 - p) ** (k - c)
    if (2 * c > k) total += chance
    else if (2 * c === k) total += chance / 2
  }
  return total
}

describe('the vote, worked by hand', () => {
  it('is one chain when there is one chain', () => {
    expect(voteRight(0.4, STORY_WRONG, 1)).toBeCloseTo(0.4, 12)
  })

  it('gains nothing from a second chain: a split is a coin toss', () => {
    // p² for both right, plus half of 2p(1 − p) for one each way
    for (const p of [0.2, 0.4, 0.7]) expect(voteRight(p, evenWrong(p, 5), 2)).toBeCloseTo(p, 12)
  })

  it('counts three chains as the story does', () => {
    // all three right 0.064; two right 3 × 0.16 × 0.6 = 0.288; one right and two different
    // wrong answers 3 × 0.4 × (0.36 − 5 × 0.0144) = 0.3456, a three-way tie won a third of the time
    expect(voteRight(0.4, STORY_WRONG, 3)).toBeCloseTo(0.064 + 0.288 + 0.3456 / 3, 12)
  })

  it('is always right when every chain is', () => {
    expect(voteRight(1, [0, 0], 7)).toBeCloseTo(1, 12)
  })
})

describe('the vote, against a referee', () => {
  it('matches every outcome counted one by one', () => {
    const random = seeded(11)
    for (let trial = 0; trial < 60; trial++) {
      const kinds = 2 + Math.floor(random() * 3)
      const k = 1 + Math.floor(random() * 6)
      const raw = Array.from({ length: kinds }, () => 0.05 + random())
      const sum = raw.reduce((a, b) => a + b, 0)
      const [p, ...wrong] = raw.map((r) => r / sum)
      expect(voteRight(p, wrong, k)).toBeCloseTo(bruteForce(p, wrong, k), 10)
    }
  })

  it('matches the binomial when there is one wrong answer', () => {
    const random = seeded(12)
    for (let trial = 0; trial < 40; trial++) {
      const p = random()
      const k = 1 + Math.floor(random() * 40)
      expect(voteRight(p, [1 - p], k)).toBeCloseTo(twoWay(p, k), 10)
    }
  })

  it('is matched by sampled chains and votes', () => {
    const run = runProblems(seeded(13), P_RIGHT, STORY_WRONG, 9, 6000)
    const vote = run.filter((r) => r.vote).length / run.length
    const single = run.filter((r) => r.single).length / run.length
    expect(Math.abs(vote - voteRight(P_RIGHT, STORY_WRONG, 9))).toBeLessThan(0.02)
    expect(Math.abs(single - P_RIGHT)).toBeLessThan(0.02)
  })
})

describe('the pieces of a vote', () => {
  it('draws answers as often as their chances', () => {
    const random = seeded(14)
    const counts = new Array<number>(ANSWERS.length).fill(0)
    for (let i = 0; i < 20000; i++) counts[sampleChain(random, P_RIGHT, STORY_WRONG)]++
    expect(counts[0] / 20000).toBeCloseTo(P_RIGHT, 1)
    for (const c of counts.slice(1)) expect(c / 20000).toBeCloseTo(STORY_WRONG[0], 1)
  })

  it('picks the most common answer, and every tied one fairly', () => {
    expect(majority(seeded(1), [2, 0, 2, 1])).toBe(2)
    const random = seeded(15)
    const wins = [0, 0]
    for (let i = 0; i < 4000; i++) wins[majority(random, [0, 1, 1, 0])]++
    expect(wins[0] / 4000).toBeCloseTo(0.5, 1)
  })
})

describe('the story', () => {
  it('works the problem out to its answer', () => {
    expect(4 * 12 - 30 + 2 * 12).toBe(RIGHT)
    expect(WORKED_STEPS.at(-1)).toContain(String(RIGHT))
    expect(BLURTED).not.toBe(RIGHT)
    // each slip's sum gives its answer
    expect([48 - 30, 48 - 30 + 2, 52 - 30 + 24, 18 + 2 * 24, 48 + 30 + 24]).toEqual(ANSWERS.slice(1).map((a) => a.value))
  })

  it('has 6 of 15 chains right and no wrong answer above 2', () => {
    expect(storyChains).toHaveLength(STORY_K)
    expect(storyTally[0]).toBe(6)
    expect(Math.max(...storyTally.slice(1))).toBe(2)
    expect(storyTally.reduce((a, b) => a + b, 0)).toBe(STORY_K)
  })

  it('lands its hundred problems on the exact chances', () => {
    expect(storySingleRight).toBe(Math.round(100 * STORY_EXACT.single))
    expect(storyVoteRight).toBe(Math.round(100 * STORY_EXACT.vote))
  })

  it('reads the worked numbers as the page tells them', () => {
    expect(worked.map((w) => percent(w.right))).toEqual(['40%', '58%', '98%'])
  })
})

describe('the checks', () => {
  it('votes the wrong way when every wrong chain agrees', () => {
    expect(percent(trapRight)).toBe('10%')
    expect(trapRight).toBeLessThan(0.4)
  })

  it('puts a vote of 40 at about 9 in 10 when a chain is right 1 time in 4', () => {
    expect(percent(checkRight)).toBe('89%')
  })
})

describe('the papers’ numbers', () => {
  it('show chain of thought hurting small models and helping the largest', () => {
    for (const row of SCALE.filter((r) => r.billions < 10)) expect(row.cot).toBeLessThan(row.standard)
    for (const row of SCALE.filter((r) => r.billions > 100)) expect(row.cot).toBeGreaterThan(2.5 * row.standard)
    expect(PALM.cot).toBe(56.9)
  })

  it('start self-consistency from about where Wei et al. left PaLM', () => {
    expect(Math.abs(SELF_CONSISTENCY.greedy - PALM.cot)).toBeLessThan(1)
    expect(SELF_CONSISTENCY.vote - SELF_CONSISTENCY.greedy).toBeCloseTo(17.9, 5)
  })
})
