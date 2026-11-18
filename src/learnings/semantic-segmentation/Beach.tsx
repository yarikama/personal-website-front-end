import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { BLOCK, BLOCKY, CLASSES, COARSE, COARSE_SIDE, LOOKALIKES, PHOTO, SIDE, SPREAD, TRUTH, type Label } from './model'

const WIDTH = 480
const HEIGHT = 282
const CELL = 13
const PANEL = SIDE * CELL
const LEFT = 18
const RIGHT = WIDTH - 18 - PANEL
const TOP = 34
// Real milliseconds the card rests on each window
const PER_WINDOW = 420

// How each name is drawn: sky stays empty, sea is sage, sand and the boat
// are ink, faint and full
const FILL: Record<Label, { className: string; opacity: number }> = {
  0: { className: 'fill-paper stroke-zinc-400', opacity: 1 },
  1: { className: 'fill-sage', opacity: 0.6 },
  2: { className: 'fill-ink', opacity: 0.28 },
  3: { className: 'fill-ink', opacity: 0.85 },
}

const HEADERS = [
  ['Photo', 'What is it?'],
  ['Photo', 'What each square is'],
  ['Photo', 'Two squares, alone'],
  ['Photo, through a card', 'One word per window'],
  ['Photo', '16 words, at full size'],
  ['Photo', 'Painted back, blended'],
  ['Image, 16 × 16 pixels', 'Labels, from 4 × 4 scores'],
]

function Header({ x, children }: { x: number; children: string }) {
  return (
    <text x={x} y={20} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
      {children}
    </text>
  )
}

function LabelMap({ map, wrong = false }: { map: Label[][]; wrong?: boolean }) {
  return (
    <g>
      {map.map((row, r) =>
        row.map((label, c) => (
          <rect
            key={`${r}-${c}`}
            x={RIGHT + c * CELL + 0.75}
            y={TOP + r * CELL + 0.75}
            width={CELL - 1.5}
            height={CELL - 1.5}
            rx={2}
            className={FILL[label].className}
            fillOpacity={FILL[label].opacity}
            strokeWidth={label === 0 ? 0.75 : 0}
          />
        )),
      )}
      {wrong &&
        map.map((row, r) =>
          row.map((label, c) =>
            label === TRUTH[r][c] ? null : (
              <circle
                key={`w${r}-${c}`}
                cx={RIGHT + c * CELL + CELL / 2}
                cy={TOP + r * CELL + CELL / 2}
                r={2.2}
                className="fill-ink"
              />
            ),
          ),
        )}
    </g>
  )
}

