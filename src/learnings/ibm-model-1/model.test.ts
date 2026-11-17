import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  alignments,
  best,
  bigram,
  emStep,
  ENGLISH_TEXT,
  GUESS_M,
  GUESS_N,
  links,
  linkShare,
  MENU,
  MENU_TABLES,
  menuChance,
  NONE,
  oneIn,
  PETS,
  SCORED,
  SHORT_MENU,
  SHORT_TABLES,
  spelled,
  termsAdded,
  train,
  TRAINED,
  translationChance,
  translationChanceByAlignments,
  uniform,
  WORKED,
  type Table,
} from './model'

// A random table over a few words, for the seeded checks
function randomTable(random: () => number, english: string[], french: string[]): Table {
  return Object.fromEntries(
    [NONE, ...english].map((e) => {
      const raw = french.map(() => 0.05 + random())
      const total = raw.reduce((a, b) => a + b, 0)
      return [e, Object.fromEntries(french.map((f, k) => [f, raw[k] / total]))]
    }),
  )
}

const sumOf = (row: Record<string, number>) => Object.values(row).reduce((a, b) => a + b, 0)

describe('counting alignments', () => {
  it('gives each French word n + 1 places to come from', () => {
    expect(alignments(2, 2)).toBe(9)
    expect(GUESS_N).toBe(4)
    expect(GUESS_M).toBe(4)
    expect(alignments(GUESS_N, GUESS_M)).toBe(625)
    expect(termsAdded(4, 4)).toBe(20)
    expect(WORKED.map((w) => [w.alignments, w.terms])).toEqual([
      [9, 6],
      [625, 20],
      [21 ** 20, 420],
    ])
    expect(spelled(21 ** 20)).toBe('2.8 × 10^26')
    expect(spelled(625)).toBe('625')
  })
})

describe('P(f | e)', () => {
  it('matches the sum over every alignment, worked by hand', () => {
    // "le thé" from "the tea": (a0 + a1 + a2)/3 × (b0 + b1 + b2)/3
    const table: Table = {
      [NONE]: { le: 0.5, thé: 0.5 },
      the: { le: 0.9, thé: 0.1 },
      tea: { le: 0.2, thé: 0.8 },
    }
    const byHand = ((0.5 + 0.9 + 0.2) / 3) * ((0.5 + 0.1 + 0.8) / 3)
    expect(translationChance(table, ['the', 'tea'], ['le', 'thé'])).toBeCloseTo(byHand, 12)
    expect(translationChanceByAlignments(table, ['the', 'tea'], ['le', 'thé'])).toBeCloseTo(byHand, 12)
  })

  it('matches the sum over every alignment on random tables', () => {
    const random = seeded(584)
    const english = ['a', 'b', 'c', 'd']
    const french = ['w', 'x', 'y', 'z']
    for (let trial = 0; trial < 200; trial++) {
      const table = randomTable(random, english, french)
      const pick = (words: string[]) =>
        Array.from({ length: 1 + Math.floor(random() * 4) }, () => words[Math.floor(random() * words.length)])
      const e = pick(english)
      const f = pick(french)
      const fast = translationChance(table, e, f)
      expect(translationChanceByAlignments(table, e, f)).toBeCloseTo(fast, 12)
    }
  })

  it('ignores the order of the English words', () => {
    const random = seeded(7)
    const table = randomTable(random, ['a', 'b', 'c'], ['x', 'y', 'z'])
    const one = translationChance(table, ['a', 'b', 'c'], ['x', 'y', 'z'])
    expect(translationChance(table, ['c', 'a', 'b'], ['x', 'y', 'z'])).toBeCloseTo(one, 14)
    expect(translationChance(table, ['b', 'c', 'a'], ['x', 'y', 'z'])).toBeCloseTo(one, 14)
  })
})

