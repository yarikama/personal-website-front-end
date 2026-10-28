import { usePlay } from '../../components/explain/useLoop'
import { DAYS, forever, pile, show, weight } from './model'

const WIDTH = 640
const LEFT = 44
const RIGHT = 620
const slot = (RIGHT - LEFT) / DAYS
// The top panel: each day's coin; the bottom: the pile so far
const BARS_TOP = 34
const BARS_BOTTOM = 140
const PILE_TOP = 192
const PILE_BOTTOM = 312

interface StreamProps {
  // How much a day later counts; 1 adds up plainly
  gamma: number
  // Animate γ from this to `gamma` (the coins shrinking)
  from?: number
  // Bring the days in one by one
  appear?: boolean
  // Write each of the first few coins' worth over its bar
  labels?: boolean
  // The reveal: the parts get their names
  named?: boolean
  // The top of the pile's scale (by default, a little above where it ends)
  top?: number
}

// A coin a day, for ever, as bars: each day's coin as it is worth today
// (γ^k), and under them the pile of all of them so far, climbing towards
// 1/(1 − γ) when γ is below 1 and without end when it is 1.
export default function Stream({ gamma, from, appear = false, labels = false, named = false, top }: StreamProps) {
  const days = usePlay(appear ? DAYS : 0, 70)
  const shrink = usePlay(from === undefined ? 0 : 1, 2200)
  const g = from === undefined ? gamma : from + (gamma - from) * Math.min(1, shrink)
  const shown = appear ? Math.min(DAYS, Math.floor(days) + 1) : DAYS
  const limit = forever(g)
  const scale = top ?? (Number.isFinite(limit) && limit < DAYS ? limit * 1.2 : DAYS * 1.15)
  const yBar = (w: number) => BARS_BOTTOM - w * (BARS_BOTTOM - BARS_TOP)
  const yPile = (v: number) => PILE_BOTTOM - (Math.min(v, scale * 1.05) / scale) * (PILE_BOTTOM - PILE_TOP)
  const x = (k: number) => LEFT + k * slot

  const points = Array.from({ length: shown + 1 }, (_, n) => `${x(n)},${yPile(pile(g, n))}`).join(' ')
  const sofar = pile(g, shown)

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} 340`} className="w-full" role="img" aria-label="A coin a day: what each is worth today, and the pile of them so far">
        <text x={LEFT} y={BARS_TOP - 14} className="fill-zinc-faded font-mono text-[15px] uppercase tracking-widest">
          {named ? (
            <>
              Each reward, discounted: <tspan className="normal-case">γᵏ × 1</tspan>
            </>
          ) : (
            'Each day’s coin, worth today'
          )}
        </text>
        {labels && (
          <text x={RIGHT} y={BARS_TOP + 16} textAnchor="end" className="fill-ink font-mono text-[15px]">
            {Array.from({ length: 4 }, (_, k) => show(weight(g, k))).join('  ·  ')}  · …
          </text>
        )}
        <line x1={LEFT} x2={RIGHT} y1={BARS_BOTTOM} y2={BARS_BOTTOM} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        {[0, 1].map((w) => (
          <text key={w} x={LEFT - 8} y={yBar(w) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[15px]">
            {w}
          </text>
        ))}
        {Array.from({ length: shown }, (_, k) => {
          const w = weight(g, k)
          return (
            <g key={k}>
              <rect x={x(k) + 2} y={yBar(w)} width={slot - 4} height={BARS_BOTTOM - yBar(w)} className={k === 0 ? 'fill-sage' : 'fill-sage/60'} />
            </g>
          )
        })}
        <text x={LEFT} y={BARS_BOTTOM + 16} className="fill-zinc-faded font-mono text-[15px] uppercase tracking-widest">
          {named ? 'Step 1' : 'Today'}
        </text>
        <text x={RIGHT} y={BARS_BOTTOM + 16} textAnchor="end" className="fill-zinc-faded font-mono text-[15px] uppercase tracking-widest">
          {named ? `step ${DAYS} …` : `day ${DAYS}, and on …`}
        </text>

        <text x={LEFT} y={PILE_TOP - 16} className="fill-zinc-faded font-mono text-[15px] uppercase tracking-widest">
          {named ? 'The return, G, so far' : 'All of them so far'}
        </text>
        <line x1={LEFT} x2={RIGHT} y1={PILE_BOTTOM} y2={PILE_BOTTOM} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        {Number.isFinite(limit) && limit <= scale * 1.05 && (
          <g>
            <line x1={LEFT} x2={RIGHT} y1={yPile(limit)} y2={yPile(limit)} className="stroke-ink" strokeDasharray="4 4" />
            <text x={LEFT + 4} y={yPile(limit) - 6} className="fill-ink font-mono text-[15px]">
              {named ? `1 / (1 − γ) = ${show(limit)}` : `never passes ${show(limit)}`}
            </text>
          </g>
        )}
        <polyline points={points} fill="none" className="stroke-sage" strokeWidth={3} strokeLinejoin="round" />
        <text x={x(shown) - 6} y={Math.max(PILE_TOP - 2, yPile(sofar) - 10)} textAnchor="end" className="fill-sage font-serif text-[26px]">
          {show(sofar, 1)}
        </text>
        {!Number.isFinite(limit) && (
          <text x={RIGHT} y={PILE_TOP - 16} textAnchor="end" className="fill-ink font-mono text-[15px] uppercase tracking-widest">
            no end in sight
          </text>
        )}
      </svg>
    </div>
  )
}
