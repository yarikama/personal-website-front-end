import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  backprop,
  blame,
  carried,
  CHECK,
  checkRatio,
  CLUE,
  CORPUS,
  corpusLoss,
  encode,
  fraction,
  FIRST_NOUNS,
  GROW,
  HIDDEN,
  initRnn,
  KEEP,
  longSentence,
  nounFade,
  oneIn,
  PAGES,
  RATE,
  read,
  recurrentWeights,
  RUNS,
  SECOND_NOUNS,
  sentenceLoss,
  SENTENCES,
  SHRINK,
  SIZES,
  softmax,
  STORY_SURPRISE,
  survives,
  tableEntries,
  train,
  TRAIN_STEPS,
  verbChances,
  VOCAB,
  windowWeights,
  WORKED_STEPS,
  type Rnn,
} from './model'

describe('the story', () => {
  it('leaves 1 in 262,144 of the clue on the last card', () => {
    expect(carried(KEEP, CLUE, PAGES)).toBe(1 / 262_144)
    expect(oneIn(carried(KEEP, CLUE, PAGES))).toBe('1 in 262,144')
    expect(oneIn(carried(KEEP, 15, PAGES))).toBe('1 in 32')
  })

  it('has a guess for every page, worst on the last', () => {
    expect(STORY_SURPRISE).toHaveLength(PAGES)
    expect(Math.max(...STORY_SURPRISE)).toBe(STORY_SURPRISE[PAGES - 1])
  })
})

describe('counting against a network', () => {
  it('needs 10^50 entries for 10-word runs over 100,000 words', () => {
    expect(Math.log10(tableEntries(100_000, 10))).toBeCloseTo(50, 10)
  })

  it('has about 5 million weights where a table has 1.6 × 10^17 entries', () => {
    const { vocab, dim, context, hidden } = SIZES
    expect(tableEntries(vocab, context + 1)).toBe(1.6e17)
    // 1,000,000 word vectors + 200 × 150 + 200 + 20,000 × 200 + 20,000
    expect(windowWeights(vocab, dim, context, hidden)).toBe(5_050_200)
    // The loop swaps the window's 30,000 for 10,000 + 40,000, whatever the length
    expect(recurrentWeights(vocab, dim, hidden)).toBe(5_070_200)
  })
})

describe('the one line of math', () => {
  it('halves the blame each step at a weight of 2', () => {
    expect(SHRINK.weight * SHRINK.slope).toBe(0.5)
    expect(WORKED_STEPS.map((k) => survives(SHRINK.weight, SHRINK.slope, k))).toEqual([0.25, 0.015625, 1 / 262_144])
    expect(WORKED_STEPS.map((k) => fraction(survives(SHRINK.weight, SHRINK.slope, k)))).toEqual(['1/4', '1/64', '1/262,144'])
  })

  it('grows it about 1,500 times over 18 steps at a weight of 6', () => {
    expect(survives(GROW.weight, GROW.slope, 18)).toBeCloseTo(1477.9, 1)
  })

  it('makes a clue 30 words back about 400 times weaker than one 3 back', () => {
    expect(checkRatio()).toBeCloseTo(CHECK.keep ** -27, 6)
    expect(Math.round(checkRatio())).toBe(414)
  })

  it('never lets the sigmoid slope pass a quarter', () => {
    for (let x = -6; x <= 6; x += 0.01) {
      const s = 1 / (1 + Math.exp(-x))
      expect(s * (1 - s)).toBeLessThanOrEqual(0.25 + 1e-12)
    }
  })
})

describe('the recurrent language model', () => {
  it('has twelve sentences that all encode to known words', () => {
    expect(CORPUS).toHaveLength(12)
    for (const tokens of SENTENCES) {
      expect(tokens.every((x) => x >= 0)).toBe(true)
      expect(VOCAB[tokens[0]]).toBe('<s>')
      expect(VOCAB[tokens.at(-1)!]).toBe('</s>')
    }
  })

  it('builds only sentences from the corpus in the lab', () => {
    for (const first of FIRST_NOUNS) for (const second of SECOND_NOUNS) expect(CORPUS).toContain(longSentence(first, second))
  })

  it('guesses evenly with every weight at zero', () => {
    const zero = initRnn(1, 0)
    const run = read(zero, encode('the dog runs'))
    expect(run.memories).toHaveLength(4)
    for (const p of run.chances) for (const x of p) expect(x).toBeCloseTo(1 / VOCAB.length, 12)
    expect(sentenceLoss(zero, encode('the dog runs'))).toBeCloseTo(4 * Math.log(VOCAB.length), 10)
  })

  it('turns scores into chances that add up to 1', () => {
    const p = softmax([1, 2, 3, 1000])
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
    expect(p[3]).toBeCloseTo(1, 12)
  })
})

