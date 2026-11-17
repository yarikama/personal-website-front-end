// Every number the LSTM page states. The figures only draw.

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))

// One step of a single LSTM memory unit (the cell is a vector in practice;
// each of its numbers follows this rule on its own):
//   c = f × c_prev + i × g      the cell: what is kept, plus what is written
//   h = o × tanh(c)             what the unit shows the rest of the network
// f, i and o are gates in (0, 1); g in (-1, 1) is the new content.
export interface Gates {
  f: number
  i: number
  o: number
  g: number
}

export function lstmStep(cPrev: number, { f, i, o, g }: Gates) {
  const c = f * cPrev + i * g
  return { c, h: o * Math.tanh(c) }
}

// How much of what the cell held k words ago is still there, if it wrote
// nothing since: the forget gates multiplied. Along the cell, the same
// product is how much of a training signal travels back those k words,
// since d c_t / d c_(t-1) = f_t.
export const survives = (f: number, k: number) => f ** k

// The derivative of one cell step with respect to the cell before it, by
// finite differences: the test checks it is the forget gate
export const cellSlope = (cPrev: number, gates: Gates, eps = 1e-6) =>
  (lstmStep(cPrev + eps, gates).c - lstmStep(cPrev - eps, gates).c) / (2 * eps)

// ---------------------------------------------------------------------------
// The story: a day with a message to pass on at dinner

export const STOPS = ['Breakfast', 'Bus', 'Work', 'Lunch', 'Call', 'Gym', 'Dinner'] as const
// The same seven steps, read as a sentence the LSTM is reading; at the last
// one it must predict the next word, "are"
export const STORY_WORDS = ['The keys', 'that', 'my', 'sister', 'hid', 'this', 'morning'] as const
export const STORY_NEXT = 'are'
// Where the friend talks about her cat (the noun that is not the subject)
export const LUNCH = 3
export const DINNER = STOPS.length - 1

// Kept in your head, each stop stirs the message and leaves this share clear
export const IN_MIND_KEEP = 0.5

// How clear the message is at each stop, in your head and on the note
export const inMind = STOPS.map((_, k) => survives(IN_MIND_KEEP, k))
export const onNote = STOPS.map(() => 1)

// The three calls at each stop, 1 for yes and 0 for no: keep the old note
// (at breakfast, yesterday's done errand is crossed out), write, read
export const CALLS: Gates[] = STOPS.map((_, k) => ({
  f: k === 0 ? 0 : 1,
  i: k === 0 ? 1 : 0,
  o: k === DINNER ? 1 : 0,
  g: k === 0 ? 1 : 0,
}))

// ---------------------------------------------------------------------------
// The guess and the worked numbers: a note kept at forget gate f for 20 words

export const GUESS_F = 0.9
export const GAP = 20
export const WORKED_F = [0.5, 0.9, 0.99] as const

// The quick-check's new case: a quote closed 50 words after it opened
export const QUOTE_F = 0.98
export const QUOTE_GAP = 50

// ---------------------------------------------------------------------------
// The lab: a hand-set LSTM unit and a plain recurrent unit read a sentence
// and must pick "are" or "is" for the verb that comes next. Both hold the
// subject's number as a sign: + for plural, - for singular.

export type Role = 'word' | 'subject' | 'noun'
export interface Token {
  word: string
  role: Role
  // +1 for a plural noun, -1 for a singular one, 0 for anything else
  number: number
}

const t = (word: string, role: Role = 'word', number = 0): Token => ({ word, role, number })

