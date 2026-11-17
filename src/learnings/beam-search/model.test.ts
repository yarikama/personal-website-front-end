import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  beam,
  best,
  CHECK,
  checkTotal,
  END,
  FRESH,
  greedy,
  HIT_RATES,
  LENGTHS,
  LIKELIEST_TEXT,
  logScore,
  nodeCount,
  PERSON_TEXT,
  perWord,
  reroll,
  sentence,
  sentenceChance,
  sentences,
  STORY,
  STORY_BEAM,
  STORY_BEST,
  STORY_GREEDY,
  totalOf,
  TRAP,
  TREES,
  WORKED,
  type Choice,
  type Tree,
} from './model'

const forks = (choices: Choice[]): Choice[][] => [choices, ...choices.flatMap((c) => (c.next.length ? forks(c.next) : []))]

describe('the trees', () => {
  it('give chances that add up to 1 at every fork, and over every sentence', () => {
    for (const tree of Object.values(TREES)) {
      for (const fork of forks(tree.first)) expect(fork.reduce((t, c) => t + c.p, 0)).toBeCloseTo(1, 12)
      expect(sentences(tree).reduce((t, h) => t + h.chance, 0)).toBeCloseTo(1, 12)
    }
  })
})

describe('the story, worked by hand', () => {
  it('greedy taps I, might, come: 0.6 × 0.55 × 0.6', () => {
    expect(sentence(STORY_GREEDY)).toBe('I might come')
    expect(STORY_GREEDY.chance).toBeCloseTo(0.198, 12)
  })

  it('the likeliest reply is Yes I’m in: 0.4 × 0.9 × 0.8', () => {
    expect(sentence(STORY_BEST)).toBe('Yes I’m in')
    expect(STORY_BEST.chance).toBeCloseTo(0.288, 12)
  })

  it('every word greedy tapped had over half the chance', () => {
    let choices = STORY.first
    for (const i of STORY_GREEDY.path) {
      expect(choices[i].p).toBeGreaterThan(0.5)
      choices = choices[i].next
    }
  })

  it('a beam of 2 keeps Yes I’m (0.36) and I might (0.33), and finds the best', () => {
    const second = STORY_BEAM.steps[1]
    expect(second.candidates.map((h) => +h.chance.toFixed(4))).toEqual([0.36, 0.33, 0.27, 0.04])
    expect(second.kept.map((h) => h.words.join(' '))).toEqual(['Yes I’m', 'I might'])
    expect(sentence(STORY_BEAM.result)).toBe('Yes I’m in')
    expect(STORY_BEAM.scored).toBe(10)
    expect(nodeCount(STORY)).toBe(14)
  })
})

describe('the trap', () => {
  it('greedy, a beam of 2 and a beam of 3 each find a better translation', () => {
    expect(sentence(greedy(TRAP).result)).toBe('It rains ropes')
    expect(greedy(TRAP).result.chance).toBeCloseTo(0.1716, 12)
    expect(sentence(beam(TRAP, 2).result)).toBe('It is pouring')
    expect(beam(TRAP, 2).result.chance).toBeCloseTo(0.216, 12)
    expect(sentence(beam(TRAP, 3).result)).toBe('It’s pouring down')
    expect(beam(TRAP, 3).result.chance).toBeCloseTo(0.228, 12)
    expect(sentence(best(TRAP))).toBe('It’s pouring down')
  })

  it('drops the best sentence after two words, where it ranks third', () => {
    const second = beam(TRAP, 2).steps[1]
    expect(second.candidates.map((h) => h.words.join(' '))).toEqual(['It rains', 'It is', 'It’s pouring', 'It’s raining'])
  })
})

