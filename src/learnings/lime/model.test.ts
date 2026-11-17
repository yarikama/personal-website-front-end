import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  box,
  closeness,
  distance,
  drawCopies,
  endless,
  endlessQuality,
  explain,
  fitLine,
  fitQuality,
  guess,
  hidden,
  keep,
  NOT_GOOD_ENDLESS,
  SENTENCES,
  sigmoid,
  SINGLES,
  solve,
  STORY,
  STORY_ENDLESS,
  STORY_RUN,
  topWord,
  VOCAB,
  WRONG_FEW,
  WRONG_MANY,
} from './model'

const words = Object.keys(VOCAB)

describe('the black box', () => {
  it('matches hand-worked reviews', () => {
    // "not bad": down 1, flip 1, so only the flipped-complaint unit fires, at 1
    expect(hidden(STORY)).toEqual({ praise: 0, complaint: 0, flippedComplaint: 1, flippedPraise: 0 })
    expect(box(STORY)).toBeCloseTo(sigmoid(1.8), 12)
    expect(box(STORY)).toBeCloseTo(0.858, 3)
    // "bad" alone: the plain complaint unit, at 1
    expect(box(['the', 'acting', 'was', 'bad'])).toBeCloseTo(sigmoid(-2.2), 12)
    // "not" alone, or no sentiment word at all: a shrug
    expect(box(['the', 'acting', 'was', 'not'])).toBe(0.5)
    expect(box(['the'])).toBe(0.5)
    // "not good" mirrors "not bad"
    expect(box(SENTENCES['not good'])).toBeCloseTo(sigmoid(-1.8), 12)
    // clever (up 1) against slow and boring (down 1.8): 2.2 × 1 − 2.2 × 1.8
    expect(box(SENTENCES['clever, slow'])).toBeCloseTo(sigmoid(2.2 - 2.2 * 1.8), 12)
  })

  it('reads a bag: the order of the words never matters', () => {
    const random = seeded(1)
    for (let trial = 0; trial < 200; trial++) {
      const review = Array.from({ length: 1 + Math.floor(random() * 6) }, () => words[Math.floor(random() * words.length)])
      const shuffled = [...review].sort(() => random() - 0.5)
      expect(box(shuffled)).toBeCloseTo(box(review), 12)
    }
  })

  it('cannot be written as a sum over words: "not" helps beside "bad" and hurts beside "good"', () => {
    const withNot = (rest: string[]) => box([...rest, 'not']) - box(rest)
    expect(withNot(['bad'])).toBeGreaterThan(0.5)
    expect(withNot(['good'])).toBeLessThan(-0.5)
  })
})

describe('the copies and their say', () => {
  it('measures cosine distance between 0/1 vectors', () => {
    const random = seeded(2)
    for (let trial = 0; trial < 200; trial++) {
      const n = 2 + Math.floor(random() * 7)
      const kept = Array.from({ length: n }, () => random() < 0.5)
      kept[Math.floor(random() * n)] = true
      const k = kept.filter(Boolean).length
      // The cosine of the whole sentence (all ones) with the copy, written out
      const dot = kept.reduce((s, x) => s + (x ? 1 : 0), 0)
      const cosine = dot / (Math.sqrt(n) * Math.sqrt(k))
      expect(distance(k, n)).toBeCloseTo(1 - cosine, 12)
    }
  })

  it('gives the hand-worked closeness numbers', () => {
    expect(closeness(5, 5)).toBe(1)
    expect(distance(4, 5)).toBeCloseTo(0.10557, 5)
    expect(closeness(4, 5)).toBeCloseTo(0.913, 3)
    expect(closeness(2, 5)).toBeCloseTo(0.332, 3)
    expect(closeness(1, 5)).toBeCloseTo(0.083, 3)
  })

  it('draws the whole sentence first, then copies covering 1 to n − 1 words, each count about equally often', () => {
    const copies = drawCopies(seeded(3), 5, 8001)
    expect(copies[0]).toEqual([true, true, true, true, true])
    const counts = [0, 0, 0, 0, 0, 0]
    for (const kept of copies.slice(1)) counts[kept.filter((k) => !k).length]++
    expect(counts[0]).toBe(0)
    expect(counts[5]).toBe(0)
    for (const c of counts.slice(1, 5)) expect(c / 8000).toBeCloseTo(0.25, 1)
  })

  it('covers each word about equally often', () => {
    const copies = drawCopies(seeded(4), 6, 12001).slice(1)
    for (let i = 0; i < 6; i++) {
      const covered = copies.filter((kept) => !kept[i]).length / copies.length
      // Covered count uniform on 1..5 of 6: on average 3 of 6
      expect(covered).toBeCloseTo(0.5, 1)
    }
  })
})

