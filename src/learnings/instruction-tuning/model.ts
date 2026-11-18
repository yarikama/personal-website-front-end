// Instruction tuning: keep training a pretrained model on (instruction,
// response) pairs, and score only the response. Every number the page states
// is worked out here; the figures only draw.
//
// The chances below are written by hand, not taken from a trained model.
// They are picked to look like what a pretrained model gives at the start of
// tuning: a user's words are hard to foresee, an answer's words much less so
// once the question has been read, and the chat tags, new to the model, are
// nearly impossible to foresee until tuning teaches it where they go.

// ---------------------------------------------------------------------------
// The story: a help desk

export const QUESTION = 'Name three rivers in Spain.'
// What an assistant who has only ever read writes under it
export const RAMBLE = 'Name three rivers in France. Name three rivers in Italy.'
// The kind of page they read such a line on
export const QUIZ_PAGE = {
  title: 'Geography quiz, page 12',
  lines: ['Name three rivers in Spain.', 'Name three rivers in France.', 'Name three rivers in Italy.', 'Name three rivers in Peru.'],
}
export const ANSWER = 'The Tagus, the Ebro and the Douro.'
// What a binder of careless slips teaches
export const SLOPPY = 'dunno, the tagus??'

export interface Slip {
  question: string
  answer: string
}
// A few of the binder's slips
export const BINDER: Slip[] = [
  { question: 'What is the capital of Peru?', answer: 'Lima.' },
  { question: 'Give a word that rhymes with cat.', answer: 'Hat, as in “a cat in a hat”.' },
  { question: 'How do you say “good morning” in French?', answer: 'Bonjour.' },
]
export const CAREFUL_SLIPS = 50
export const CARELESS_SLIPS = 5000

// ---------------------------------------------------------------------------
// Chat templates and which tokens count

// The tags of a made-up chat template. Real models each have their own.
export const TAGS = { user: '<|user|>', assistant: '<|assistant|>', end: '<|end|>' } as const

// Chances, at the start of tuning, of each tag where it stands. New tokens
// the model never met in pretraining.
export const TAG_CHANCE = { user: 0.001, assistant: 0.001, end: 0.01 } as const

export type Part = 'prompt' | 'response'
export interface Token {
  text: string
  // What the model gave this token, from everything before it; null for the
  // very first token, which nothing comes before
  chance: number | null
  part: Part
  tag: boolean
}

type Words = [text: string, chance: number][]
export type Turn = { user: Words } | { assistant: Words }

// One conversation as the string the model reads: each user turn opens with
// <|user|>, each assistant turn with <|assistant|> and ends with <|end|>.
// The user's words and the tags the app writes are the prompt; what the
// assistant writes, its <|end|> included, is the response.
export function chat(turns: Turn[]): Token[] {
  const tokens: Token[] = []
  for (const turn of turns) {
    if ('user' in turn) {
      tokens.push({ text: TAGS.user, chance: tokens.length === 0 ? null : TAG_CHANCE.user, part: 'prompt', tag: true })
      for (const [text, chance] of turn.user) tokens.push({ text, chance, part: 'prompt', tag: false })
    } else {
      tokens.push({ text: TAGS.assistant, chance: TAG_CHANCE.assistant, part: 'prompt', tag: true })
      for (const [text, chance] of turn.assistant) tokens.push({ text, chance, part: 'response', tag: false })
      tokens.push({ text: TAGS.end, chance: TAG_CHANCE.end, part: 'response', tag: true })
    }
  }
  return tokens
}

const RIVERS_Q: Words = [
  ['Name', 0.02],
  ['three', 0.05],
  ['rivers', 0.01],
  ['in', 0.4],
  ['Spain', 0.03],
  ['.', 0.5],
]
const RIVERS_A: Words = [
  ['The', 0.3],
  ['Tagus', 0.2],
  [',', 0.6],
  ['the', 0.7],
  ['Ebro', 0.3],
  ['and', 0.6],
  ['the', 0.9],
  ['Douro', 0.4],
  ['.', 0.8],
]

