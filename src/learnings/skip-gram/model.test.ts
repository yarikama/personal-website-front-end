import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  alike,
  CHECK_COUNTS,
  CORPUS,
  cosine,
  COUNTS,
  DEFAULTS,
  dot,
  draw,
  found,
  idOf,
  LOOKALIKES,
  mostAlike,
  neighboursOf,
  noiseShares,
  nudge,
  objective,
  oneVectorRun,
  PAIRS,
  pairsOf,
  plus,
  POWER,
  runFor,
  sampledCost,
  SENTENCES,
  sigmoid,
  softmax,
  STORY_FRAMES,
  STORY_NOISE,
  STORY_NOISE_WORDS,
  STORY_NUDGE,
  STORY_ORDER,
  STORY_PULLED,
  STORY_PUSHED,
  STORY_REAL,
  STORY_RUN,
  STORY_V,
  TOKENS,
  train,
  treeCost,
  VOCAB,
  WORKED,
  WORKED_TOTAL,
  type Vec,
} from './model'

const close = (a: number, b: number, digits = 9) => expect(a).toBeCloseTo(b, digits)
const vectorOf = (random: () => number, n: number): Vec => Array.from({ length: n }, () => 2 * random() - 1)

describe('the twelve sentences', () => {
  it('have 58 words of text and 16 different words, “the” 14 times', () => {
    expect(SENTENCES).toHaveLength(12)
    expect(TOKENS).toBe(58)
    expect(VOCAB).toHaveLength(16)
    expect(COUNTS[idOf('the')]).toBe(14)
    expect(COUNTS.reduce((a, b) => a + b, 0)).toBe(TOKENS)
  })

  it('never put two look-alikes in one sentence', () => {
    for (const [a, b] of LOOKALIKES) {
      for (const sentence of CORPUS) expect(sentence.split(' ').includes(a) && sentence.split(' ').includes(b)).toBe(false)
    }
  })

  it('pair each word with the words up to two places either side', () => {
    const named = pairsOf('the cat drinks milk'.split(' ')).map(([a, b]) => `${VOCAB[a]} ${VOCAB[b]}`)
    expect(named).toEqual([
      'the cat',
      'the drinks',
      'cat the',
      'cat drinks',
      'cat milk',
      'drinks the',
      'drinks cat',
      'drinks milk',
      'milk cat',
      'milk drinks',
    ])
  })

  it('give 160 pairs: 10 from a four-word sentence, 14 from five, 18 from six', () => {
    const bySize: Record<number, number> = { 4: 10, 5: 14, 6: 18 }
    expect(SENTENCES.reduce((sum, s) => sum + bySize[s.length], 0)).toBe(160)
    expect(PAIRS).toHaveLength(160)
  })

  it('pair the same number of words both ways', () => {
    const forth = PAIRS.map(([a, b]) => `${a} ${b}`).sort()
    const back = PAIRS.map(([a, b]) => `${b} ${a}`).sort()
    expect(forth).toEqual(back)
  })
})

describe('scores and chances', () => {
  it('turn a score of 0 into an even chance', () => {
    close(sigmoid(0), 0.5)
    close(sigmoid(2) + sigmoid(-2), 1)
  })

  it('share a softmax out over every word, by e to each score', () => {
    const v = [1, 0]
    const chances = softmax(v, [
      [1, 0],
      [0, 1],
    ])
    close(chances[0], Math.E / (Math.E + 1))
    close(chances[0] + chances[1], 1)
  })

  it('give the most alike a cosine of 1 with itself and sort the rest', () => {
    close(cosine([3, 4], [6, 8]), 1)
    close(cosine([1, 0], [0, 2]), 0)
    const ranked = alike(STORY_RUN.v, 'cat')
    expect(ranked).toHaveLength(VOCAB.length - 1)
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1].cosine).toBeGreaterThanOrEqual(ranked[i].cosine)
  })
})