export const SENTENCES = {
  Short: [t('The'), t('keys', 'subject', 1), t('you'), t('lost')],
  'Noun between': [t('The'), t('keys', 'subject', 1), t('my'), t('sister', 'noun', -1), t('left'), t('on'), t('the'), t('table', 'noun', -1)],
  Long: [
    t('The'),
    t('keys', 'subject', 1),
    t('that'),
    t('my'),
    t('sister', 'noun', -1),
    t('hid'),
    t('under'),
    t('the'),
    t('old'),
    t('mat', 'noun', -1),
    t('before'),
    t('she'),
    t('left'),
    t('for'),
    t('work', 'noun', -1),
    t('this'),
    t('morning', 'noun', -1),
  ],
  Singular: [t('The'), t('key', 'subject', -1), t('to'), t('both'), t('of'), t('the'), t('sheds', 'noun', 1)],
} satisfies Record<string, Token[]>

export type Sentence = keyof typeof SENTENCES
export const SENTENCE_NAMES = Object.keys(SENTENCES) as Sentence[]

// The verb each sentence needs next
export const rightVerb = (tokens: Token[]) => (tokens.find((x) => x.role === 'subject')!.number > 0 ? 'are' : 'is')

// The forget gate on the words after the subject: the lab's setting
export const LAB_F = [0.8, 0.9, 0.99] as const
export type LabF = (typeof LAB_F)[number]

// What a word writes: a noun's number, squashed
const CONTENT = 2
// A shut gate is never quite 0
const SHUT = 0.05
// How sharply the verb choice follows the unit's output
const READ = 6
// The plain unit: h = tanh(W h_prev + U × number)
export const PLAIN_W = 0.9
export const PLAIN_U = 2

// The LSTM's gates for each word, set by hand to the moves a trained one
// learns: the subject clears the cell and writes; every other word keeps
// it at f and barely writes; the last word, where the verb is due, opens
// the output gate
export function gatesFor(tokens: Token[], f: number): Gates[] {
  return tokens.map((token, k) => ({
    f: token.role === 'subject' ? 0 : f,
    i: token.role === 'subject' ? 1 : SHUT,
    o: k === tokens.length - 1 ? 1 : 0.1,
    g: Math.tanh(CONTENT * token.number),
  }))
}

export interface Trace {
  gates: Gates[]
  // The LSTM's cell after each word, and the plain unit's state
  cell: number[]
  plain: number[]
  // The chance each gives the right verb, read after the last word
  lstmRight: number
  plainRight: number
  verb: 'are' | 'is'
}

export function trace(tokens: Token[], f: number): Trace {
  const gates = gatesFor(tokens, f)
  const cell: number[] = []
  const plain: number[] = []
  let c = 0
  let hLstm = 0
  let h = 0
  for (const [k, token] of tokens.entries()) {
    const step = lstmStep(c, gates[k])
    c = step.c
    hLstm = step.h
    cell.push(c)
    h = Math.tanh(PLAIN_W * h + PLAIN_U * token.number)
    plain.push(h)
  }
  const verb = rightVerb(tokens)
  const sign = verb === 'are' ? 1 : -1
  return {
    gates,
    cell,
    plain,
    lstmRight: sigmoid(READ * sign * hLstm),
    plainRight: sigmoid(READ * sign * h),
    verb,
  }
}

// Worked out once, for every sentence and setting the lab offers
export const TRACES = Object.fromEntries(
  SENTENCE_NAMES.map((name) => [name, Object.fromEntries(LAB_F.map((f) => [f, trace(SENTENCES[name], f)]))]),
) as Record<Sentence, Record<LabF, Trace>>

// ---------------------------------------------------------------------------

// "82%" for 0.82, "1.6%" for 0.016, "0.0001%" for 0.00000095
export function pct(share: number): string {
  const p = share * 100
  if (p >= 10) return `${Math.round(p)}%`
  if (p >= 1) return `${Number(p.toFixed(1))}%`
  return `${Number(p.toPrecision(1))}%`
}

// The check-yourself case: squash the cell through tanh at every word, as a
// plain recurrent network squashes its state, and a stored 0.9 shrinks
// even with the forget gate at 1 and nothing written
export const SQUASH_START = 0.9
export const squashed = (steps: number) => {
  const values = [SQUASH_START]
  for (let k = 0; k < steps; k++) values.push(Math.tanh(values[values.length - 1]))
  return values
}
