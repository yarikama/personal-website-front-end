import { usePlay } from '../../components/explain/useLoop'
import { CARDS, CATALOGUE, cardsLeft, formatCount, halvingRun, halvings } from './model'

// The drawing, in SVG units
const WIDTH = 640
const HEIGHT = 372
const LEFT = 24
const RIGHT = 616
const SPAN = RIGHT - LEFT
const BAND_H = 26
const ROW_Y = (r: number) => 30 + r * 66
const TALLY_Y = 312

// Where the wanted card sits among all of them, and where each look's pick
// sits in its row, from 0 to 1 (the sign's 8 cabinets are drawn as cells)
const TARGET = 0.55
const SIGN = ['A', 'C', 'F', 'J', 'M', 'P', 'S', 'W']
const PICK = [4, 0.64, 0.7, 0.58]
const PICKED = ['M', 'Mob', 'Moby', 'Moby-Dick']

const HALVINGS = halvings(CARDS)
const HALVED = halvingRun(CARDS)

const WORDS = {
  story: {
    looks: 'Looks',
    left: 'Cards still possible',
    rows: ['Look 1 · the sign · 8 cabinets', 'Look 2 · cabinet M · 500 drawers', 'Look 3 · drawer Mob · 500 dividers', 'Look 4 · behind Moby · 500 cards'],
    all: `${formatCount(CARDS)} cards, filed by title`,
  },
  system: {
    looks: 'Pages read',
    left: 'Rows still possible',
    rows: ['Root page · 8 pointers', 'Level 2 page · 500 pointers', 'Level 3 page · 500 pointers', 'Leaf page · 500 rows'],
    all: `${formatCount(CARDS)} rows, sorted by key`,
  },
}

const label = 'fill-zinc-faded font-mono text-[11px] uppercase tracking-widest'
const ease = (t: number) => t * t * (3 - 2 * t)
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))

// The stretch binary search still has to look in after `k` halvings
function rangeAfter(k: number): [number, number] {
  let lo = 0
  let hi = 1
  for (let i = 0; i < k; i++) {
    const mid = (lo + hi) / 2
    if (TARGET < mid) hi = mid
    else lo = mid
  }
  return [lo, hi]
}

// A row of dots, one per look
function Tally({ y, count, shown, tone, name }: { y: number; count: number; shown: number; tone: string; name: string }) {
  return (
    <g>
      <text x={LEFT} y={y + 4} className={label}>
        {name}
      </text>
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
          cx={LEFT + 128 + i * 15.5}
          cy={y}
          r={4.5}
          className={i < shown ? tone : 'fill-none stroke-zinc-300 dark:stroke-zinc-200/25'}
        />
      ))}
    </g>
  )
}