describe('noise words', () => {
  it('match the counts at power 1 and are even at power 0', () => {
    noiseShares(1).forEach((share, i) => close(share, COUNTS[i] / TOKENS))
    noiseShares(0).forEach((share) => close(share, 1 / 16))
  })

  it('at power ¾ shrink “the” from 24.1% to 17.9% and grow “naps” from 3.4% to 4.2%', () => {
    const sum = COUNTS.reduce((s, n) => s + n ** 0.75, 0)
    close(noiseShares(POWER)[idOf('the')], 14 ** 0.75 / sum)
    expect((100 * noiseShares(1)[idOf('the')]).toFixed(1)).toBe('24.1')
    expect((100 * noiseShares(POWER)[idOf('the')]).toFixed(1)).toBe('17.9')
    expect((100 * noiseShares(1)[idOf('naps')]).toFixed(1)).toBe('3.4')
    expect((100 * noiseShares(POWER)[idOf('naps')]).toFixed(1)).toBe('4.2')
  })

  it('split 81 against 1 as 27 to 1', () => {
    close(noiseShares(POWER, CHECK_COUNTS)[0], 27 / 28)
    close(noiseShares(1, CHECK_COUNTS)[0], 81 / 82)
  })

  it('are drawn as often as their shares say', () => {
    const random = seeded(11)
    const shares = noiseShares(POWER)
    const seen = shares.map(() => 0)
    const n = 40_000
    for (let i = 0; i < n; i++) seen[draw(random, shares)]++
    seen.forEach((count, i) => expect(Math.abs(count / n - shares[i])).toBeLessThan(0.01))
  })
})

describe('one nudge', () => {
  it('climbs the objective: each move is rate × its slope, checked by finite differences', () => {
    const random = seeded(5)
    const h = 1e-6
    const rate = 0.1
    for (let trial = 0; trial < 50; trial++) {
      const dims = 2 + Math.floor(random() * 6)
      const v = vectorOf(random, dims)
      const real = vectorOf(random, dims)
      const noise = Array.from({ length: 1 + Math.floor(random() * 4) }, () => vectorOf(random, dims))
      const moved = nudge(v, real, noise, rate)
      const slope = (f: (x: number) => number) => (f(h) - f(-h)) / (2 * h)
      for (let d = 0; d < dims; d++) {
        const shift = (x: Vec, by: number) => x.map((y, j) => (j === d ? y + by : y))
        const vMove = moved.vPull[d] + moved.vPush[d]
        close(vMove, rate * slope((e) => objective(shift(v, e), real, noise)), 5)
        close(moved.real[d] - real[d], rate * slope((e) => objective(v, shift(real, e), noise)), 5)
        noise.forEach((u, j) => {
          const others = (e: number) => noise.map((w, i) => (i === j ? shift(w, e) : w))
          close(moved.noise[j][d] - u[d], rate * slope((e) => objective(v, real, others(e))), 5)
        })
      }
      // A small step raises the objective
      const after = nudge(v, real, noise, 0.01)
      expect(objective(plus(v, after.vPull, after.vPush), after.real, after.noise)).toBeGreaterThan(objective(v, real, noise))
    }
  })

  it('in the story: three different noise words never seen near cat', () => {
    expect(STORY_NOISE_WORDS).toEqual(['water', 'rug', 'you'])
    for (const word of STORY_NOISE_WORDS) expect(neighboursOf('cat')).not.toContain(word)
    expect(neighboursOf('cat')).toContain(STORY_REAL.word)
  })

  it('in the story: the pull raises drinks’s chance and the push lowers each noise word’s', () => {
    const before = sigmoid(dot(STORY_REAL.u, STORY_V))
    expect(sigmoid(dot(STORY_NUDGE.real, STORY_PULLED))).toBeGreaterThan(before + 0.15)
    STORY_NOISE.forEach((n, j) => {
      expect(sigmoid(dot(STORY_NUDGE.noise[j], STORY_PUSHED))).toBeLessThan(sigmoid(dot(n.u, STORY_V)))
    })
    // The noise word pointing most like cat is pushed hardest
    const moved = STORY_NOISE.map((n, j) => Math.hypot(STORY_NUDGE.noise[j][0] - n.u[0], STORY_NUDGE.noise[j][1] - n.u[1]))
    expect(moved[0]).toBe(Math.max(...moved))
  })
})