describe('the fit', () => {
  it('solves random linear systems', () => {
    const random = seeded(5)
    for (let trial = 0; trial < 100; trial++) {
      const n = 1 + Math.floor(random() * 6)
      const a = Array.from({ length: n }, () => Array.from({ length: n }, () => random() * 2 - 1))
      const x = Array.from({ length: n }, () => random() * 2 - 1)
      const b = a.map((row) => row.reduce((s, v, j) => s + v * x[j], 0))
      solve(a, b).forEach((v, j) => expect(v).toBeCloseTo(x[j], 6))
    }
  })

  it('recovers a box that really is a straight line, exactly', () => {
    const random = seeded(6)
    for (let trial = 0; trial < 50; trial++) {
      const n = 2 + Math.floor(random() * 5)
      const truth = { base: random(), credit: Array.from({ length: n }, () => random() * 2 - 1) }
      const rows = drawCopies(random, n, 60)
      const says = rows.map(() => 0.1 + random())
      const line = fitLine(
        rows,
        rows.map((kept) => guess(truth, kept)),
        says
      )
      // Copies that never cover a word can't tell its credit from the base;
      // with 60 copies every word is covered in some
      expect(line.base).toBeCloseTo(truth.base, 3)
      line.credit.forEach((c, i) => expect(c).toBeCloseTo(truth.credit[i], 3))
      expect(fitQuality(rows, rows.map((kept) => guess(truth, kept)), says, line)).toBeCloseTo(1, 6)
    }
  })

  it('leaves misses that no other line could shrink: they are uncorrelated with every word, say-weighted', () => {
    const random = seeded(7)
    for (let trial = 0; trial < 20; trial++) {
      const run = explain(SENTENCES['clever, slow'], 80, random)
      const misses = run.copies.map((kept, r) => run.says[r] * (run.scores[r] - guess(run.line, kept)))
      expect(misses.reduce((s, m) => s + m, 0)).toBeCloseTo(0, 4)
      for (let j = 0; j < 7; j++) expect(misses.reduce((s, m, r) => s + (run.copies[r][j] ? m : 0), 0)).toBeCloseTo(0, 4)
    }
  })

  it('settles on the endless-copies answer as the copies grow', () => {
    for (const name of ['not bad', 'clever, slow'] as const) {
      const sentence = SENTENCES[name]
      const run = explain(sentence, 40000, seeded(8))
      const truth = endless(sentence)
      expect(run.line.base).toBeCloseTo(truth.base, 1)
      run.line.credit.forEach((c, i) => expect(Math.abs(c - truth.credit[i])).toBeLessThan(0.02))
    }
  })
})

describe('what the page says', () => {
  it('the story: one word covered at a time', () => {
    expect(SINGLES.map((kept) => box(keep(STORY, kept)))).toEqual([box(['the', 'acting', 'was', 'bad']), 0.5, box(STORY)])
  })

  it('the story: 16 copies credit "not" most, near the endless answer', () => {
    expect(STORY_RUN.copies).toHaveLength(16)
    expect(topWord(STORY, STORY_RUN.line)).toBe('not')
    expect(STORY_RUN.line.credit[3]).toBeCloseTo(0.46, 2)
    expect(STORY_RUN.line.credit[4]).toBeCloseTo(0.14, 2)
    expect(STORY_ENDLESS.credit[3]).toBeCloseTo(0.5, 2)
    expect(STORY_ENDLESS.credit[4]).toBeCloseTo(0.1, 2)
  })

  it('the quick check: "not good" turns every credit around', () => {
    NOT_GOOD_ENDLESS.credit.forEach((c, i) => expect(c).toBeCloseTo(-STORY_ENDLESS.credit[i], 9))
    expect(NOT_GOOD_ENDLESS.base).toBeCloseTo(1 - STORY_ENDLESS.base, 9)
  })

  it('a straight line fits a pair like "not bad" worse than words that each push one way', () => {
    expect(endlessQuality(STORY)).toBeCloseTo(0.68, 2)
    expect(endlessQuality(SENTENCES['clever, slow'])).toBeCloseTo(0.93, 2)
  })

  it('a handful of copies sometimes crowns the wrong word; plenty never do', () => {
    expect(WRONG_FEW).toBe(10)
    expect(WRONG_MANY).toBe(0)
  })
})