describe('length', () => {
  it('multiplied, the short No wins; per word, Yes I’m in does', () => {
    expect(sentence(best(LENGTHS, 'total'))).toBe('No')
    expect(sentence(best(LENGTHS, 'per word'))).toBe('Yes I’m in')
    expect(sentence(beam(LENGTHS, 2, 'total').result)).toBe('No')
    expect(sentence(beam(LENGTHS, 2, 'per word').result)).toBe('Yes I’m in')
  })

  it('the worked numbers', () => {
    const [no, yes, yesImIn] = WORKED
    expect(no.words).toEqual(['No', END])
    expect(no.chance).toBeCloseTo(0.36, 12)
    expect(perWord(no)).toBeCloseTo(0.6, 12)
    expect(logScore(no)).toBeCloseTo((Math.log(0.45) + Math.log(0.8)) / 2, 12)
    expect(yes.chance).toBeCloseTo(0.1375, 12)
    expect(perWord(yes)).toBeCloseTo(Math.sqrt(0.1375), 12)
    expect(yesImIn.chance).toBeCloseTo(0.33, 12)
    expect(perWord(yesImIn)).toBeCloseTo(0.33 ** 0.25, 12)
    expect(perWord(yesImIn)).toBeGreaterThan(perWord(no))
  })

  it('the quick check: the four-word reply wins per word, the two-word one multiplied', () => {
    const totals = CHECK.map(checkTotal)
    expect(totals.indexOf(Math.max(...totals))).toBe(0)
    const each = CHECK.map((c) => c.each)
    expect(each.indexOf(Math.max(...each))).toBe(2)
  })
})

// A brute force of beam search's own: every hypothesis of each length,
// ranked, top k kept, from scratch
function slowBeam(tree: Tree, k: number) {
  type H = { path: number[]; chance: number; choices: Choice[] }
  let current: H[] = [{ path: [], chance: 1, choices: tree.first }]
  const finished: H[] = []
  while (current.length) {
    const all: H[] = []
    for (const h of current) h.choices.forEach((c, i) => all.push({ path: [...h.path, i], chance: h.chance * c.p, choices: c.next }))
    const order = all.map((h, i) => [h, i] as const).sort((a, b) => b[0].chance - a[0].chance || a[1] - b[1])
    const kept = order.slice(0, k).map(([h]) => h)
    finished.push(...kept.filter((h) => h.choices.length === 0))
    current = kept.filter((h) => h.choices.length > 0)
  }
  return finished.reduce((a, b) => (b.chance > a.chance + 1e-12 ? b : a))
}

describe('on random trees', () => {
  it('matches a second, independent beam search', () => {
    const random = seeded(7)
    for (let t = 0; t < 300; t++) {
      const tree = reroll(STORY, random)
      for (const k of [1, 2, 3, 4]) expect(beam(tree, k).result.path).toEqual(slowBeam(tree, k).path)
    }
  })

  it('a beam as wide as the widest fork level is exhaustive, and never beats brute force', () => {
    const random = seeded(11)
    for (let t = 0; t < 300; t++) {
      const tree = reroll(STORY, random)
      const top = best(tree).chance
      expect(beam(tree, 4).result.chance).toBeCloseTo(top, 12)
      for (const k of [1, 2, 3]) expect(beam(tree, k).result.chance).toBeLessThanOrEqual(top + 1e-12)
    }
  })

  it('hit rates climb with width, to every tree at 4', () => {
    expect(HIT_RATES[1]).toBeLessThan(HIT_RATES[2])
    expect(HIT_RATES[2]).toBeLessThanOrEqual(HIT_RATES[3])
    expect(HIT_RATES[4]).toBe(1)
  })

  it('rerolled chances still add up to 1', () => {
    const tree = reroll(STORY, seeded(3))
    for (const fork of forks(tree.first)) expect(fork.reduce((t, c) => t + c.p, 0)).toBeCloseTo(1, 12)
  })
})

describe('the open-ended toy', () => {
  it('always taking the likeliest sentence repeats one sentence four times', () => {
    expect(new Set(LIKELIEST_TEXT.map((w) => w.text)).size).toBe(1)
    expect(LIKELIEST_TEXT.map((w) => w.p)).toEqual([0.06, 0.31, 0.58, 0.74])
  })

  it('the loop is the likeliest four sentences of all, by brute force', () => {
    const texts = FRESH.map((s) => s.text)
    let top = 0
    let topText: string[] = []
    const walk = (so: string[], chance: number) => {
      if (so.length === 4) {
        if (chance > top) [top, topText] = [chance, so]
        return
      }
      for (const t of texts) walk([...so, t], chance * sentenceChance(so, t))
    }
    walk([], 1)
    expect(topText).toEqual(LIKELIEST_TEXT.map((w) => w.text))
    expect(top).toBeCloseTo(totalOf(LIKELIEST_TEXT), 15)
  })

  it('the person’s text is far less likely', () => {
    expect(new Set(PERSON_TEXT.map((w) => w.text)).size).toBe(4)
    expect(totalOf(LIKELIEST_TEXT) / totalOf(PERSON_TEXT)).toBeGreaterThan(1e6)
  })
})