describe('training on the twelve sentences', () => {
  it('is the same every time for a seed', () => {
    expect(train(DEFAULTS, 3).v).toEqual(train(DEFAULTS, 3).v)
  })

  it('finds cat ~ dog, milk ~ water and sofa ~ rug in the story’s run', () => {
    expect(found(STORY_RUN.v)).toBe(3)
    expect(mostAlike(STORY_RUN.v, 'cat')).toBe('dog')
    expect(STORY_ORDER[0]).toBe('dog')
    // It starts with nothing alike and ends far apart from the rest
    expect(Math.abs(STORY_FRAMES[0][0])).toBeLessThan(0.5)
    expect(STORY_FRAMES.at(-1)![0]).toBeGreaterThan(STORY_FRAMES.at(-1)![1] + 0.1)
  })

  it('finds all three for every one of 10 seeds, with 1, 3 or 10 noise words', () => {
    for (const k of [1, 3, 10]) {
      for (let seed = 1; seed <= 10; seed++) expect(found(train({ ...DEFAULTS, k, seed }).v), `k ${k} seed ${seed}`).toBe(3)
    }
  }, 30_000)

  it('without noise words, turns every word the same way', () => {
    const run = runFor({ ...DEFAULTS, k: 0 })
    expect(found(run.v)).toBeLessThan(3)
    const cosines = alike(run.v, 'cat').map((entry) => entry.cosine)
    expect(cosines.reduce((a, b) => a + b, 0) / cosines.length).toBeGreaterThan(0.6)
  })

  it('with one vector a word, makes cat most like a neighbour, for every seed tried', () => {
    expect(mostAlike(oneVectorRun().v, 'cat')).toBe('milk')
    for (let seed = 1; seed <= 6; seed++) {
      for (const k of [1, 3, 10]) {
        const run = train({ ...DEFAULTS, k, seed, vectors: 1 })
        expect(found(run.v), `k ${k} seed ${seed}`).toBeLessThan(3)
      }
      expect(neighboursOf('cat')).toContain(mostAlike(train({ ...DEFAULTS, seed, vectors: 1 }).v, 'cat'))
    }
  }, 30_000)

  it('gives each lab setting the result its caption describes', () => {
    for (const k of [1, 3, 10]) expect(found(runFor({ ...DEFAULTS, k }).v)).toBe(3)
    for (const k of [0, 1, 3, 10]) expect(found(runFor({ ...DEFAULTS, k, vectors: 1 }).v)).toBeLessThan(3)
  }, 30_000)
})

describe('the worked numbers', () => {
  it('score drinks, a real neighbour of cat, over ten times as likely as two words never near it', () => {
    const [real, ...noise] = WORKED
    expect(real.word).toBe('drinks')
    expect(real.real).toBe(true)
    for (const w of noise) {
      expect(w.real).toBe(false)
      expect(real.chance).toBeGreaterThan(10 * w.chance)
    }
    close(real.adds, Math.log(real.chance))
    close(noise[0].adds, Math.log(1 - noise[0].chance))
    close(WORKED_TOTAL, WORKED.reduce((s, w) => s + w.adds, 0))
    close(WORKED_TOTAL, objective(STORY_RUN.v[idOf('cat')], STORY_RUN.u[idOf('drinks')], noise.map((w) => STORY_RUN.u[idOf(w.word)])))
  })

  it('cost 6 scores a pair with 5 noise words, about 19 with a tree, 692,000 in full', () => {
    expect(sampledCost(5)).toBe(6)
    expect(treeCost(692_000)).toBe(19)
  })
})