describe('EM', () => {
  it('starts with every link as likely', () => {
    for (const line of MENU) {
      for (const shares of links(uniform(MENU), line)) {
        for (const share of shares) expect(share).toBeCloseTo(1 / (line.english.length + 1), 12)
      }
    }
  })

  it('gives the first round’s counts, worked by hand', () => {
    // "tea" is in "the tea" (3 places: each French word gives it 1/3) and in
    // "a green tea" (4 places: 1/4 each). Tallies for tea: le 1/3, thé
    // 1/3 + 1/4, un 1/4, vert 1/4, which add up to 17/12
    const first = emStep(uniform(MENU), MENU)
    expect(first.tea['thé']).toBeCloseTo(7 / 17, 12)
    expect(first.tea.le).toBeCloseTo(4 / 17, 12)
    // "the" is in two lines of 3 places: le 2/3, thé 1/3, café 1/3
    expect(first.the.le).toBeCloseTo(0.5, 12)
  })

  it('keeps every English word’s t adding up to 1, and every link’s shares too', () => {
    for (const table of MENU_TABLES) {
      for (const row of Object.values(table)) expect(sumOf(row)).toBeCloseTo(1, 12)
      for (const line of MENU) for (const shares of links(table, line)) expect(shares.reduce((a, b) => a + b)).toBeCloseTo(1, 12)
    }
  })

  it('never lowers the menu’s chance', () => {
    for (let r = 1; r < MENU_TABLES.length; r++) {
      expect(menuChance(MENU_TABLES[r], MENU)).toBeGreaterThanOrEqual(menuChance(MENU_TABLES[r - 1], MENU) * (1 - 1e-12))
    }
    // and on random little corpora
    const random = seeded(99)
    const english = ['p', 'q', 'r', 's']
    const french = ['w', 'x', 'y', 'z']
    for (let trial = 0; trial < 30; trial++) {
      const pairs = Array.from({ length: 3 }, () => ({
        english: english.filter(() => random() < 0.6).concat('p'),
        french: french.filter(() => random() < 0.6).concat('w'),
      }))
      const tables = train(pairs, 8)
      for (let r = 1; r < tables.length; r++) {
        expect(menuChance(tables[r], pairs)).toBeGreaterThanOrEqual(menuChance(tables[r - 1], pairs) * (1 - 1e-12))
      }
    }
  })

  it('finds every word’s partner on the menu', () => {
    expect(TRAINED.the.le).toBeGreaterThan(0.99)
    expect(TRAINED.tea['thé']).toBeGreaterThan(0.99)
    expect(TRAINED.coffee['café']).toBeGreaterThan(0.99)
    expect(TRAINED.a.un).toBeGreaterThan(0.99)
    expect(TRAINED.green.vert).toBeGreaterThan(0.99)
    // What the story says: after one round, "le" leans 51% on "the"
    expect(Math.round(100 * linkShare(MENU_TABLES[1], MENU[0], 'le', 'the'))).toBe(51)
    expect(Math.round(100 * linkShare(TRAINED, MENU[3], 'vert', 'green'))).toBe(100)
  })

  it('can never tell apart two words that only appear together', () => {
    for (const table of SHORT_TABLES) expect(table.a).toEqual(table.green)
    expect(SHORT_TABLES.at(-1)!.a.un).toBeCloseTo(0.5, 3)
    expect(SHORT_TABLES.at(-1)!.a.un).toBeCloseTo(SHORT_TABLES.at(-1)!.a.vert, 3)
    const pets = train(PETS, 20)
    for (const table of pets) expect(table.cat).toEqual(table.black)
    expect(pets.at(-1)!.dog.chien).toBeGreaterThan(0.99)
    expect(pets.at(-1)!.cat.chat).toBeCloseTo(0.5, 3)
    expect(SHORT_MENU).toHaveLength(3)
  })
})

describe('the noisy channel', () => {
  it('counts the language model by hand', () => {
    const lm = bigram(ENGLISH_TEXT)
    // the|<s> 4/8, green|the 1/4, tea|green 1/3, </s>|tea 3/3
    expect(lm(['the', 'green', 'tea'])).toBeCloseTo(1 / 24, 12)
    expect(lm(['the', 'tea'])).toBeCloseTo(1 / 8, 12)
    expect(lm(['a', 'green', 'tea'])).toBeCloseTo(1 / 12, 12)
    expect(lm(['the', 'tea', 'green'])).toBe(0)
  })

  it('needs both halves to pick the right translation', () => {
    expect(best('Translation model')).toEqual(['the green tea', 'the tea green'])
    expect(best('Language model')).toEqual(['the tea'])
    expect(best('Both')).toEqual(['the green tea'])
    expect(SCORED[0].translation).toBeCloseTo(SCORED[1].translation, 14)
  })
})

describe('oneIn', () => {
  it('rounds to two significant figures', () => {
    expect(oneIn(1 / 8)).toBe('1 in 8')
    expect(oneIn(1 / 41.1)).toBe('1 in 41')
    expect(oneIn(1 / 2448)).toBe('1 in 2,400')
    expect(oneIn(0)).toBe('never')
    expect(SCORED.map((row) => oneIn(row.both))).toEqual(['1 in 990', 'never', '1 in 2,400', '1 in 810,000'])
  })
})