export const EXAMPLE_NAMES = ['One question', 'Two turns', 'A task'] as const
export type ExampleName = (typeof EXAMPLE_NAMES)[number]
export const EXAMPLES: Record<ExampleName, Token[]> = {
  'One question': chat([{ user: RIVERS_Q }, { assistant: RIVERS_A }]),
  'Two turns': chat([
    { user: RIVERS_Q },
    { assistant: RIVERS_A },
    {
      user: [
        ['Which', 0.05],
        ['is', 0.5],
        ['longest', 0.02],
        ['?', 0.6],
      ],
    },
    {
      assistant: [
        ['The', 0.5],
        ['Tagus', 0.6],
        ['.', 0.7],
      ],
    },
  ]),
  'A task': chat([
    {
      user: [
        ['Translate', 0.01],
        ['into', 0.2],
        ['French', 0.05],
        [':', 0.4],
        ['good', 0.03],
        ['morning', 0.3],
      ],
    },
    {
      assistant: [
        ['Bonjour', 0.3],
        ['.', 0.5],
      ],
    },
  ]),
}

export const MODES = ['Answers only', 'Every token'] as const
export type Mode = (typeof MODES)[number]

// How surprised the model is by a token: minus the log (natural) of its chance
export const surprise = (chance: number) => -Math.log(chance)

export interface Scored extends Token {
  scored: boolean
  // Its surprise if scored, else null
  cost: number | null
}
export interface Scoring {
  tokens: Scored[]
  scored: number
  // The loss: the mean surprise over the scored tokens
  loss: number
  // Of everything scored, the share of the surprise that the prompt brings
  promptShare: number
}

export function score(tokens: Token[], mode: Mode): Scoring {
  const out = tokens.map((t): Scored => {
    const scored = t.chance !== null && (mode === 'Every token' || t.part === 'response')
    return { ...t, scored, cost: scored ? surprise(t.chance as number) : null }
  })
  const costs = out.filter((t) => t.scored)
  const total = costs.reduce((s, t) => s + (t.cost as number), 0)
  const fromPrompt = costs.filter((t) => t.part === 'prompt').reduce((s, t) => s + (t.cost as number), 0)
  return {
    tokens: out,
    scored: costs.length,
    loss: costs.length ? total / costs.length : 0,
    promptShare: total ? fromPrompt / total : 0,
  }
}

// The story's slip, scored both ways: the numbers the page states
export const STORY_TOKENS = EXAMPLES['One question']
export const ANSWERS_ONLY = score(STORY_TOKENS, 'Answers only')
export const EVERY_TOKEN = score(STORY_TOKENS, 'Every token')

// Three tokens of the answer, worked by hand on the page: a likely word, an
// unlikely one, and the end tag
const at = (text: string, from = 0) => STORY_TOKENS.findIndex((t, i) => i >= from && t.text === text)
export const WORKED = [
  STORY_TOKENS[at('the', at('and'))],
  STORY_TOKENS[at('Tagus')],
  STORY_TOKENS[at(TAGS.end)],
].map((t) => ({ text: t.text, chance: t.chance as number, cost: surprise(t.chance as number) }))

// ---------------------------------------------------------------------------
// Published numbers

// Zhou and others, 2023 (LIMA): a 65B LLaMa tuned on 1,000 careful examples,
// judged as good as or better than GPT-4 in 43% of cases
export const LIMA = { examples: 1000, billions: 65, vsGpt4: 43 }
// Wei and others, 2021 (FLAN): a 137B model tuned on over 60 datasets phrased
// as instructions beats zero-shot GPT-3 (175B) on 20 of 25 unseen datasets
export const FLAN = { billions: 137, datasets: 60, wins: 20, of: 25 }
// Ouyang and others, 2022 (InstructGPT): its 1.3B model's answers preferred
// to those of 175B GPT-3
export const INSTRUCTGPT = { small: 1.3, big: 175 }

// ---------------------------------------------------------------------------
// Formatting

export const two = (x: number) => x.toFixed(2)
export const percent = (x: number) => `${Math.round(x * 100)}%`