// The story's beach. On the left the photo, every square's ink its value;
// on the right what the story says about it at `step`. Step 3 plays: a card
// slides over the photo a window at a time and the coarse map fills in.
export default function Beach({ step }: { step: number }) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const windows = COARSE_SIDE * COARSE_SIDE
  const [shown, setShown] = useState(step === 3 && !reducedMotion ? 0 : windows)

  useAnimationFrame((time) => {
    if (shown >= windows) return
    started.current ??= time
    setShown(Math.min(windows, Math.floor((time - started.current) / PER_WINDOW) + 1))
  })

  const [leftHeader, rightHeader] = HEADERS[step]
  // Where the card is: the window being read, or (in the reveal) one of them
  const at = step === 3 ? Math.min(shown, windows) - 1 : step === 6 ? 9 : -1
  const card = at >= 0 ? { r: Math.floor(at / COARSE_SIDE), c: at % COARSE_SIDE } : null
  const legend = step >= 1 && step !== 2

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={describe(step)}
    >
      <Header x={LEFT}>{leftHeader}</Header>
      <Header x={RIGHT}>{rightHeader}</Header>

      {PHOTO.map((row, r) =>
        row.map((value, c) => (
          <rect
            key={`${r}-${c}`}
            x={LEFT + c * CELL + 0.75}
            y={TOP + r * CELL + 0.75}
            width={CELL - 1.5}
            height={CELL - 1.5}
            rx={2}
            className="fill-ink"
            fillOpacity={value}
          />
        )),
      )}

      {step === 2 &&
        [LOOKALIKES.sky, LOOKALIKES.sea].map(([r, c], i) => (
          <rect
            key={i}
            x={LEFT + c * CELL - 2}
            y={TOP + r * CELL - 2}
            width={CELL + 4}
            height={CELL + 4}
            rx={4}
            className="fill-none stroke-sage"
            strokeWidth={2.5}
          />
        ))}

      {card && (
        <g>
          <rect
            x={LEFT + card.c * BLOCK * CELL - 3}
            y={TOP + card.r * BLOCK * CELL - 3}
            width={BLOCK * CELL + 6}
            height={BLOCK * CELL + 6}
            rx={6}
            className="fill-none stroke-sage"
            strokeWidth={3}
          />
          {step === 6 && (
            <text
              x={LEFT + card.c * BLOCK * CELL + (BLOCK * CELL) / 2}
              y={TOP + card.r * BLOCK * CELL - 8}
              textAnchor="middle"
              className="fill-ink stroke-paper font-mono text-[10px] uppercase tracking-widest"
              strokeWidth={3}
              paintOrder="stroke"
            >
              Classifier
            </text>
          )}
        </g>
      )}

      {step === 0 && (
        <g>
          <text x={RIGHT + PANEL / 2} y={TOP + PANEL / 2} textAnchor="middle" className="fill-ink font-serif text-[40px] font-light">
            “Beach”
          </text>
          <text
            x={RIGHT + PANEL / 2}
            y={TOP + PANEL / 2 + 30}
            textAnchor="middle"
            className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest"
          >
            One word for it all
          </text>
        </g>
      )}

      {step === 1 && <LabelMap map={TRUTH} />}

      {step === 2 &&
        (['sky', 'sea'] as const).map((name, i) => {
          const [r, c] = LOOKALIKES[name]
          const size = 70
          const x = RIGHT + 18 + i * (size + 32)
          const y = TOP + 50
          return (
            <g key={name}>
              <rect x={x} y={y} width={size} height={size} rx={8} className="fill-ink" fillOpacity={PHOTO[r][c]} />
              <text x={x + size / 2} y={y + size + 22} textAnchor="middle" className="fill-ink font-mono text-[11px] uppercase tracking-widest">
                {name === 'sky' ? 'Sky?' : 'Sea?'}
              </text>
              <text x={x + size / 2} y={y + size + 40} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
                value {PHOTO[r][c].toFixed(2)}
              </text>
            </g>
          )
        })}

      {step === 3 &&
        COARSE.flat().map((label, i) => {
          if (i >= shown) return null
          const r = Math.floor(i / COARSE_SIDE)
          const c = i % COARSE_SIDE
          const size = BLOCK * CELL
          return (
            <g key={i}>
              <rect
                x={RIGHT + c * size + 1.5}
                y={TOP + r * size + 1.5}
                width={size - 3}
                height={size - 3}
                rx={5}
                className={FILL[label].className}
                fillOpacity={FILL[label].opacity}
                strokeWidth={label === 0 ? 0.75 : 0}
              />
              <text
                x={RIGHT + c * size + size / 2}
                y={TOP + r * size + size / 2 + 4}
                textAnchor="middle"
                className="fill-ink stroke-paper font-mono text-[11px]"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {CLASSES[label]}
              </text>
            </g>
          )
        })}

      {step === 4 && <LabelMap map={BLOCKY} wrong />}
      {step >= 5 && <LabelMap map={SPREAD} wrong={step === 5} />}

      {legend && (
        <g transform={`translate(${LEFT}, ${TOP + PANEL + 26})`}>
          {CLASSES.map((name, k) => (
            <g key={name} transform={`translate(${k * 78}, 0)`}>
              <rect
                x={0}
                y={-9}
                width={11}
                height={11}
                rx={2}
                className={FILL[k as Label].className}
                fillOpacity={FILL[k as Label].opacity}
                strokeWidth={k === 0 ? 0.75 : 0}
              />
              <text x={17} y={0} className="fill-ink font-mono text-[10px] uppercase tracking-widest">
                {name}
              </text>
            </g>
          ))}
          {(step === 4 || step === 5) && (
            <g transform="translate(320, 0)">
              <circle cx={5} cy={-3.5} r={2.6} className="fill-ink" />
              <text x={14} y={0} className="fill-ink font-mono text-[10px] uppercase tracking-widest">
                Wrong
              </text>
            </g>
          )}
        </g>
      )}
    </svg>
  )
}

function describe(step: number) {
  const photo = 'A 16 by 16 photo of a beach: sky at the top, rippled sea, sand rising from the bottom left, and a small boat.'
  return [
    `${photo} One word names it all: beach.`,
    `${photo} Beside it, every square named sky, sea, sand or boat.`,
    `${photo} A sky square and a sea square, side by side, have the same value.`,
    `${photo} A card with a 4 by 4 window slides over it, writing one word per window into a 4 by 4 map.`,
    `${photo} The 16 words read at full size: blocky, with a stepped shoreline and no boat.`,
    `${photo} The words painted back and blended: a smooth shoreline, still no boat.`,
    `${photo} The image, the classifier as a window, and the labels grown back from a 4 by 4 score map.`,
  ][step]
}
