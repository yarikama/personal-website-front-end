import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  AFTER_WATCH,
  BIGRAM,
  chance,
  END,
  fraction,
  grams,
  HEARD,
  hops,
  MODELS,
  NEW,
  nextChances,
  oneIn,
  ORDERS,
  prefixes,
  repeatShare,
  sample,
  seenEntries,
  SHORT,
  spelled,
  START,
  tableSize,
  TINY_CHANCE,
  train,
  vocabulary,
  WATCH_COUNT,
  watchSpots,
  words,
  type Model,
} from './model'

// Every sentence a model can write, with its chance, by walking every
// branch of the counts (the café's models never loop, so this ends)
function everySentence(model: Model, most = 12): Map<string, number> {
  const out = new Map<string, number>()
  const walk = (context: string[], said: string[], p: number) => {
    if (said.length > most) return
    for (const { next, chance: q } of nextChances(model, context.slice(context.length - (model.n - 1)))) {
      if (next === END) out.set(said.join(' '), (out.get(said.join(' ')) ?? 0) + p * q)
      else walk([...context, next], [...said, next], p * q)
    }
  }
  walk(
    Array.from({ length: model.n - 1 }, () => START),
    [],
    1,
  )
  return out
}

// The count of a run of tokens in a text, by sliding along every sentence:
// a second way to count, to referee train()
function occurrences(sentences: readonly string[], run: string[], n: number): number {
  let found = 0
  for (const s of sentences) {
    const tokens = [...Array.from({ length: Math.max(1, n - 1) }, () => START), ...words(s), END]
    for (let i = 0; i + run.length <= tokens.length; i++) {
      if (tokens.slice(i, i + run.length).join(' ') === run.join(' ')) found++
    }
  }
  return found
}

describe('the café’s orders', () => {
  it('are twelve, over ten words, and never include the new order', () => {
    expect(ORDERS).toHaveLength(12)
    expect(vocabulary(ORDERS)).toHaveLength(10)
    expect(ORDERS).not.toContain(NEW)
    expect(ORDERS).toContain(HEARD)
    expect(ORDERS).toContain(SHORT)
  })

  it('cut a sentence into (context, next) pairs with start and end marks', () => {
    expect(grams('a b', 1)).toEqual([
      { context: [], next: 'a' },
      { context: [], next: 'b' },
      { context: [], next: END },
    ])
    expect(grams('a b', 2).map((g) => g.context)).toEqual([[START], ['a'], ['b']])
    expect(grams('a b', 3).map((g) => g.context)).toEqual([
      [START, START],
      [START, 'a'],
      ['a', 'b'],
    ])
  })
})

describe('matching whole starts of an order', () => {
  it('finds fewer orders the longer the start: 10, 6, 2, 1', () => {
    expect(prefixes(NEW).map((p) => p.matching.length)).toEqual([10, 6, 2, 1])
  })

  it('leaves "milk" no chance after "a large tea with": the one match went on to lemon', () => {
    expect(prefixes(NEW).at(-1)!.next).toEqual(['lemon'])
  })
})

describe('the tally after "with"', () => {
  it('is milk 4, lemon 2, honey 2, of 8', () => {
    expect(WATCH_COUNT).toBe(8)
    expect(AFTER_WATCH.map((r) => [r.next, r.count])).toEqual([
      ['milk', 4],
      ['lemon', 2],
      ['honey', 2],
    ])
    expect(AFTER_WATCH[0].chance).toBe(0.5)
    expect(watchSpots).toHaveLength(8)
  })
})

describe('the bigram model, worked by hand', () => {
  it('gives each hop of the new order its count over its context’s count', () => {
    expect(hops(BIGRAM, NEW).map((h) => [h.next, h.count, h.of])).toEqual([
      ['a', 10, 12],
      ['large', 6, 10],
      ['tea', 2, 6],
      ['with', 3, 4],
      ['milk', 4, 8],
      [END, 3, 4],
    ])
  })

  it('gives the new order 3/64, about 1 in 21', () => {
    expect(chance(BIGRAM, NEW)).toBeCloseTo(3 / 64, 12)
    expect(fraction(chance(BIGRAM, NEW))).toBe('3/64')
    expect(oneIn(chance(BIGRAM, NEW))).toBe('1 in 21')
  })

  it('gives the heard order 5/64 and the short heard one 1/24, less than the new one', () => {
    expect(chance(BIGRAM, HEARD)).toBeCloseTo(5 / 64, 12)
    expect(chance(BIGRAM, SHORT)).toBeCloseTo(1 / 24, 12)
    expect(chance(BIGRAM, SHORT)).toBeLessThan(chance(BIGRAM, NEW))
  })

  it('gives "go home" 1/3 from the three-sentence text', () => {
    expect(TINY_CHANCE).toBeCloseTo(1 / 3, 12)
  })
})

