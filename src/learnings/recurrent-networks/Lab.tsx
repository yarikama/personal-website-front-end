import { useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { Choice, Controls, Readout, Slider } from '../../components/explain/figure'
import {
  blame,
  encode,
  FIRST_NOUNS,
  HIDDEN,
  initRnn,
  longSentence,
  NOUN_STEP,
  RATE,
  read,
  RUNS,
  SECOND_NOUNS,
  SENTENCES,
  TRAIN_STEPS,
  trainStep,
  verbStep,
  VOCAB,
  type Rnn,
  type RunName,
} from './model'

const WIDTH = 640
const HEIGHT = 372
// Columns: one per word read, then the end token, which is only guessed
const col = (t: number) => 46 + t * 68
const WORD_Y = 22
const MEMORY = { top: 36, cell: 10, gap: 2 }
const MEMORY_BOTTOM = MEMORY.top + HIDDEN * (MEMORY.cell + MEMORY.gap)
const BLAME = { label: 150, base: 236, tall: 66, decades: 4 }
const CHANCE = { label: 262, base: 340, tall: 58, x: (v: number) => 46 + (v - 1) * 54.5 }
const WORD_LABEL_Y = 356
// Steps of training each frame, for each run
const STEPS_PER_FRAME = 6

const NAMES = Object.keys(RUNS) as RunName[]

// A blame ratio as a fraction: 1, 1/3, 1/600
const fraction = (r: number) => {
  if (r >= 0.5) return r >= 1.5 ? `×${r.toFixed(0)}` : '1'
  const d = 1 / r
  const digits = 10 ** Math.max(0, Math.floor(Math.log10(d)) - 1)
  return `1/${(Math.round(d / digits) * digits).toLocaleString('en-US')}`
}

// Two recurrent language models trained, as you watch, on the same twelve
// sentences from different random starts. Pick a run and a sentence, and a
// word to guess after: its memory so far, how much of that guess's blame
// reaches each earlier memory, and its chances for the next word.
export default function Lab() {
  const [nets, setNets] = useState<Record<RunName, Rnn>>(() => ({ A: initRnn(RUNS.A), B: initRnn(RUNS.B) }))
  const [trained, setTrained] = useState(0)
  const [run, setRun] = useState<RunName>('B')
  const [first, setFirst] = useState<(typeof FIRST_NOUNS)[number]>('dog')
  const [second, setSecond] = useState<(typeof SECOND_NOUNS)[number]>('cats')

  useAnimationFrame(() => {
    if (trained >= TRAIN_STEPS) return
    const n = Math.min(STEPS_PER_FRAME, TRAIN_STEPS - trained)
    setNets((at) => {
      let { A, B } = at
      for (let i = 0; i < n; i++) {
        A = trainStep(A, SENTENCES, RATE)
        B = trainStep(B, SENTENCES, RATE)
      }
      return { A, B }
    })
    setTrained(trained + n)
  })

  const sentence = longSentence(first, second)
  const tokens = encode(sentence)
  const guesses = tokens.length - 1
  const [at, setAt] = useState(verbStep(tokens))
  const t = Math.min(at, guesses - 1)

  const rnn = nets[run]
  const { memories, chances, losses } = read(rnn, tokens)
  const reach = blame(rnn, tokens, t)
  const next = tokens[t + 1]
  const p = chances[t]
  const total = losses.reduce((a, b) => a + b, 0)

  // Bar height for a blame ratio on a log scale, 10^-decades to 1
  const blameHeight = (r: number) => (Math.max(0, Math.min(1, (Math.log10(r) + BLAME.decades) / BLAME.decades)) * BLAME.tall)

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Run ${run} reading “${sentence}”. After “${VOCAB[tokens[t]]}” it gives “${VOCAB[next]}” a chance of ${Math.round(100 * p[next])}%. The blame for that guess reaching the first word is ${fraction(reach[0] / reach[t])} of the blame where it is made.`}
      >
        {/* The words: the one just read in ink, the one to guess in sage */}
        {tokens.map((x, i) => (
          <text
            key={i}
            x={col(i)}
            y={WORD_Y}
            textAnchor="middle"
            className={`font-mono text-[12px] ${i === t ? 'fill-ink font-semibold' : i === t + 1 ? 'fill-sage-ink font-semibold' : 'fill-zinc-faded'}`}
          >
            {VOCAB[x]}
          </text>
        ))}

        {/* The memory after each word read so far */}
        {memories.map((h, k) => (
          <g key={k}>
            {k > 0 && (
              <line x1={col(k - 1) + 8} x2={col(k) - 8} y1={(MEMORY.top + MEMORY_BOTTOM) / 2} y2={(MEMORY.top + MEMORY_BOTTOM) / 2} className="stroke-zinc-400" strokeWidth={1} />
            )}
            {h.map((v, i) => (
              <rect
                key={i}
                x={col(k) - MEMORY.cell / 2}
                y={MEMORY.top + i * (MEMORY.cell + MEMORY.gap)}
                width={MEMORY.cell}
                height={MEMORY.cell}
                rx={2}
                className={k === t ? 'fill-ink stroke-sage' : 'fill-ink stroke-zinc-300'}
                fillOpacity={k <= t ? 0.05 + 0.9 * v : 0}
                strokeWidth={k === t ? 1.5 : 1}
              />
            ))}
          </g>
        ))}

        {/* How much of this guess's blame reaches each memory. Labels carry a paper halo:
            they are wider than a bar and can sit over a taller neighbour */}
        <text x={col(0) - 20} y={BLAME.label} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          Blame from this guess reaching each memory (log scale)
        </text>
        <line x1={col(0) - 20} x2={col(guesses - 1) + 20} y1={BLAME.base} y2={BLAME.base} className="stroke-zinc-300" strokeWidth={1} />
        {reach.map((b, k) => {
          const r = b / reach[t]
          const h = blameHeight(r)
          return (
            <g key={k}>
              <rect x={col(k) - 9} y={BLAME.base - Math.max(h, 0.8)} width={18} height={Math.max(h, 0.8)} rx={2} className="fill-ink" fillOpacity={k === t ? 0.9 : 0.55} />
              {(k === 0 || k === NOUN_STEP || k === t) && (
                <text x={col(k)} y={BLAME.base - h - 5} textAnchor="middle" className="fill-ink stroke-paper font-mono text-[10px]" strokeWidth={3} paintOrder="stroke">
                  {fraction(r)}
                </text>
              )}
            </g>
          )
        })}

        {/* The chances for the next word */}
        <text x={col(0) - 20} y={CHANCE.label} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          {`Chances for the word after “${VOCAB[tokens[t]]}”`}
        </text>
        <line x1={col(0) - 20} x2={CHANCE.x(VOCAB.length - 1) + 20} y1={CHANCE.base} y2={CHANCE.base} className="stroke-zinc-300" strokeWidth={1} />
        {VOCAB.map((word, v) => {
          if (v === 0) return null
          const h = p[v] * CHANCE.tall
          const right = v === next
          return (
            <g key={word}>
              <rect x={CHANCE.x(v) - 10} y={CHANCE.base - h} width={20} height={h} rx={2} className={right ? 'fill-sage' : 'fill-ink'} fillOpacity={right ? 1 : 0.4} />
              {p[v] >= 0.05 && (
                <text x={CHANCE.x(v)} y={CHANCE.base - h - 4} textAnchor="middle" className="fill-ink stroke-paper font-mono text-[10px]" strokeWidth={3} paintOrder="stroke">
                  {Math.round(100 * p[v])}%
                </text>
              )}
              <text
                x={CHANCE.x(v)}
                y={WORD_LABEL_Y}
                textAnchor="middle"
                className={`font-mono text-[10px] ${right ? 'fill-sage-ink font-semibold' : 'fill-zinc-faded'}`}
              >
                {word}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <Readout label={`Chance of “${VOCAB[next]}”`} value={`${Math.round(100 * p[next])}%`} accent />
        <Readout label="Loss here" value={losses[t].toFixed(2)} />
        <Readout label={trained < TRAIN_STEPS ? `Training ${trained}/${TRAIN_STEPS}` : 'Sentence loss'} value={total.toFixed(2)} />
      </div>
      <Controls>
        <Choice label="Run" options={NAMES} value={run} onChange={setRun} />
        <Choice label="First noun" options={FIRST_NOUNS} value={first} onChange={setFirst} />
        <Choice label="Second noun" options={SECOND_NOUNS} value={second} onChange={setSecond} />
      </Controls>
      <Controls>
        <Slider
          label="Guess after"
          value={t}
          min={0}
          max={guesses - 1}
          onChange={setAt}
          format={(k) => `“${VOCAB[tokens[k]]}”`}
        />
      </Controls>
    </div>
  )
}
