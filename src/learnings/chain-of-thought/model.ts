import { seeded } from '../../components/explain/random'

// ---------------------------------------------------------------------------
// The story's word problem, its worked steps, and the slips that go wrong
// ---------------------------------------------------------------------------

export const PROBLEM = 'A baker bakes 4 trays of 12 rolls, sells 30, then bakes 2 more trays. How many rolls are left?'
export const RIGHT = 42
// What a friend says when asked to answer at once
export const BLURTED = 36

// The worked steps, one easy sum a line
export const WORKED_STEPS = ['4 × 12 = 48', '48 − 30 = 18', '2 × 12 = 24', '18 + 24 = 42']

// Each answer a written chain can end on, with the steps that reach it. The
// wrong ones each come from one slip.
export const ANSWERS: { value: number; steps: string }[] = [
  { value: 42, steps: '48 − 30 + 24' },
  { value: 18, steps: '48 − 30, and stops' },
  { value: 20, steps: '48 − 30 + 2' },
  { value: 46, steps: '4 × 12 = 52 …' },
  { value: 66, steps: '18 + 2 × 24' },
  { value: 102, steps: '48 + 30 + 24' },
]
export const WRONG_VALUES = ANSWERS.slice(1).map((answer) => answer.value)

// The story's friend: each written chain is right with chance P_RIGHT, and a
// wrong one lands on any of the five slips alike
export const P_RIGHT = 0.4
export const STORY_WRONG = WRONG_VALUES.map(() => (1 - P_RIGHT) / WRONG_VALUES.length)
// Chains asked for per problem in the story
export const STORY_K = 15
// Problems in the story's scaled-up run
export const STORY_PROBLEMS = 100

// ---------------------------------------------------------------------------
// The vote, exactly
// ---------------------------------------------------------------------------

const logFactorials = (n: number) => {
  const out = [0]
  for (let i = 1; i <= n; i++) out.push(out[i - 1] + Math.log(i))
  return out
}

// The chance that a vote over k chains picks the right answer, when each
// chain is right with chance p and lands on wrong answer j with chance
// wrong[j] (p plus the wrong chances add to 1). The answer with most chains
// wins; a tie is broken by a fair draw among the tied answers.
//
// For each count c of right chains, a dynamic programme over the wrong
// answers keeps (chains used so far, wrong answers tied at c) and the sum of
// prod wrong[j]^x_j / x_j! over the ways to get there, with every x_j <= c.
// The multinomial k! / (c! prod x_j!) p^c prod wrong[j]^x_j then follows.
export function voteRight(p: number, wrong: number[], k: number): number {
  const lf = logFactorials(k)
  let total = 0
  for (let c = 1; c <= k; c++) {
    const rest = k - c
    // ways[used][tied]
    let ways = Array.from({ length: rest + 1 }, () => new Array<number>(wrong.length + 1).fill(0))
    ways[0][0] = 1
    for (const q of wrong) {
      const next = Array.from({ length: rest + 1 }, () => new Array<number>(wrong.length + 1).fill(0))
      for (let used = 0; used <= rest; used++) {
        for (let tied = 0; tied <= wrong.length; tied++) {
          const w = ways[used][tied]
          if (w === 0) continue
          for (let x = 0; x <= Math.min(c, rest - used); x++) {
            const term = x === 0 ? 1 : Math.exp(x * Math.log(q) - lf[x])
            if (term === 0) continue
            next[used + x][tied + (x === c ? 1 : 0)] += w * term
          }
        }
      }
      ways = next
    }
    const lead = Math.exp(lf[k] - lf[c] + c * Math.log(p))
    for (let tied = 0; tied <= wrong.length; tied++) total += (lead * ways[rest][tied]) / (tied + 1)
  }
  return total
}

// Wrong chances spread evenly over `spread` wrong answers
export const evenWrong = (p: number, spread: number) => Array.from({ length: spread }, () => (1 - p) / spread)

// ---------------------------------------------------------------------------
// The vote, sampled
// ---------------------------------------------------------------------------

// One chain's answer: 0 for the right one, j + 1 for wrong answer j
export function sampleChain(random: () => number, p: number, wrong: number[]): number {
  let u = random()
  if (u < p) return 0
  u -= p
  for (let j = 0; j < wrong.length; j++) {
    if (u < wrong[j]) return j + 1
    u -= wrong[j]
  }
  return wrong.length
}

// The answer most chains gave, ties broken by a fair draw
export function majority(random: () => number, answers: number[]): number {
  const counts = new Map<number, number>()
  for (const a of answers) counts.set(a, (counts.get(a) ?? 0) + 1)
  const most = Math.max(...counts.values())
  const tied = [...counts.keys()].filter((a) => counts.get(a) === most).sort((a, b) => a - b)
  return tied[Math.floor(random() * tied.length)]
}

// For each of `problems` problems: whether one chain was right, and whether
// the vote over k chains was
export function runProblems(random: () => number, p: number, wrong: number[], k: number, problems: number) {
  return Array.from({ length: problems }, () => {
    const answers = Array.from({ length: k }, () => sampleChain(random, p, wrong))
    return { single: answers[0] === 0, vote: majority(random, answers) === 0 }
  })
}

// ---------------------------------------------------------------------------
// The story's numbers, from seeded runs chosen to land on the arithmetic
// ---------------------------------------------------------------------------

