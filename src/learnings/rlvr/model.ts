import { seeded } from '../../components/explain/random'

// Every number the page states. The figures only draw.

// --- A group of answers and their advantages ---------------------------------

export const GROUP = 8

export const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length

// How spread the scores are: the standard deviation over the group, dividing
// by the group's size (as the lecture and the DeepSeek papers' formula read)
export function spread(values: number[]): number {
  const m = mean(values)
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)))
}

export interface Scored {
  mean: number
  spread: number
  advantages: number[]
}

// GRPO's group-relative advantage: each score minus the group's mean, over
// the group's spread. A group whose scores are all the same has nothing to
// compare, so every advantage is 0 (code adds a tiny number to the spread
// for the same effect).
export function score(rewards: number[]): Scored {
  const m = mean(rewards)
  const s = spread(rewards)
  return { mean: m, spread: s, advantages: rewards.map((r) => (s === 0 ? 0 : (r - m) / s)) }
}

// With right (1) or wrong (0) scores, k right of n: the advantage of a right
// answer and of a wrong one, in closed form
export const rightAdvantage = (k: number, n: number) => (k === 0 || k === n ? 0 : Math.sqrt((n - k) / k))
export const wrongAdvantage = (k: number, n: number) => (k === 0 || k === n ? 0 : -Math.sqrt(k / (n - k)))

export const rewardsOf = (k: number, n: number) => Array.from({ length: n }, (_, i) => (i < k ? 1 : 0))

// The one line of math's three worked numbers: a right answer's advantage
// when 1, 4 or 7 of 8 are right
export const WORKED = [1, 4, 7].map((k) => ({ k, right: rightAdvantage(k, GROUP), wrong: wrongAdvantage(k, GROUP) }))

// The guess: a right answer among 1 right of 8, against one among 7 of 8
export const GUESS_RATIO = rightAdvantage(1, GROUP) / rightAdvantage(7, GROUP)

// Check yourself: partial credit, the share of unit tests passed
export const PARTIAL = [0.9, 0.8, 0.9, 0.8]
export const partial = score(PARTIAL)

// --- The story: a contest book with only the answers at the back -------------

export interface Problem {
  text: string[] // its lines on the card
  key: number
  answers: number[]
}

export const STORY: Problem[] = [
  { text: ['Pencils come in packs of 6.', 'How many packs for 40 pencils?'], key: 7, answers: [7, 7, 7, 6, 7, 7, 7, 7] },
  { text: ['How many squares, of any size,', 'are on a chessboard?'], key: 204, answers: [64, 64, 128, 64, 204, 64, 8, 64] },
  { text: ['What is 15 + 27?'], key: 42, answers: [42, 42, 42, 42, 42, 42, 42, 42] },
]

export const storyRewards = (p: Problem): number[] => p.answers.map((a) => (a === p.key ? 1 : 0))
export const storyScored = STORY.map((p) => score(storyRewards(p)))
export const storyRight = STORY.map((p) => storyRewards(p).reduce((a, b) => a + b, 0))

// --- The lab: eight sampled answers to one question, and a checker -----------

export type Kind = 'right' | 'wrong' | 'lucky'

export interface Chain {
  working: string
  kind: Kind
}

export interface Question {
  name: string // short, for the picker
  text: string
  key: number
  chance: number // how often the model's working is sound
  lucky: number // how often, when it isn't, a wrong working lands on the key anyway
  right: string[]
  wrong: string[]
  luckyWorking: string[]
}

