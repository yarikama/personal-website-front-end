import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  BEACH,
  beachOverJoke,
  BLANKS,
  CHECK_CHANCES,
  CHECK_P,
  checkKept,
  chancesOf,
  COLOUR,
  decode,
  draws,
  FRIENDS,
  guessShare,
  JOKE_VOTES,
  JOKES,
  kept,
  nonsenseShare,
  scoresOf,
  softmax,
  STORY_K,
  STORY_P,
  STOVE,
  storyDraws,
  storyJokes,
  topK,
  topP,
  truncate,
  worked,
} from './model'

describe('the blanks', () => {
  it('each hold the 100 friends’ answers, most votes first', () => {
    for (const blank of BLANKS) {
      expect(blank.words.reduce((sum, w) => sum + w.votes, 0)).toBe(FRIENDS)
      for (let i = 1; i < blank.words.length; i++) expect(blank.words[i].votes).toBeLessThanOrEqual(blank.words[i - 1].votes)
    }
  })

  it('give the beach 25 different jokes, one vote each', () => {
    expect(new Set(JOKES).size).toBe(25)
    expect(JOKE_VOTES).toBe(25)
    expect(nonsenseShare(BEACH, chancesOf(BEACH))).toBeCloseTo(0.25, 12)
  })

  it('match the guess: 25,000 words at 1 in 100,000 is a quarter', () => {
    expect(guessShare).toBeCloseTo(0.25, 12)
  })
})