// Brute force: nudge one weight both ways and watch the loss
const numeric = (rnn: Rnn, tokens: number[], set: (r: Rnn, by: number) => void) => {
  const eps = 1e-5
  const up = structuredClone(rnn)
  set(up, eps)
  const down = structuredClone(rnn)
  set(down, -eps)
  return (sentenceLoss(up, tokens) - sentenceLoss(down, tokens)) / (2 * eps)
}

describe('backpropagation through time', () => {
  it('matches brute-force gradients for every kind of weight, on random networks', () => {
    const random = seeded(11)
    const pick = (n: number) => Math.floor(random() * n)
    for (let trial = 0; trial < 20; trial++) {
      const rnn = initRnn(100 + trial, 1)
      rnn.bias = rnn.bias.map(() => random() - 0.5)
      const tokens = SENTENCES[pick(SENTENCES.length)]
      const { grad } = backprop(rnn, tokens)
      const [i, j, v, x] = [pick(HIDDEN), pick(HIDDEN), pick(VOCAB.length), tokens[pick(tokens.length - 1)]]
      expect(grad.memory[i][j]).toBeCloseTo(numeric(rnn, tokens, (r, by) => (r.memory[i][j] += by)), 6)
      expect(grad.input[i][x]).toBeCloseTo(numeric(rnn, tokens, (r, by) => (r.input[i][x] += by)), 6)
      expect(grad.bias[i]).toBeCloseTo(numeric(rnn, tokens, (r, by) => (r.bias[i] += by)), 6)
      expect(grad.output[v][j]).toBeCloseTo(numeric(rnn, tokens, (r, by) => (r.output[v][j] += by)), 6)
      expect(grad.outBias[v]).toBeCloseTo(numeric(rnn, tokens, (r, by) => (r.outBias[v] += by)), 6)
    }
  })

  it('sends back the blame that brute force measures at each memory', () => {
    const random = seeded(12)
    for (let trial = 0; trial < 10; trial++) {
      const rnn = initRnn(200 + trial, 1.5)
      const tokens = SENTENCES[4 + (trial % 8)]
      const t = tokens.length - 3
      const b = blame(rnn, tokens, t)
      expect(b).toHaveLength(t + 1)
      const k = Math.floor(random() * (t + 1))
      // The gradient of the loss of guess t at memory k, one direction at a time
      const eps = 1e-6
      const grad = Array.from({ length: HIDDEN }, (_, i) => {
        const by = Array.from({ length: HIDDEN }, (_, j) => (j === i ? eps : 0))
        const up = read(rnn, tokens, { at: k, by }).losses[t]
        const down = read(rnn, tokens, { at: k, by: by.map((x) => -x) }).losses[t]
        return (up - down) / (2 * eps)
      })
      expect(b[k]).toBeCloseTo(Math.hypot(...grad), 6)
    }
  })
})

describe('the two trained runs', () => {
  const before = { A: corpusLoss(initRnn(RUNS.A)), B: corpusLoss(initRnn(RUNS.B)) }
  const a = train(initRnn(RUNS.A), SENTENCES, TRAIN_STEPS, RATE)
  const b = train(initRnn(RUNS.B), SENTENCES, TRAIN_STEPS, RATE)
  const long = FIRST_NOUNS.flatMap((first) => SECOND_NOUNS.map((second) => longSentence(first, second)))

  it('both learn, from the same sentences', () => {
    expect(corpusLoss(a)).toBeLessThan(before.A / 2)
    expect(corpusLoss(b)).toBeLessThan(before.B / 2)
  })

  it('A gets the last verb right in every long sentence, B guesses', () => {
    for (const sentence of long) {
      expect(verbChances(a, sentence).right).toBeGreaterThan(0.95)
      expect(verbChances(b, sentence).right).toBeLessThan(0.6)
    }
  })

  it('B’s blame reaches the first noun hundreds of times weaker; A’s does not fade', () => {
    for (const sentence of long) {
      expect(nounFade(b, sentence)).toBeGreaterThan(100)
      expect(nounFade(a, sentence)).toBeLessThan(10)
    }
  })
})
