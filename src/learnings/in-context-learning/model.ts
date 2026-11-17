// In-context learning: a frozen language model, steered by the examples in
// its prompt. Every number the page states is worked out here; the figures
// only draw.
//
// The model is a stand-in, small enough to check by hand. A real language
// model is a Transformer with billions of weights that nobody wrote; this
// one is fourteen numbers written below. What the two share is the point of
// the page: nothing in the table changes while the model reads a prompt.
//
// What it has "read" in pretraining comes in two kinds of English: everyday
// English, most of it, and skater talk, a little. For each word that matters
// it knows how often, in each kind, a note with that word is followed by
// "It was great!" rather than "It was terrible!". Reading a prompt, it asks
// which kind of English the examples are written in (each example weighs
// each kind by how likely that kind made the example's ending), then mixes
// the two kinds' answers for the new note by those weights. That weighing is
// done fresh for every prompt and thrown away after.

// ---------------------------------------------------------------------------
// The frozen weights

export type Reading = 'everyday' | 'skate'
export const READINGS: Reading[] = ['everyday', 'skate']
export const READING_NAMES: Record<Reading, string> = { everyday: 'Everyday English', skate: 'Skater talk' }

// How much of what it read is each kind: 19 pages in 20 everyday
export const PRIOR: Readonly<Record<Reading, number>> = Object.freeze({ everyday: 0.95, skate: 0.05 })

// For a note with this word, how often each kind of English goes on with
// "It was great!" (the rest of the time, "It was terrible!")
export const GREAT_AFTER: Readonly<Record<string, Readonly<Record<Reading, number>>>> = Object.freeze({
  sick: Object.freeze({ everyday: 0.1, skate: 0.9 }),
  gnarly: Object.freeze({ everyday: 0.1, skate: 0.9 }),
  filthy: Object.freeze({ everyday: 0.1, skate: 0.9 }),
  friendly: Object.freeze({ everyday: 0.9, skate: 0.9 }),
  rusted: Object.freeze({ everyday: 0.1, skate: 0.1 }),
  snapped: Object.freeze({ everyday: 0.1, skate: 0.1 }),
})
export const WORDS = Object.keys(GREAT_AFTER)

// Every number in the model: the two shares and a pair per word
export const WEIGHT_COUNT = READINGS.length + WORDS.length * READINGS.length

// ---------------------------------------------------------------------------
// The task: sorting notes, written as text the model can continue

export type Label = 'praise' | 'complaint'
export const LABELS: Label[] = ['praise', 'complaint']

// The verbalizer: each label as the word the model would say
export const VERBALIZER: Record<Label, string> = { praise: 'great', complaint: 'terrible' }

export interface Note {
  text: string
  // The one word in it the model has a lean on
  word: string
}

export interface Example extends Note {
  label: Label
}

// The pattern: a note as written, then the start of its verdict
export const pattern = (note: Note) => `${note.text} It was`
// One line of the prompt: a sorted note with its verdict filled in
export const line = (example: Example) => `${pattern(example)} ${VERBALIZER[example.label]}!`
// The whole prompt: the examples, one per line, then the new note waiting
export const prompt = (examples: Example[], note: Note) => [...examples.map(line), `${pattern(note)} …`]

// The notes taped up in the story, and the lab's other two
export const KICKFLIP: Example = { text: 'That kickflip was sick.', word: 'sick', label: 'praise' }
export const WHEELS: Example = { text: 'These wheels are gnarly.', word: 'gnarly', label: 'praise' }
export const BEARINGS: Example = { text: 'The bearings rusted in a week.', word: 'rusted', label: 'complaint' }
export const STAFF: Example = { text: 'The staff were friendly.', word: 'friendly', label: 'praise' }
export const EXAMPLES: Example[] = [KICKFLIP, WHEELS, BEARINGS, STAFF]

// The notes to sort
export const RAMP: Note = { text: 'The new ramp is sick.', word: 'sick' }
export const BOARD: Note = { text: 'My board snapped.', word: 'snapped' }
export const DECK: Note = { text: 'That new deck is filthy.', word: 'filthy' }
export const NOTES: Note[] = [RAMP, BOARD, DECK]

// ---------------------------------------------------------------------------
// Reading a prompt

const chance = (note: Note, reading: Reading) => {
  const lean = GREAT_AFTER[note.word]
  if (!lean) throw new Error(`The model has no lean on “${note.word}”`)
  return lean[reading]
}

// How likely a kind of English is to have written an example's ending
export function fit(example: Example, reading: Reading): number {
  const great = chance(example, reading)
  return example.label === 'praise' ? great : 1 - great
}

// How the model reads this prompt: the share it gives each kind of English
// after the examples. These are worked out per prompt, like a network's
// activations; the weights above stay as they are.
export function readingOf(examples: Example[]): Record<Reading, number> {
  const raw = READINGS.map((r) => examples.reduce((w, e) => w * fit(e, r), PRIOR[r]))
  const total = raw[0] + raw[1]
  return { everyday: raw[0] / total, skate: raw[1] / total }
}

export interface Prediction {
  // P(great) and P(terrible) after "It was", given the prompt
  great: number
  terrible: number
  label: Label
  reading: Record<Reading, number>
}

// The model's next word after the prompt, and the label whose word wins
export function predict(examples: Example[], note: Note): Prediction {
  const reading = readingOf(examples)
  const great = READINGS.reduce((p, r) => p + reading[r] * chance(note, r), 0)
  const terrible = 1 - great
  return { great, terrible, label: classify({ great, terrible }), reading }
}

// In-context classification: of the label words only, the one the model
// finds most likely next. Any other word it might say ("a", "so") is
// ignored, however likely.
export function classify(next: Record<string, number>, verbalizer: Record<Label, string> = VERBALIZER): Label {
  const score = (label: Label) => next[verbalizer[label]] ?? 0
  return LABELS.reduce((best, label) => (score(label) > score(best) ? label : best))
}

// ---------------------------------------------------------------------------
// The story: the ramp note, read with 0, 1 and 2 notes taped up, then again
// the next day with none

export const SHOTS: Example[][] = [[], [KICKFLIP], [KICKFLIP, WHEELS]]
export const STORY = SHOTS.map((examples) => predict(examples, RAMP))
// An easy note the temp gets right with nothing taped up
export const EASY = predict([], STAFF)

export const percent = (p: number) => `${Math.round(p * 100)}%`

// ---------------------------------------------------------------------------
// GPT-3 on TriviaQA (Brown et al. 2020, Table 3.3): accuracy in percent,
// the 175B model with no training on the task, against the best fine-tuned
// system of the time (RAG, which also searches Wikipedia)

export const TRIVIA = { zeroShot: 64.3, oneShot: 68.0, fewShot: 71.2, fewShotK: 64, fineTuned: 68.0 }
// GPT-3's context window, in tokens: where few-shot's 10 to 100 examples must fit
export const CONTEXT_TOKENS = 2048
