import { useState } from 'react'
import { Button, Choice, Controls, Readout, Slider } from '../../components/explain/figure'
import { seeded } from '../../components/explain/random'
import { box, endless, endlessQuality, explain, guess, keep, pct, points, SENTENCE_NAMES, SENTENCES, WIDTH, WIDTHS, type SentenceName } from './model'

const VIEW_W = 460
const ROW = 28
const LABEL_X = 96
const ZERO = 278
// Pixels per unit of credit (one unit is 100 points)
const SCALE = 160
const clampX = (x: number) => Math.max(LABEL_X + 6, Math.min(VIEW_W - 6, x))

// LIME run live on the toy box: pick a review, how many copies and how wide
// "near" is, draw again, and cover words yourself to check the line against
// the box.
export default function Lab() {
  const [name, setName] = useState<SentenceName>('not bad')
  const [count, setCount] = useState(16)
  const [width, setWidth] = useState<(typeof WIDTHS)[number]>(WIDTH)
  const [seed, setSeed] = useState(1)
  // Which words the reader has covered, kept with the review they belong to,
  // so a new review starts with every word showing
  const [covered, setCovered] = useState<{ name: SentenceName; kept: boolean[] }>({ name, kept: SENTENCES[name].map(() => true) })

  const words = SENTENCES[name]
  const kept = covered.name === name ? covered.kept : words.map(() => true)
  const run = explain(words, count, seeded(seed), width)
  const truth = endless(words, width)
  const height = words.length * ROW + 34

  const toggle = (i: number) => setCovered({ name, kept: kept.map((k, j) => (j === i ? !k : k)) })

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Cover or show a word">
        {words.map((word, i) => (
          <button
            key={word}
            onClick={() => toggle(i)}
            aria-pressed={!kept[i]}
            className={`rounded-lg border px-2.5 py-1 font-mono text-sm transition-colors ${
              kept[i] ? 'border-zinc-300 dark:border-zinc-200/20 text-ink hover:border-ink' : 'border-ink bg-ink text-paper'
            }`}
          >
            {word}
          </button>
        ))}
      </div>
      <p className="mt-2 font-mono text-[0.875rem] text-zinc-faded">Tap a word to cover it.</p>

      <svg
        viewBox={`0 0 ${VIEW_W} ${height}`}
        className="mt-4 w-full"
        role="img"
        aria-label={`Credit per word from ${count} copies: ${words.map((w, i) => `${w} ${points(run.line.credit[i])}`).join(', ')}. With endless copies: ${words.map((w, i) => `${w} ${points(truth.credit[i])}`).join(', ')}.`}
      >
        <text x={LABEL_X} y={14} textAnchor="end" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          Word
        </text>
        <text x={ZERO - SCALE * 0.5} y={14} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          −50
        </text>
        <text x={ZERO} y={14} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          0
        </text>
        <text x={ZERO + SCALE * 0.5} y={14} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          +50
        </text>
        {[-0.5, 0.5].map((v) => (
          <line key={v} x1={ZERO + SCALE * v} x2={ZERO + SCALE * v} y1={22} y2={height - 4} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeDasharray="2 3" />
        ))}
        <line x1={ZERO} x2={ZERO} y1={22} y2={height - 4} className="stroke-zinc-400" />
        {words.map((word, i) => {
          const y = 30 + i * ROW
          const c = run.line.credit[i]
          const end = clampX(ZERO + SCALE * c)
          const tick = clampX(ZERO + SCALE * truth.credit[i])
          return (
            <g key={word}>
              <text x={LABEL_X} y={y + 13} textAnchor="end" className="fill-ink font-mono text-[11px]">
                {word}
              </text>
              <rect
                x={Math.min(ZERO, end)}
                y={y + 3}
                width={Math.max(Math.abs(end - ZERO), 0.5)}
                height={14}
                rx={3}
                className={c >= 0 ? 'fill-sage' : 'fill-ink'}
                fillOpacity={c >= 0 ? 1 : 0.6}
              />
              <line x1={tick} x2={tick} y1={y} y2={y + 20} className="stroke-ink" strokeWidth={2} />
              <text
                x={c >= 0 ? Math.min(end + 6, VIEW_W - 30) : Math.max(end - 6, LABEL_X + 30)}
                y={y + 14}
                textAnchor={c >= 0 ? 'start' : 'end'}
                className="fill-ink font-mono text-[11px] tabular-nums"
              >
                {points(c)}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
        <Readout label="Box says" value={pct(box(keep(words, kept)))} />
        <Readout label="Line says" value={pct(Math.max(0, Math.min(1, guess(run.line, kept))))} accent />
        <Readout label="Line fits box" value={pct(Math.max(0, run.quality))} />
        <Readout label="Fit, ∞ copies" value={pct(Math.max(0, endlessQuality(words, width)))} />
      </div>

      <Controls>
        <Choice label="Review" options={SENTENCE_NAMES} value={name} onChange={setName} />
        <Slider label="Copies" value={count} min={8} max={500} onChange={setCount} />
        <Choice label="Kernel width σ" options={WIDTHS} value={width} onChange={setWidth} />
        <Button onClick={() => setSeed((s) => s + 1)}>Draw again</Button>
      </Controls>
    </div>
  )
}
