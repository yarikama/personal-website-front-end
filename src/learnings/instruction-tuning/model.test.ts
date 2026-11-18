import { describe, expect, it } from 'vitest'
import { seeded } from '../../components/explain/random'
import {
  ANSWERS_ONLY,
  chat,
  EVERY_TOKEN,
  EXAMPLE_NAMES,
  EXAMPLES,
  MODES,
  score,
  STORY_TOKENS,
  surprise,
  TAGS,
  WORKED,
  type Turn,
} from './model'

describe('the story’s slip, worked by hand', () => {
  it('is eighteen tokens: seven of prompt after the opening tag, ten of answer', () => {
    expect(STORY_TOKENS.length).toBe(18)
    expect(STORY_TOKENS.map((t) => t.text).join(' ')).toBe(
      '<|user|> Name three rivers in Spain . <|assistant|> The Tagus , the Ebro and the Douro . <|end|>',
    )
    expect(STORY_TOKENS.filter((t) => t.part === 'response').length).toBe(10)
  })

  it('scores the ten answer tokens, end tag included, at 1.12 a token', () => {
    expect(ANSWERS_ONLY.scored).toBe(10)
    // 1.204 + 1.609 + 0.511 + 0.357 + 1.204 + 0.511 + 0.105 + 0.916 + 0.223 + 4.605 = 11.245
    expect(ANSWERS_ONLY.loss).toBeCloseTo(1.1245, 3)
    expect(ANSWERS_ONLY.promptShare).toBe(0)
    const last = ANSWERS_ONLY.tokens.at(-1)
    expect(last?.text).toBe(TAGS.end)
    expect(last?.scored).toBe(true)
  })

  it('would take two thirds of its loss from the prompt if every token counted', () => {
    expect(EVERY_TOKEN.scored).toBe(17)
    // prompt: 3.912 + 2.996 + 4.605 + 0.916 + 3.507 + 0.693 + 6.908 = 23.537
    expect(EVERY_TOKEN.loss).toBeCloseTo((23.537 + 11.245) / 17, 2)
    expect(EVERY_TOKEN.promptShare).toBeCloseTo(23.537 / (23.537 + 11.245), 3)
    expect(Math.round(EVERY_TOKEN.promptShare * 100)).toBe(68)
  })

  it('works three of the answer’s tokens: 0.11, 1.61 and 4.61', () => {
    expect(WORKED.map((w) => w.text)).toEqual(['the', 'Tagus', TAGS.end])
    expect(WORKED.map((w) => w.cost.toFixed(2))).toEqual(['0.11', '1.61', '4.61'])
  })

  it('never scores the opening tag, which nothing comes before', () => {
    for (const name of EXAMPLE_NAMES)
      for (const mode of MODES) expect(score(EXAMPLES[name], mode).tokens[0].scored).toBe(false)
  })

  it('scores both answers in two turns, and neither question', () => {
    const s = score(EXAMPLES['Two turns'], 'Answers only')
    expect(s.tokens.filter((t) => t.scored && t.text === TAGS.end).length).toBe(2)
    expect(s.tokens.some((t) => t.scored && t.part === 'prompt')).toBe(false)
    expect(s.scored).toBe(10 + 4)
  })
})

// Random conversations against the loss written out directly
function randomChat(random: () => number): Turn[] {
  const words = () =>
    Array.from({ length: 1 + Math.floor(random() * 6) }, (_, i): [string, number] => [`w${i}`, 0.01 + 0.98 * random()])
  const turns: Turn[] = []
  const pairs = 1 + Math.floor(random() * 3)
  for (let i = 0; i < pairs; i++) turns.push({ user: words() }, { assistant: words() })
  return turns
}

describe('the scoring, on random conversations', () => {
  it('matches the mean of minus log chance over the response tokens', () => {
    const random = seeded(646)
    for (let n = 0; n < 300; n++) {
      const tokens = chat(randomChat(random))
      const response = tokens.filter((t) => t.part === 'response')
      const brute = response.reduce((s, t) => s - Math.log(t.chance as number), 0) / response.length
      expect(score(tokens, 'Answers only').loss).toBeCloseTo(brute, 10)
      const all = tokens.slice(1)
      const bruteAll = all.reduce((s, t) => s + surprise(t.chance as number), 0) / all.length
      expect(score(tokens, 'Every token').loss).toBeCloseTo(bruteAll, 10)
    }
  })

  it('ignores the prompt’s chances when scoring answers only', () => {
    const random = seeded(17)
    for (let n = 0; n < 200; n++) {
      const tokens = chat(randomChat(random))
      const changed = tokens.map((t, i) => (t.part === 'prompt' && i > 0 ? { ...t, chance: 0.01 + 0.98 * random() } : t))
      expect(score(changed, 'Answers only').loss).toBeCloseTo(score(tokens, 'Answers only').loss, 10)
      const share = score(changed, 'Every token').promptShare
      expect(share).toBeGreaterThan(0)
      expect(share).toBeLessThan(1)
    }
  })

  it('ends every assistant turn with an end tag that is scored', () => {
    const random = seeded(3)
    for (let n = 0; n < 100; n++) {
      const turns = randomChat(random)
      const s = score(chat(turns), 'Answers only')
      const answers = turns.filter((t) => 'assistant' in t).length
      expect(s.tokens.filter((t) => t.text === TAGS.end && t.scored).length).toBe(answers)
    }
  })
})