// The library story. `start`: all the cards. `halve`: binary search, 30
// looks. `look`: the catalogue, `looks` of its four rows. `system` names
// everything as the database sees it.
export default function Catalogue({
  scene,
  looks = 0,
  system = false,
}: {
  scene: 'start' | 'halve' | 'look'
  looks?: number
  system?: boolean
}) {
  const span = scene === 'halve' ? HALVINGS : scene === 'look' ? 1 : 0
  const played = usePlay(span, scene === 'halve' ? 110 : 900)
  const words = system ? WORDS.system : WORDS.story

  // How far the newest row has come in, and whether its pick is lit yet
  const fresh = scene === 'look' ? ease(clamp01(played / 0.5)) : 1
  const picked = scene === 'look' && (played >= 0.5 || system)
  const halved = scene === 'halve' ? Math.floor(played) : 0
  const done = scene === 'look' ? (picked ? looks : looks - 1) : halved
  const left = scene === 'look' ? cardsLeft[done] : HALVED[halved]
  const [lo, hi] = rangeAfter(halved)

  return (
    <div>
      <div className="flex min-h-[1.5rem] flex-wrap items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="tabular-nums text-ink">
          {words.looks} {done}
        </span>
        <span className={`tabular-nums ${left === 1 ? 'text-sage-ink' : 'text-zinc-faded'}`}>
          {words.left} {formatCount(left)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 w-full"
        role="img"
        aria-label={
          scene === 'look'
            ? `${looks} of four rows, each choosing one of hundreds, narrowing a billion ${system ? 'rows' : 'cards'} to one`
            : 'A billion cards in one long band, narrowed by halving'
        }
      >
        {scene !== 'look' && (
          <g>
            <text x={LEFT} y={ROW_Y(0) - 10} className={label}>
              {words.all}
            </text>
            <rect x={LEFT} y={ROW_Y(0)} width={SPAN} height={BAND_H * 1.4} rx={6} className="fill-zinc-200 dark:fill-zinc-200/10" />
            {scene === 'halve' && (
              <rect
                x={LEFT + lo * SPAN}
                y={ROW_Y(0)}
                width={Math.max(3, (hi - lo) * SPAN)}
                height={BAND_H * 1.4}
                rx={Math.min(6, ((hi - lo) * SPAN) / 2)}
                className="fill-sage"
              />
            )}
            <text x={LEFT + TARGET * SPAN} y={ROW_Y(0) + BAND_H * 1.4 + 22} textAnchor="middle" className={label}>
              {scene === 'halve' && halved === HALVINGS ? 'Moby-Dick, found' : 'Moby-Dick is in here'}
            </text>
          </g>
        )}

        {scene === 'look' &&
          CATALOGUE.slice(0, looks).map((size, r) => {
            const y = ROW_Y(r)
            const newest = r === looks - 1
            const opacity = newest ? fresh : 1
            const lit = !newest || picked
            const cell = (SPAN - 7 * 4) / 8
            const at = r === 0 ? LEFT + PICK[0] * (cell + 4) : LEFT + PICK[r] * SPAN - 3
            const wide = r === 0 ? cell : 6
            return (
              <g key={r} opacity={opacity}>
                <text x={LEFT} y={y - 9} className={label}>
                  {words.rows[r]}
                </text>
                {r === 0 ? (
                  SIGN.map((letter, i) => (
                    <g key={letter}>
                      <rect
                        x={LEFT + i * (cell + 4)}
                        y={y}
                        width={cell}
                        height={BAND_H}
                        rx={5}
                        className={i === PICK[0] && lit ? 'fill-sage' : 'fill-paper stroke-zinc-400'}
                      />
                      <text
                        x={LEFT + i * (cell + 4) + cell / 2}
                        y={y + BAND_H / 2 + 4.5}
                        textAnchor="middle"
                        className={`font-mono text-[13px] ${i === PICK[0] && lit ? 'fill-paper' : 'fill-ink'}`}
                      >
                        {letter}
                      </text>
                    </g>
                  ))
                ) : (
                  <g>
                    <rect x={LEFT} y={y} width={SPAN} height={BAND_H} rx={5} className="fill-paper stroke-zinc-400" />
                    <path
                      d={Array.from({ length: size - 1 }, (_, i) => `M${LEFT + ((i + 1) * SPAN) / size} ${y + 6}v${BAND_H - 12}`).join('')}
                      className="stroke-zinc-300 dark:stroke-zinc-200/25"
                      strokeWidth={0.5}
                    />
                    {lit && <rect x={at} y={y - 2} width={wide} height={BAND_H + 4} rx={2} className="fill-sage" />}
                    {lit && (
                      <text x={at + wide / 2} y={y + BAND_H + 16} textAnchor="middle" className="fill-sage-ink font-mono text-[12px]">
                        {PICKED[r]}
                      </text>
                    )}
                  </g>
                )}
                {/* The pick opens into the next row */}
                {lit && r < looks - 1 && (
                  <path
                    d={`M${at} ${y + BAND_H + (r === 0 ? 0 : 2)} L${at + wide} ${y + BAND_H + (r === 0 ? 0 : 2)} L${RIGHT} ${ROW_Y(r + 1) - 22} L${LEFT} ${ROW_Y(r + 1) - 22} Z`}
                    className="fill-sage/10"
                  />
                )}
              </g>
            )
          })}

        {scene !== 'start' && (
          <g>
            <Tally y={TALLY_Y} count={HALVINGS} shown={scene === 'halve' ? halved : HALVINGS} tone="fill-zinc-400" name="Halving" />
            {scene === 'look' && (
              <Tally y={TALLY_Y + 28} count={4} shown={done} tone="fill-sage" name={system ? 'B+-tree' : 'Catalogue'} />
            )}
          </g>
        )}
      </svg>
    </div>
  )
}