describe('unigram and trigram on the same orders', () => {
  const [unigram, , trigram] = MODELS

  it('unigram can’t tell an order from its words jumbled', () => {
    const jumbled = words(HEARD).reverse().join(' ')
    expect(chance(unigram, jumbled)).toBeCloseTo(chance(unigram, HEARD), 15)
    expect(chance(BIGRAM, jumbled)).toBe(0)
  })

  it('trigram gives the new order nothing: "tea with" never went on to milk', () => {
    expect(chance(trigram, NEW)).toBe(0)
    expect(hops(trigram, NEW).find((h) => h.next === 'milk')).toMatchObject({ count: 0, of: 3 })
  })

  it('a model that looks back over the whole order just gives back the orders it heard, by their share', () => {
    const whole = train(ORDERS, 8)
    const all = everySentence(whole)
    for (const order of new Set(ORDERS)) {
      expect(all.get(order)).toBeCloseTo(ORDERS.filter((o) => o === order).length / ORDERS.length, 12)
    }
    expect([...all.keys()].every((s) => (ORDERS as readonly string[]).includes(s))).toBe(true)
    expect(chance(whole, NEW)).toBe(0)
  })
})

describe('every model is a distribution', () => {
  it('its next-word chances add to 1 after every context', () => {
    for (const model of MODELS) {
      for (const row of model.counts.keys()) {
        const sum = nextChances(model, row ? row.split(' ') : []).reduce((s, r) => s + r.chance, 0)
        expect(sum).toBeCloseTo(1, 12)
      }
    }
  })

  it('the chances of every sentence the bigram and trigram can write add to 1', () => {
    for (const model of [BIGRAM, MODELS[2]]) {
      const all = everySentence(model)
      expect([...all.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
      for (const [sentence, p] of all) expect(chance(model, sentence)).toBeCloseTo(p, 12)
    }
  })

  it('samples orders as often as their chance says', () => {
    const random = seeded(7)
    const draws = 20000
    const seen = new Map<string, number>()
    for (let i = 0; i < draws; i++) {
      const s = sample(BIGRAM, random)
      seen.set(s, (seen.get(s) ?? 0) + 1)
    }
    for (const s of [NEW, HEARD, SHORT]) expect((seen.get(s) ?? 0) / draws).toBeCloseTo(chance(BIGRAM, s), 2)
  })
})

describe('counting, against a second way to count', () => {
  it('matches occurrences of each pair over occurrences of its context, on random texts', () => {
    const random = seeded(42)
    const pool = ['x', 'y', 'z', 'w']
    for (let trial = 0; trial < 50; trial++) {
      const text = Array.from({ length: 2 + Math.floor(random() * 6) }, () =>
        Array.from({ length: 1 + Math.floor(random() * 5) }, () => pool[Math.floor(random() * pool.length)]).join(' '),
      )
      for (const n of [2, 3]) {
        const model = train(text, n)
        for (const sentence of text) {
          for (const hop of hops(model, sentence)) {
            expect(hop.count).toBe(occurrences(text, [...hop.context, hop.next], n))
            // A context's count is how often it is followed by anything:
            // every occurrence except one at a sentence's very end
            const ends = text.filter((s) => {
              const t = [...Array.from({ length: Math.max(1, n - 1) }, () => START), ...words(s), END]
              return t.slice(t.length - hop.context.length).join(' ') === hop.context.join(' ')
            }).length
            expect(hop.of).toBe(occurrences(text, hop.context, n) - ends)
          }
        }
      }
    }
  })
})

describe('the size of the tables', () => {
  it('is V, V², V³', () => {
    expect(tableSize(10_000, 1)).toBe(1e4)
    expect(tableSize(10_000, 2)).toBe(1e8)
    expect(tableSize(10_000, 3)).toBe(1e12)
    expect(tableSize(20_000, 3)).toBe(8e12)
  })

  it('spells big numbers', () => {
    expect(spelled(1e4)).toBe('10 thousand')
    expect(spelled(1e8)).toBe('100 million')
    expect(spelled(1e12)).toBe('1 trillion')
    expect(spelled(8e12)).toBe('8 trillion')
  })

  it('fills fewer of its entries the longer the context', () => {
    const filled = MODELS.map((m, i) => seenEntries(m) / tableSize(11, i + 1))
    expect(filled[0]).toBeGreaterThan(filled[1])
    expect(filled[1]).toBeGreaterThan(filled[2])
  })
})

describe('repeating what it heard', () => {
  it('grows with n: the trigram mostly repeats orders, the unigram rarely', () => {
    const shares = MODELS.map((m) => repeatShare(m, seeded(1)))
    expect(shares[0]).toBeLessThan(shares[1])
    expect(shares[1]).toBeLessThan(shares[2])
  })
})
