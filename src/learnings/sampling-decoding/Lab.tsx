import { useState } from 'react'
import { seeded } from '../../components/explain/random'
import { Button, Choice, Controls, Readout, Slider } from '../../components/explain/figure'
import {
  BLANKS,
  decode,
  draws,
  LAB_DRAWS,
  LAB_SEED,
  LAB_START,
  METHODS,
  nonsenseShare,
  percent,
  type Blank,
  type Method,
} from './model'

const WIDTH = 600
const HEIGHT = 262
const BASELINE = 186
const TALL = 160
const NAMES = BLANKS.map((b) => b.name)
type Name = (typeof NAMES)[number]

// Where a word's bar sits: the five sensible beach words, then its jokes
// packed tight; other blanks spread their words out
function placeOf(blank: Blank) {
  const many = blank.words.length > 12
  const named = many ? 5 : blank.words.length
  const pitch = many ? 34 : Math.min(44, (WIDTH - 60) / blank.words.length)
  const tail = 10
  return {
    named,
    x: (i: number) => 48 + (i < named ? i * pitch : named * pitch + 8 + (i - named) * tail),
    width: (i: number) => (i < named ? pitch * 0.62 : tail * 0.6),
    tailFrom: 48 + named * pitch + 8,
  }
}

// One blank's next-word chances, shaped by the temperature and cut by top-k
// or top-p; draw from them to write the word in the blank
export default function Lab() {
  const [name, setName] = useState<Name>('Beach')
  const [method, setMethod] = useState<Method>(LAB_START.method)
  const [k, setK] = useState(LAB_START.k)
  const [p, setP] = useState(LAB_START.p)
  const [temperature, setTemperature] = useState(LAB_START.temperature)
  const [round, setRound] = useState(0)

  const blank = BLANKS.find((b) => b.name === name)!
  const { shaped, keep, chances } = decode(blank, { method, k, p, temperature })
  const place = placeOf(blank)
  const drawn = draws(seeded(LAB_SEED + round * 7919), chances, LAB_DRAWS)
  const nonsense = nonsenseShare(blank, chances)
  const keptCount = keep.filter(Boolean).length
  const jokes = blank.words.length - place.named
  // The scale tops out at 50% unless a word goes past it
  const top = Math.max(...chances) > 0.5 ? 1 : 0.5
  const tall = (share: number) => (share / top) * TALL

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`After “${blank.before}”, at temperature ${temperature.toFixed(2)} with ${method === 'All words' ? 'no cut' : method === 'Top-k' ? `top-k at ${k}` : `top-p at ${p.toFixed(2)}`}: ${keptCount} words can be drawn, the likeliest with chance ${percent(Math.max(...chances))}, and a word that makes no sense ${percent(nonsense)} of the time.`}
      >
        <text x={20} y={16} className="fill-ink font-mono text-[12px]">
          “{blank.before} …”
        </text>
        {/* The chance scale */}
        {[0, 0.25, 0.5, 0.75, 1].map((step) => step * top).map((share) => (
          <g key={share}>
            <line
              x1={44}
              x2={WIDTH - 12}
              y1={BASELINE - tall(share)}
              y2={BASELINE - tall(share)}
              className="stroke-zinc-300 dark:stroke-zinc-200/25"
              strokeDasharray={share === 0 ? undefined : '2 4'}
            />
            <text x={38} y={BASELINE - tall(share) + 4} textAnchor="end" className="fill-zinc-faded font-mono text-[10px]">
              {Number((share * 100).toFixed(1))}%
            </text>
          </g>
        ))}
        {blank.words.map((w, i) => {
          // A cut word keeps a faint bar of the chance it had before the cut
          const height = tall(keep[i] ? chances[i] : shaped[i])
          return (
            <g key={w.word}>
              <rect
                x={place.x(i)}
                y={BASELINE - Math.max(1, height)}
                width={place.width(i)}
                height={Math.max(1, height)}
                rx={1.5}
                className={keep[i] && w.sensible ? 'fill-sage' : 'fill-ink'}
                fillOpacity={keep[i] ? (w.sensible ? 1 : 0.85) : 0.15}
              />
              {i < place.named && (
                <text
                  transform={`translate(${place.x(i) + place.width(i) / 2 + 4}, ${BASELINE + 8}) rotate(-90)`}
                  textAnchor="end"
                  className={`font-mono text-[11px] ${keep[i] ? 'fill-ink' : 'fill-zinc-faded'}`}
                >
                  {w.word}
                </text>
              )}
            </g>
          )
        })}
        {jokes > 0 && (
          <text x={place.tailFrom} y={BASELINE + 18} className="fill-zinc-faded font-mono text-[11px]">
            {jokes} joke words
          </text>
        )}
      </svg>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <Readout label="Words kept" value={keptCount} />
        <Readout label="Top word" value={percent(Math.max(...chances))} />
        <Readout label="Nonsense" value={percent(nonsense)} accent />
      </div>

      <div className="mt-5 flex flex-wrap gap-2" aria-label="Twelve words drawn for the blank">
        {drawn.map((i, n) => {
          const w = blank.words[i]
          return (
            <span
              key={n}
              className={`rounded-full px-3 py-1 font-mono text-[0.875rem] text-ink ${
                w.sensible ? 'bg-sage/15' : 'border border-ink'
              }`}
            >
              {w.word}
            </span>
          )
        })}
      </div>

      <Controls>
        <Choice label="Blank" options={NAMES} value={name} onChange={setName} />
        <Choice label="Cut" options={METHODS} value={method} onChange={setMethod} />
        <Button onClick={() => setRound((r) => r + 1)}>Draw again</Button>
      </Controls>
      <Controls>
        <Slider
          label="Temperature"
          value={temperature}
          min={0.2}
          max={3}
          step={0.05}
          onChange={setTemperature}
          format={(t) => t.toFixed(2)}
        />
        {method === 'Top-k' && <Slider label="k" value={k} min={1} max={12} onChange={setK} />}
        {method === 'Top-p' && <Slider label="p" value={p} min={0.05} max={1} step={0.05} onChange={setP} format={(v) => v.toFixed(2)} />}
      </Controls>
    </div>
  )
}
