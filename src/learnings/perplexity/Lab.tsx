import { useState } from 'react'
import { Choice, Controls, Readout } from '../../components/explain/figure'
import { END, HELD_OUT, MODELS, scoreOf, shown, SMOOTHINGS, tokens, TRAINING, type Model, type Smoothing } from './model'

const WIDTH = 480
const HEIGHT = 236
const LEFT = 40
const RIGHT = 470
const TOP = 46
const BOTTOM = 196
const chanceY = (chance: number) => BOTTOM - chance * (BOTTOM - TOP)

const SENTENCES = HELD_OUT.map((_, i) => i)
const letter = (i: number) => 'ABC'[i]

// Three models counted from a dozen sentences, scored on sentences they
// never saw: the chance each gives every word that came, and the perplexity
export default function Lab() {
  const [sentence, setSentence] = useState(0)
  const [model, setModel] = useState<Model>('Bigram')
  const [smoothing, setSmoothing] = useState<Smoothing>('None')
  const score = scoreOf(model, smoothing, sentence)
  const words = tokens(HELD_OUT[sentence])
  const step = (RIGHT - LEFT) / words.length
  const bar = Math.min(34, step * 0.6)
  const perWord = 1 / score.sentence

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`The ${model.toLowerCase()} model's chance for each word of “${HELD_OUT[sentence]}”: ${score.chances
          .map((c) => c.toFixed(2))
          .join(', ')}. Perplexity ${shown(score.sentence)}.`}
      >
        <text x={LEFT} y={16} className="fill-sage-ink font-mono text-[11px]">
          {Number.isFinite(score.sentence)
            ? `- - per-word chance ${perWord.toFixed(2)} = 1 ÷ ${shown(score.sentence)}`
            : 'one word got a chance of 0: perplexity ∞'}
        </text>
        {/* Chance 0, a half and 1 */}
        {[0, 0.5, 1].map((p) => (
          <g key={p}>
            <line x1={LEFT} x2={RIGHT} y1={chanceY(p)} y2={chanceY(p)} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={1} />
            <text x={LEFT - 6} y={chanceY(p) + 4} textAnchor="end" className="fill-zinc-faded font-mono text-[10px] tabular-nums">
              {p}
            </text>
          </g>
        ))}
        {Number.isFinite(score.sentence) && (
          <line
            x1={LEFT}
            x2={RIGHT}
            y1={chanceY(perWord)}
            y2={chanceY(perWord)}
            className="stroke-sage-ink"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
        )}
        {words.map((word, i) => {
          const x = LEFT + step * (i + 0.5)
          const chance = score.chances[i]
          return (
            <g key={i}>
              {chance > 0 ? (
                <rect x={x - bar / 2} y={chanceY(chance)} width={bar} height={BOTTOM - chanceY(chance)} rx={3} className="fill-sage" />
              ) : (
                <path d={`M${x - 6},${BOTTOM - 14} l12,12 m0,-12 l-12,12`} className="stroke-ink" strokeWidth={2} />
              )}
              <text
                x={x}
                y={(chance > 0 ? chanceY(chance) : BOTTOM - 14) - 6}
                textAnchor="middle"
                className="fill-ink stroke-paper font-mono text-[10px] tabular-nums"
                strokeWidth={6}
                paintOrder="stroke"
              >
                {chance > 0 ? chance.toFixed(2) : '0'}
              </text>
              <text x={x} y={BOTTOM + 18} textAnchor="middle" className="fill-ink font-mono text-[11px]">
                {word === END ? '(end)' : word}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Readout label="This sentence" value={shown(score.sentence)} accent />
        <Readout label="All held-out" value={shown(score.heldOut)} />
        <Readout label="Training text" value={shown(score.training)} />
      </div>
      <Controls>
        <Choice label="Held-out sentence" options={SENTENCES} value={sentence} onChange={setSentence} format={letter} />
        <Choice label="Model" options={MODELS} value={model} onChange={setModel} />
        <Choice label="Smoothing" options={SMOOTHINGS} value={smoothing} onChange={setSmoothing} />
      </Controls>
      <p className="mt-5 font-mono text-[0.8rem] leading-relaxed text-zinc-faded">
        Trained on: {TRAINING.join(' · ')}
      </p>
    </div>
  )
}