// The fifteen chains of the story's one problem (answers as values). Seed
// chosen so that 6 of 15 are right and no wrong answer gets more than 2.
export const STORY_SEED = 35
export const storyChains = (() => {
  const random = seeded(STORY_SEED)
  return Array.from({ length: STORY_K }, () => ANSWERS[sampleChain(random, P_RIGHT, STORY_WRONG)].value)
})()

// The tally of the story's chains, in the order of ANSWERS
export const storyTally = ANSWERS.map((answer) => storyChains.filter((v) => v === answer.value).length)

// A hundred problems: one chain each, and a vote of fifteen. Seed chosen to
// land on the exact chances, 40 and 83 in 100
export const SCALE_SEED = 101
export const storyRun = runProblems(seeded(SCALE_SEED), P_RIGHT, STORY_WRONG, STORY_K, STORY_PROBLEMS)
export const storySingleRight = storyRun.filter((r) => r.single).length
export const storyVoteRight = storyRun.filter((r) => r.vote).length

// The exact chances the story's run should land near
export const STORY_EXACT = { single: P_RIGHT, vote: voteRight(P_RIGHT, STORY_WRONG, STORY_K) }

// The one line of math: three vote sizes for the story's friend
export const WORKED_K = [1, 5, 40] as const
export const worked = WORKED_K.map((k) => ({ k, right: voteRight(P_RIGHT, STORY_WRONG, k) }))

// ---------------------------------------------------------------------------
// The checks
// ---------------------------------------------------------------------------

// Quick check: every wrong chain makes the same slip
export const TRAP = { p: 0.4, k: 40 }
export const trapRight = voteRight(TRAP.p, [1 - TRAP.p], TRAP.k)

// Check yourself: right 1 time in 4, wrong over 10 answers alike
export const CHECK = { p: 0.25, spread: 10, k: 40 }
export const checkRight = voteRight(CHECK.p, evenWrong(CHECK.p, CHECK.spread), CHECK.k)

// ---------------------------------------------------------------------------
// The papers' numbers (percent of GSM8K word problems solved)
// ---------------------------------------------------------------------------

// Wei et al. 2022, Table 2: standard prompting vs chain of thought. The GPT-3
// rows are the paper's InstructGPT models text-ada-001 to text-davinci-002.
export const SCALE: { family: 'GPT-3' | 'PaLM'; size: string; billions: number; standard: number; cot: number }[] = [
  { family: 'GPT-3', size: '350M', billions: 0.35, standard: 2.2, cot: 0.5 },
  { family: 'GPT-3', size: '1.3B', billions: 1.3, standard: 2.4, cot: 0.5 },
  { family: 'GPT-3', size: '6.7B', billions: 6.7, standard: 4.0, cot: 2.4 },
  { family: 'GPT-3', size: '175B', billions: 175, standard: 15.6, cot: 46.9 },
  { family: 'PaLM', size: '8B', billions: 8, standard: 4.9, cot: 4.1 },
  { family: 'PaLM', size: '62B', billions: 62, standard: 9.6, cot: 29.9 },
  { family: 'PaLM', size: '540B', billions: 540, standard: 17.9, cot: 56.9 },
]
// The prior best from fine-tuning GPT-3 175B with a verifier, as Wei et al. quote it
export const PRIOR_SUPERVISED = 55
export const PALM = SCALE.find((row) => row.size === '540B')!

// Kojima et al. 2022: text-davinci-002, zero-shot vs zero-shot chain of thought
export const ZERO_SHOT = { gsm8k: { plain: 10.4, cot: 40.7 }, multiArith: { plain: 17.7, cot: 78.7 } }

// Wang et al. 2023, Table 2: PaLM 540B on GSM8K, one greedy chain vs a vote of 40
export const SELF_CONSISTENCY = { greedy: 56.5, vote: 74.4, paths: 40, temperature: 0.7, topK: 40 }

// "41%" for 0.41
export const percent = (share: number) => `${Math.round(share * 100)}%`

// ---------------------------------------------------------------------------
// The lab
// ---------------------------------------------------------------------------

export const LAB_MOST_CHAINS = 40
export const LAB_SPREADS = [1, 2, 5, 10] as const
export type Spread = (typeof LAB_SPREADS)[number]
export const LAB_START = { p: P_RIGHT, spread: 5 as Spread, k: STORY_K }
export const LAB_PROBLEMS = 1000
const LAB_SEED = 584

// The chance the vote is right for every vote size from 1 to
// LAB_MOST_CHAINS, worked out once for each setting
const curves = new Map<string, number[]>()
export function voteCurve(p: number, spread: number): number[] {
  const key = `${p.toFixed(2)} ${spread}`
  let curve = curves.get(key)
  if (!curve) {
    const wrong = evenWrong(p, spread)
    curve = Array.from({ length: LAB_MOST_CHAINS }, (_, i) => voteRight(p, wrong, i + 1))
    curves.set(key, curve)
  }
  return curve
}

// The share of LAB_PROBLEMS seeded problems a vote of k got right
export function labRun(p: number, spread: number, k: number): number {
  const run = runProblems(seeded(LAB_SEED), p, evenWrong(p, spread), k, LAB_PROBLEMS)
  return run.filter((r) => r.vote).length / LAB_PROBLEMS
}