describe('the softmax with a temperature', () => {
  it('gives back the votes at temperature 1', () => {
    for (const blank of BLANKS) {
      softmax(scoresOf(blank)).forEach((c, i) => expect(c).toBeCloseTo(chancesOf(blank)[i], 12))
    }
  })

  it('works out by hand on the beach', () => {
    // At 0.5 each chance goes as votes²: 36² / (36² + 18² + 10² + 7² + 4² + 25)
    const [half, one, two] = worked
    expect(half.beach).toBeCloseTo(1296 / 1810, 12)
    expect(half.jokes).toBeCloseTo(25 / 1810, 12)
    expect(one.beach).toBeCloseTo(0.36, 12)
    expect(one.jokes).toBeCloseTo(0.25, 12)
    // At 2, as √votes: 6 / (6 + √18 + √10 + √7 + 2 + 25)
    const roots = 6 + Math.sqrt(18) + Math.sqrt(10) + Math.sqrt(7) + 2 + 25
    expect(two.beach).toBeCloseTo(6 / roots, 12)
    expect(two.jokes).toBeCloseTo(25 / roots, 12)
    expect([half, one, two].map((w) => Math.round(w.jokes * 100))).toEqual([1, 25, 58])
    expect([half, one, two].map((w) => Math.round(w.beach * 100))).toEqual([72, 36, 14])
  })

  it('makes beach 36 times a joke at 1, 36² at 0.5 and 6 at 2', () => {
    expect(beachOverJoke(1)).toBeCloseTo(36, 9)
    expect(beachOverJoke(0.5)).toBeCloseTo(1296, 6)
    expect(beachOverJoke(2)).toBeCloseTo(6, 9)
    const at = softmax(scoresOf(BEACH), 0.5)
    expect(at[0] / at[5]).toBeCloseTo(1296, 6)
  })

  it('never changes which word is likeliest', () => {
    const random = seeded(4)
    for (let trial = 0; trial < 300; trial++) {
      const scores = Array.from({ length: 2 + Math.floor(random() * 10) }, () => -5 + 10 * random())
      const best = scores.indexOf(Math.max(...scores))
      for (const t of [0.1, 0.5, 1, 2, 10]) {
        const chances = softmax(scores, t)
        expect(chances.indexOf(Math.max(...chances))).toBe(best)
        expect(chances.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
      }
    }
  })

  it('goes to the top word as it cools and to even as it heats', () => {
    const scores = scoresOf(BEACH)
    expect(softmax(scores, 0.02)[0]).toBeGreaterThan(0.999)
    for (const c of softmax(scores, 1000)) expect(c).toBeCloseTo(1 / scores.length, 2)
  })
})

describe('the cuts', () => {
  it('top-5 keeps the five sensible beach words and no joke', () => {
    const keep = topK(chancesOf(BEACH), STORY_K)
    expect(kept(BEACH, keep).words.map((w) => w.word)).toEqual(['beach', 'park', 'lake', 'zoo', 'market'])
    expect(kept(BEACH, keep).votes).toBe(75)
  })

  it('top-5 lets cold and wet in after the stove, and drops seven colours', () => {
    const stove = kept(STOVE, topK(chancesOf(STOVE), STORY_K))
    expect(stove.words.filter((w) => !w.sensible).map((w) => w.word)).toEqual(['cold', 'wet'])
    expect(stove.votes).toBe(98)
    const colour = kept(COLOUR, topK(chancesOf(COLOUR), STORY_K))
    expect(COLOUR.words.length - colour.count).toBe(7)
    expect(colour.votes).toBe(49)
  })

  it('top-p at 0.7 keeps 4 beach words, 1 at the stove and 8 colours', () => {
    expect(BLANKS.map((b) => kept(b, topP(chancesOf(b), STORY_P)).count)).toEqual([4, 1, 8])
    expect(BLANKS.map((b) => kept(b, topP(chancesOf(b), STORY_P)).votes)).toEqual([71, 85, 73])
  })

  it('top-p at 0.8 keeps 3 of the check’s words', () => {
    expect(checkKept).toBe(3)
    expect(truncate(CHECK_CHANCES, topP(CHECK_CHANCES, CHECK_P))[0]).toBeCloseTo(0.5 / 0.85, 12)
  })

  it('match a brute-force search for the smallest set that holds p, and the k likeliest', () => {
    const random = seeded(11)
    for (let trial = 0; trial < 300; trial++) {
      const n = 2 + Math.floor(random() * 7)
      const raw = Array.from({ length: n }, () => random())
      const sum = raw.reduce((a, b) => a + b, 0)
      const chances = raw.map((r) => r / sum)
      const p = 0.05 + 0.9 * random()
      const k = 1 + Math.floor(random() * n)

      // Every subset: the smallest holding p, and among those the most mass
      let best = { size: Infinity, mass: -1 }
      let bestK = -1
      for (let mask = 1; mask < 1 << n; mask++) {
        let size = 0
        let mass = 0
        for (let i = 0; i < n; i++) {
          if (mask & (1 << i)) {
            size++
            mass += chances[i]
          }
        }
        if (mass >= p - 1e-9 && (size < best.size || (size === best.size && mass > best.mass))) best = { size, mass }
        if (size === k) bestK = Math.max(bestK, mass)
      }
      const nucleus = topP(chances, p)
      expect(nucleus.filter(Boolean).length).toBe(best.size)
      expect(chances.reduce((s, c, i) => s + (nucleus[i] ? c : 0), 0)).toBeCloseTo(best.mass, 12)
      const top = topK(chances, k)
      expect(top.filter(Boolean).length).toBe(k)
      expect(chances.reduce((s, c, i) => s + (top[i] ? c : 0), 0)).toBeCloseTo(bestK, 12)

      // What is kept still adds to 1, in the same proportions
      const cut = truncate(chances, nucleus)
      expect(cut.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
    }
  })

  it('applies the temperature before the cut', () => {
    // At 0.5 beach holds 72%, so top-p 0.7 keeps beach alone
    const { keep, chances } = decode(BEACH, { method: 'Top-p', k: 5, p: 0.7, temperature: 0.5 })
    expect(keep.filter(Boolean).length).toBe(1)
    expect(chances[0]).toBe(1)
  })
})

describe('drawing', () => {
  it('draws each word about as often as its chance', () => {
    const chances = chancesOf(BEACH)
    const n = 40000
    const counts = new Array(chances.length).fill(0)
    for (const i of draws(seeded(7), chances, n)) counts[i]++
    counts.forEach((c, i) => expect(c / n).toBeCloseTo(chances[i], 1))
    expect(counts.slice(5).reduce((a, b) => a + b, 0) / n).toBeCloseTo(0.25, 1)
  })

  it('never draws a word that was cut', () => {
    const chances = decode(BEACH, { method: 'Top-k', k: 3, p: 0.7, temperature: 1.5 }).chances
    for (const i of draws(seeded(3), chances, 2000)) expect(i).toBeLessThan(3)
  })

  it('lands the story on a quarter silly, then none', () => {
    expect(storyJokes).toBe(25)
    expect(storyDraws.five.every((i) => BEACH.words[i].sensible)).toBe(true)
  })
})
