import { useLoop, usePlay } from '../../components/explain/useLoop'
import { Cells, Weights } from './Cells'
import {
  K,
  MAP,
  POOLED,
  SECOND,
  SEVEN,
  SEVEN_MAPS,
  SEVEN_POOLED,
  SEVEN_SCORES,
  SIZE,
  STAMPS,
  STORY_DENSE_ONE,
  STORY_FIRST,
  STORY_SECOND,
} from './model'

export type Show = 'digit' | 'wired' | 'stamp' | 'stamps' | 'pool' | 'second' | 'named'

const WIDTH = 560
const HEIGHT = 404
const IN = { x: 8, y: 44, cell: 20 }
const MAPS = { x: 216, cell: 16, tops: [30, 156, 282] }
const POOL = { x: 348, cell: 28 }
const OUT = { x: 458, w: 96, h: 46, tops: [150, 218] }
const SPOTS = MAP * MAP

const caps = 'font-mono text-[11px] uppercase tracking-widest'
const mono = 'font-mono text-[11px] tabular-nums'
const slot = 'fill-none stroke-zinc-300 dark:stroke-zinc-400'
const signed = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`

const HEADINGS: Record<'story' | 'named', string[]> = {
  story: ['Envelope', 'Maps', 'Shrunk', 'Scores'],
  named: ['Input', 'Channels', 'Max pool', 'Layer 2'],
}

const poolTop = (n: number) => MAPS.tops[n] + (MAP * MAPS.cell - POOLED * POOL.cell) / 2
const inCentre = (i: number) => IN.y + (i + 0.5) * IN.cell

// The story: a 7 on an envelope, read first with a weight on every wire,
// then with small stamps pressed everywhere, shrunk, and read again by a
// second layer of stamps.
export default function Postcode({ show }: { show: Show }) {
  const at = (s: Show) => ORDER.indexOf(show) >= ORDER.indexOf(s)
  // Where the stamp is pressed: one spot every 90 ms
  const pressed = usePlay(SPOTS, 90)
  // The wired square going round the map
  const loop = useLoop(SPOTS * 140, 0.3)
  // The pooled squares appearing, block by block
  const pooled = usePlay(POOLED * POOLED, 260)

  const sliding = show === 'stamp' || show === 'stamps'
  const filled = sliding ? Math.floor(pressed) + (pressed >= SPOTS ? 0 : 1) : SPOTS
  const spot = Math.min(SPOTS - 1, Math.floor(pressed))
  const maps = show === 'wired' || show === 'stamp' ? 1 : at('stamps') ? STAMPS.length : 0
  const target = Math.min(SPOTS - 1, Math.floor(loop * SPOTS))
  const block = show === 'pool' ? Math.min(POOLED * POOLED - 1, Math.floor(pooled)) : null
  const headings = HEADINGS[show === 'named' ? 'named' : 'story']

  // Short lines, so they still fit beside the maps once a phone enlarges them
  const info =
    show === 'digit'
      ? [`${SIZE} × ${SIZE} squares`, 'ink = stroke']
      : show === 'wired'
        ? [`${SIZE * SIZE} wires to`, 'each square:', `${STORY_DENSE_ONE.toLocaleString('en-US')} weights`]
        : show === 'stamp'
          ? [`${K * K} weights,`, 'used at all', `${SPOTS} spots`]
          : show === 'stamps' || show === 'pool'
            ? ['three stamps:', `${STORY_FIRST} weights`]
            : show === 'second'
              ? ['two stamps on', 'three maps:', `${STORY_SECOND} weights`]
              : ['every weight', 'learned from', 'examples']

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`A handwritten 7 on an ${SIZE} by ${SIZE} grid. ${info.join(', ')}.`}
    >
      {/* Column headings */}
      {[IN.x + (SIZE * IN.cell) / 2, MAPS.x + (MAP * MAPS.cell) / 2, POOL.x + (POOLED * POOL.cell) / 2, OUT.x + OUT.w / 2].map(
        (x, n) =>
          (n === 0 || (n === 1 && maps > 0) || (n === 2 && at('pool')) || (n === 3 && at('second'))) && (
            <text key={n} x={x} y={14} textAnchor="middle" className={`fill-zinc-faded ${caps}`}>
              {headings[n]}
            </text>
          ),
      )}

      {/* Where each later stage will go, empty until its step */}
      {MAPS.tops.map((top, n) =>
        n < maps ? null : (
          <rect key={`m${n}`} x={MAPS.x} y={top} width={MAP * MAPS.cell} height={MAP * MAPS.cell} rx={4} className={slot} strokeDasharray="4 4" />
        ),
      )}
      {!at('pool') &&
        MAPS.tops.map((_, n) => (
          <rect key={`p${n}`} x={POOL.x} y={poolTop(n)} width={POOLED * POOL.cell} height={POOLED * POOL.cell} rx={4} className={slot} strokeDasharray="4 4" />
        ))}
      {!at('second') &&
        OUT.tops.map((top) => (
          <rect key={`o${top}`} x={OUT.x} y={top} width={OUT.w} height={OUT.h} rx={23} className={slot} strokeDasharray="4 4" />
        ))}

      <Cells grid={SEVEN} x={IN.x} y={IN.y} cell={IN.cell} />
      {info.map((line, n) => (
        <text key={n} x={IN.x} y={IN.y + SIZE * IN.cell + 26 + 22 * n} className={`fill-ink ${mono}`}>
          {line}
        </text>
      ))}

      {/* Wired: every input square to one map square */}
      {show === 'wired' &&
        SEVEN.flatMap((row, i) =>
          row.map((_, j) => (
            <line
              key={`${i}-${j}`}
              x1={IN.x + (j + 0.5) * IN.cell}
              y1={inCentre(i)}
              x2={MAPS.x + ((target % MAP) + 0.5) * MAPS.cell}
              y2={MAPS.tops[0] + (Math.floor(target / MAP) + 0.5) * MAPS.cell}
              className="stroke-ink"
              strokeOpacity={0.18}
              strokeWidth={0.7}
            />
          )),
        )}
      {/* The stamp, pressed at one spot of the envelope */}
      {sliding && (
        <rect
          x={IN.x + (spot % MAP) * IN.cell}
          y={IN.y + Math.floor(spot / MAP) * IN.cell}
          width={K * IN.cell}
          height={K * IN.cell}
          rx={3}
          className="fill-sage stroke-sage"
          fillOpacity={0.12}
          strokeWidth={2.5}
        />
      )}

      {/* The maps, one per stamp, with the stamp beside it */}
      {Array.from({ length: maps }, (_, n) => (
        <g key={n}>
          {show !== 'wired' && (
            <>
              <Weights filter={STAMPS[n].filter} x={MAPS.x - 38} y={MAPS.tops[n]} cell={11} />
              <text x={MAPS.x} y={MAPS.tops[n] + MAP * MAPS.cell + 16} className={`fill-ink ${caps}`}>
                {show === 'named' ? `Filter ${n + 1}` : STAMPS[n].name}
              </text>
            </>
          )}
          <Cells
            grid={SEVEN_MAPS[n]}
            x={MAPS.x}
            y={MAPS.tops[n]}
            cell={MAPS.cell}
            tone="sage"
            upTo={show === 'wired' ? 0 : filled}
          />
          {block !== null && (
            <rect
              x={MAPS.x + (block % POOLED) * 2 * MAPS.cell}
              y={MAPS.tops[n] + Math.floor(block / POOLED) * 2 * MAPS.cell}
              width={2 * MAPS.cell}
              height={2 * MAPS.cell}
              className="fill-none stroke-ink"
              strokeWidth={1.5}
            />
          )}
        </g>
      ))}

      {/* The wired square, over its map */}
      {show === 'wired' && (
        <rect
          x={MAPS.x + (target % MAP) * MAPS.cell}
          y={MAPS.tops[0] + Math.floor(target / MAP) * MAPS.cell}
          width={MAPS.cell}
          height={MAPS.cell}
          className="fill-ink"
        />
      )}

      {/* Shrunk: the strongest value in each 2 × 2 block */}
      {at('pool') &&
        SEVEN_POOLED.map((grid, n) => (
          <g key={n}>
            <line
              x1={MAPS.x + MAP * MAPS.cell + 6}
              x2={POOL.x - 6}
              y1={poolTop(n) + (POOLED * POOL.cell) / 2}
              y2={poolTop(n) + (POOLED * POOL.cell) / 2}
              className="stroke-zinc-400"
              strokeWidth={1}
            />
            <Cells grid={grid} x={POOL.x} y={poolTop(n)} cell={POOL.cell} tone="sage" upTo={block === null ? Infinity : block + 1} />
          </g>
        ))}

      {/* The second layer: each stamp reads all three shrunk maps */}
      {at('second') &&
        SECOND.map((stamp, s) => (
          <g key={stamp.name}>
            {SEVEN_POOLED.map((_, n) => (
              <line
                key={n}
                x1={POOL.x + POOLED * POOL.cell + 4}
                y1={poolTop(n) + (POOLED * POOL.cell) / 2}
                x2={OUT.x}
                y2={OUT.tops[s] + OUT.h / 2}
                className="stroke-zinc-400"
                strokeWidth={1}
              />
            ))}
            <rect
              x={OUT.x}
              y={OUT.tops[s]}
              width={OUT.w}
              height={OUT.h}
              rx={23}
              className={SEVEN_SCORES[s] > 0 ? 'fill-sage stroke-sage' : 'fill-paper stroke-zinc-400'}
              fillOpacity={SEVEN_SCORES[s] > 0 ? 0.25 : 1}
              strokeWidth={1.5}
            />
            <text x={OUT.x + 18} y={OUT.tops[s] + OUT.h / 2 + 7} className="fill-ink font-serif text-[20px]">
              {stamp.name}
            </text>
            <text x={OUT.x + OUT.w - 12} y={OUT.tops[s] + OUT.h / 2 + 4} textAnchor="end" className={`fill-ink ${mono}`}>
              {signed(SEVEN_SCORES[s])}
            </text>
          </g>
        ))}
    </svg>
  )
}

const ORDER: Show[] = ['digit', 'wired', 'stamp', 'stamps', 'pool', 'second', 'named']
