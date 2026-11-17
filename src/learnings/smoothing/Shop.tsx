import { lerp, usePlay } from '../../components/explain/useLoop'
import { chance, CONTEXT, END, MENU, neverShare, num, oneIn, ORDERS, pct, ROW, rowCounts, SEEN, V, VISITS } from './model'

const WIDTH = 460
const HEIGHT = 436
const LABEL = 18
const BAR = 104
const BAR_END = 372
const VALUE = 452
const TOP = 44
const PITCH = 22
const THICK = 14
// One pick's length: room for mango's 5 real picks and 1 pretend one
const UNIT = (BAR_END - BAR) / 6
const VISITS_TOP = TOP + ROW.length * PITCH + 66
const VISIT_NAMES = ['1st', '2nd', '3rd', '4th', '5th']

export type Show = 'tally' | 'chances' | 'week' | 'add-one' | 'share' | 'small' | 'named'

const rowY = (i: number) => TOP + i * PITCH
// How many picks come before each row's, as the tally is drawn
const BEFORE = rowCounts.map((_, i) => rowCounts.slice(0, i).reduce((a, b) => a + b, 0))

// The tally of your niece's ice creams, which is what followed "want" in
// the sentences: real picks as ink blocks, pretend ones in sage. `from` and `to` are the
// pretend count k before and after this step; it plays the change.
export default function Shop({ show, from, to }: { show: Show; from: number; to: number }) {
  // The tally builds up on the first step; later steps move k
  const played = usePlay(1, show === 'tally' ? 1600 : 900)
  const k = lerp(from, to, played)
  const grown = show === 'tally' ? played * ORDERS : ORDERS
  const named = show === 'named'
  const label = (w: string) => (named ? (w === END ? '</s>' : w) : MENU[w])
  const chances = show !== 'tally'
  const smoothed = to > 0
  const never = neverShare(to)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={
        named
          ? `The words that followed want in twelve sentences: mango 5 times, lemon 2, mint 1, and 8 words never, each given ${to} pretend counts.`
          : `Your niece's 8 ice creams: mango 5, lemon 2, mint 1, and 8 flavours never picked${smoothed ? `, each given ${to} pretend picks` : ''}.`
      }
    >
      <text x={LABEL} y={18} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {named ? `after “${CONTEXT}”, ${ORDERS} times` : `her ${ORDERS} ice creams`}
      </text>
      {smoothed && (
        <text x={VALUE} y={18} textAnchor="end" className="fill-sage-ink font-mono text-[11px] uppercase tracking-widest">
          +{to} pretend each
        </text>
      )}

      {ROW.map((w, i) => {
        const count = rowCounts[i]
        // Picks so far, in the order the tally was kept: one block at a time
        const real = Math.max(0, Math.min(count, grown - BEFORE[i]))
        const y = rowY(i)
        const p = chance(CONTEXT, w, to)
        const unseen = count === 0
        return (
          <g key={w}>
            <text x={LABEL} y={y + 11} className="fill-ink font-mono text-[11px]">
              {label(w)}
            </text>
            <line x1={BAR} x2={BAR} y1={y - 2} y2={y + THICK + 2} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
            {Array.from({ length: Math.ceil(real) }, (_, j) => (
              <rect
                key={j}
                x={BAR + j * UNIT + 1}
                y={y}
                width={Math.max(0, Math.min(1, real - j) * UNIT - 2)}
                height={THICK}
                rx={3}
                className="fill-ink"
                fillOpacity={0.75}
              />
            ))}
            {k > 0 && (
              <rect x={BAR + count * UNIT + 1} y={y} width={Math.max(1.5, k * UNIT - 2)} height={THICK} rx={3} className="fill-sage" />
            )}
            <text
              x={VALUE}
              y={y + 11}
              textAnchor="end"
              className={`font-mono text-[11px] tabular-nums ${unseen && smoothed ? 'fill-sage-ink' : 'fill-ink'}`}
            >
              {chances ? (unseen && !smoothed ? 'never' : pct(p)) : Math.floor(real)}
            </text>
          </g>
        )
      })}

      {(show === 'share' || show === 'small' || named) && (
        <g>
          <path
            d={`M${LABEL - 6},${rowY(SEEN) - 1} h-5 V${rowY(ROW.length - 1) + THICK + 1} h5`}
            className="fill-none stroke-sage"
            strokeWidth={2}
          />
          <text x={LABEL} y={rowY(ROW.length) + 14} className="fill-sage-ink font-mono text-[11px]">
            {named ? 'never seen after it' : 'never picked'}, together: {pct(never)} of the guess
          </text>
        </g>
      )}

      {(show === 'week' || show === 'add-one' || show === 'share' || show === 'small') && (
        <Visits k={to} />
      )}
      {named && (
        <text x={WIDTH / 2} y={VISITS_TOP + 40} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
          the menu: all {V} words that could come next
        </text>
      )}
    </svg>
  )
}

// Her next five visits, and the chance of all five: one factor a visit
function Visits({ k }: { k: number }) {
  const cell = (WIDTH - 2 * LABEL) / VISIT_NAMES.length
  const product = VISITS.reduce((total, w) => total * chance(CONTEXT, w, k), 1)
  return (
    <g>
      <text x={LABEL} y={VISITS_TOP - 14} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        her next five, multiplied
      </text>
      {VISITS.map((w, i) => {
        const x = LABEL + cell * (i + 0.5)
        const zero = chance(CONTEXT, w, k) === 0
        return (
          <g key={i}>
            <text x={x} y={VISITS_TOP + 6} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
              {VISIT_NAMES[i]}
            </text>
            <text x={x} y={VISITS_TOP + 24} textAnchor="middle" className="fill-ink font-mono text-[11px]">
              {MENU[w]}
            </text>
            <text
              x={x}
              y={VISITS_TOP + 42}
              textAnchor="middle"
              className={`font-mono text-[11px] tabular-nums ${zero ? 'fill-ink font-bold' : 'fill-ink'}`}
            >
              {num(rowCounts[ROW.indexOf(w)] + k)}/{num(ORDERS + k * V)}
            </text>
            {i > 0 && (
              <text x={x - cell / 2} y={VISITS_TOP + 42} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
                ×
              </text>
            )}
          </g>
        )
      })}
      <text x={WIDTH / 2} y={VISITS_TOP + 66} textAnchor="middle" className={`font-mono text-[11px] ${product === 0 ? 'fill-ink font-bold' : 'fill-sage-ink'}`}>
        chance of all five: {oneIn(product)}
      </text>
    </g>
  )
}
