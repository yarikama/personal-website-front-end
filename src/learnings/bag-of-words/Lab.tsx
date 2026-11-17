import { useId, useState } from 'react'
import { Button, Controls, Readout } from '../../components/explain/figure'
import {
  chanceOf,
  countsOf,
  LEARNED,
  LIST_WEIGHTS,
  MOST_UNHAPPY,
  pct,
  scoreOf,
  signed,
  unknownWords,
  VOCABULARY,
  weightOf,
} from './model'

const PRESETS = [
  'Good, not bad.',
  'Bad, not good.',
  'Good good good.',
  'Lovely cake, kind staff.',
  'The coffee was cold but the cake was great.',
]

const WIDTH = 360
const HEIGHT = 144
const CELLS_X = 11
const CELL = 26
const VOCAB_Y = 46
const BAND_Y = 82
const REACH = 18
const ROW_Y = 116
const ROW_H = 24

const small = 'font-mono text-[11px]'

// One card's row: the vocabulary, the learned weight of each word, and how
// many times the card uses it
function Row({ row }: { row: number[] }) {
  const at = (i: number) => CELLS_X + i * CELL
  const most = Math.abs(weightOf(MOST_UNHAPPY))
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="mx-auto w-full max-w-[34rem]"
      role="img"
      aria-label={`The card's row: ${VOCABULARY.map((word, i) => `${word} ${row[i]}`).join(', ')}.`}
    >
      <line
        x1={CELLS_X}
        x2={at(VOCABULARY.length)}
        y1={BAND_Y}
        y2={BAND_Y}
        className="stroke-zinc-300 dark:stroke-zinc-200/25"
      />
      {VOCABULARY.map((word, i) => {
        const x = at(i) + CELL / 2
        const w = weightOf(word)
        const h = (Math.abs(w) / most) * REACH
        const count = row[i]
        return (
          <g key={word}>
            <text
              x={x + 3}
              y={VOCAB_Y}
              transform={`rotate(-55 ${x + 3} ${VOCAB_Y})`}
              className={`${small} fill-ink ${count > 0 ? 'font-bold' : ''}`}
            >
              {word}
            </text>
            <rect
              x={x - 6}
              y={w > 0 ? BAND_Y - h : BAND_Y}
              width={12}
              height={Math.max(h, 0.5)}
              rx={2}
              className={w > 0 ? 'fill-sage' : 'fill-ink'}
              fillOpacity={count > 0 ? (w > 0 ? 1 : 0.75) : 0.3}
            />
            <rect
              x={at(i) + 1}
              y={ROW_Y}
              width={CELL - 2}
              height={ROW_H}
              rx={3}
              className={count > 0 ? 'fill-ink' : 'fill-paper'}
              fillOpacity={count > 0 ? Math.min(0.5, 0.08 + 0.1 * count) : 1}
            />
            <text
              x={x}
              y={ROW_Y + ROW_H / 2 + 4}
              textAnchor="middle"
              className={`${small} ${count > 0 ? 'fill-ink font-bold' : 'fill-zinc-faded'}`}
            >
              {count}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// Write a card of your own and watch it become a row of counts, then a
// verdict from each sorter
export default function Lab() {
  const id = useId()
  const [text, setText] = useState(PRESETS[0])
  const row = countsOf(text)
  const dropped = [...new Set(unknownWords(text))]
  const listScore = scoreOf(LIST_WEIGHTS, 0, row)
  const chance = chanceOf(LEARNED, row)
  const listSays = listScore > 0 ? 'happy' : listScore < 0 ? 'unhappy' : 'can’t tell'

  return (
    <div>
      <label htmlFor={id} className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">
        Your card
      </label>
      <input
        id={id}
        type="text"
        value={text}
        maxLength={120}
        onChange={(event) => setText(event.target.value)}
        className="mt-2 mb-5 w-full rounded-xl border border-zinc-300 dark:border-zinc-200/20 bg-paper px-4 py-2 font-mono text-base text-ink outline-none focus:border-sage"
      />
      <Row row={row} />
      <p className="mt-3 min-h-[1.5rem] font-mono text-[0.875rem] text-zinc-faded">
        {dropped.length > 0 ? `Not in the vocabulary, so dropped: ${dropped.join(', ')}` : 'Every word is in the vocabulary.'}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <Readout label="Word list" value={`${signed(listScore, 0).replace('+0', '0')} · ${listSays}`} />
        <Readout label="Learned: chance happy" value={pct(chance)} accent />
      </div>
      <Controls>
        {PRESETS.map((preset) => (
          <Button key={preset} onClick={() => setText(preset)}>
            {preset}
          </Button>
        ))}
      </Controls>
    </div>
  )
}