export const QUESTIONS: Question[] = [
  {
    name: '15% of 80',
    text: 'What is 15% of 80?',
    key: 12,
    chance: 0.9,
    lucky: 0,
    right: ['10% is 8, 5% is 4, so 12', '0.15 × 80 = 12', '80 ÷ 20 = 4, × 3 = 12'],
    wrong: ['80 × 0.15 = 1.2', '80 − 15 = 65', '15 × 8 = 120'],
    luckyWorking: [],
  },
  {
    name: '3x + 7 = 22',
    text: 'Solve 3x + 7 = 22.',
    key: 5,
    chance: 0.6,
    lucky: 0.25,
    right: ['22 − 7 = 15, 15 ÷ 3 = 5', '3x = 15, so x = 5'],
    wrong: ['22 + 7 = 29, 29 ÷ 3 ≈ 9.67', '3x = 15, so x = 15', '22 ÷ 3 ≈ 7.33, − 7 ≈ 0.33'],
    luckyWorking: ['22 ÷ 3 ≈ 7, 7 − 2 = 5'],
  },
  {
    name: 'Train trip',
    text: 'A train leaves at 9:40 and arrives at 11:15. How many minutes is the trip?',
    key: 95,
    chance: 0.35,
    lucky: 0,
    right: ['9:40 to 11:00 is 80, + 15 = 95', '20 to 10:00, 75 more, so 95'],
    wrong: ['11:15 − 9:40 = 1:35, so 135', '11.15 − 9.40 = 1.75, so 175', '1 hour 25, so 85'],
    luckyWorking: [],
  },
  {
    name: '3 or 5',
    text: 'How many whole numbers from 1 to 100 divide by 3 or by 5?',
    key: 47,
    chance: 0.12,
    lucky: 0,
    right: ['33 + 20 − 6 = 47'],
    wrong: ['33 + 20 = 53', '33 + 20 − 7 = 46', '100 ÷ 15 ≈ 6, so 6'],
    luckyWorking: [],
  },
]

// The checker reads only the last number an answer writes, and compares it
// with the key. The working is never looked at.
export function finalNumber(working: string): number | null {
  const found = working.match(/-?\d+(\.\d+)?/g)
  return found ? Number(found[found.length - 1]) : null
}

export const passes = (working: string, key: number) => {
  const n = finalNumber(working)
  return n !== null && Math.abs(n - key) < 1e-9
}

export interface Answer extends Chain {
  answer: number | null
  reward: number
}

export interface Group extends Scored {
  answers: Answer[]
  right: number
}

const pick = <T>(list: T[], random: () => number) => list[Math.floor(random() * list.length)]

// One group of answers to question q, the draw-th time it is sampled
export function sample(q: number, draw: number, size = GROUP): Group {
  const question = QUESTIONS[q]
  const random = seeded(1000 * (q + 1) + draw)
  const chains: Chain[] = Array.from({ length: size }, () => {
    if (random() < question.chance) return { working: pick(question.right, random), kind: 'right' }
    if (random() < question.lucky) return { working: pick(question.luckyWorking, random), kind: 'lucky' }
    return { working: pick(question.wrong, random), kind: 'wrong' }
  })
  const answers = chains.map((c) => ({ ...c, answer: finalNumber(c.working), reward: passes(c.working, question.key) ? 1 : 0 }))
  const scored = score(answers.map((a) => a.reward))
  return { ...scored, answers, right: answers.reduce((n, a) => n + a.reward, 0) }
}

// The draw the lab opens on, for each question: chosen so that the second
// question's first group shows a lucky answer the checker passes
export const FIRST_DRAW = 6

// --- The papers' numbers ------------------------------------------------------

// Shao et al. 2024, DeepSeekMath: GRPO, 64 answers sampled per question,
// against a learned reward model; DeepSeekMath-Instruct 7B before and after
export const DEEPSEEKMATH = { group: 64, gsm8k: [82.9, 88.2], math: [46.8, 51.7] }

// DeepSeek-AI 2025, DeepSeek-R1 (the arXiv paper's current version):
// R1-Zero trained from the base model with GRPO on rule-based rewards,
// 16 answers per question; AIME 2024 pass@1 at the start and end of training,
// and with self-consistency (a majority vote over 16 samples)
export const R1 = { group: 16, start: 15.6, end: 77.9, vote: 86.7 }

export const signed = (value: number, digits = 2) =>
  `${value > 0.0000001 ? '+' : value < -0.0000001 ? '−' : ''}${Math.abs(value).toFixed(digits)}`
