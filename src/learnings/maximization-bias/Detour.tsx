import { useMemo } from 'react'
import { smooth } from '../sarsa/model'
import { detours, EVENINGS, FLOOR, percent, RUNS, STALL_MEAN } from './model'

const WIDTH = 640
const HEIGHT = 250
const LEFT = 44
const RIGHT = 560
const TOP = 16
const BOTTOM = 210

const x = (evening: number) => LEFT + (evening / (EVENINGS - 1)) * (RIGHT - LEFT)
const y = (share: number) => BOTTOM - share * (BOTTOM - TOP)
const path = (shares: number[]) => shares.map((share, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(share).toFixed(1)}`).join(' ')

// The fork: home, or the night market and its stalls
function Fork({ stalls }: { stalls: number }) {
  const shown = Math.min(stalls, 10)
  return (
    <svg viewBox="0 0 300 120" className="mx-auto w-full max-w-[22rem]" role="img" aria-label={`At the fork: home pays 0 and ends the evening; the market pays 0 to reach, then ${stalls} stalls, each worth ${STALL_MEAN} on average and varying a lot.`}>
      <circle cx={40} cy={60} r={14} className="fill-paper stroke-ink" strokeWidth={2} />
      <text x={40} y={92} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">fork</text>
      <line x1={54} y1={54} x2={124} y2={24} className="stroke-ink" strokeWidth={2} />
      <text x={132} y={28} className="fill-ink font-mono text-[11px] uppercase tracking-widest">home · 0</text>
      <line x1={54} y1={66} x2={124} y2={90} className="stroke-zinc-400" strokeWidth={2} />
      <circle cx={136} cy={94} r={10} className="fill-paper stroke-zinc-400" strokeWidth={2} />
      {Array.from({ length: shown }, (_, i) => (
        <line key={i} x1={146} y1={94} x2={200} y2={70 + (shown === 1 ? 24 : (i * 48) / (shown - 1))} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      ))}
      <text x={206} y={90} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {stalls} stall{stalls > 1 ? 's' : ''}
      </text>
      <text x={206} y={106} className="fill-zinc-faded font-mono text-[11px]">each −0.1 ± 1</text>
    </svg>
  )
}

// How often learners take the detour, evening by evening, averaged over a
// thousand of each: Q-learning, fooled by the best-looking stall, against
// Double Q-learning
export default function Detour({ stalls }: { stalls: number }) {
  const q = useMemo(() => smooth(detours('q', stalls), 5), [stalls])
  const double = useMemo(() => smooth(detours('double', stalls), 5), [stalls])
  const peak = Math.max(...q)

  return (
    <div>
      <Fork stalls={stalls} />
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-4 w-full"
        role="img"
        aria-label={`Share of ${RUNS} learners taking the detour each evening: Q-learning peaks at ${percent(peak)}, Double Q-learning stays near the ${percent(FLOOR)} that random picks alone give`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((share) => (
          <g key={share}>
            <line x1={LEFT} x2={RIGHT} y1={y(share)} y2={y(share)} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
            <text x={LEFT - 8} y={y(share) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
              {percent(share)}
            </text>
          </g>
        ))}
        {[1, 100, 200, 300].map((evening) => (
          <text key={evening} x={x(evening - 1)} y={BOTTOM + 18} textAnchor="middle" className="fill-zinc-400 font-mono text-[11px]">
            {evening}
          </text>
        ))}
        <text x={LEFT} y={HEIGHT - 4} className="fill-zinc-400 font-mono text-[11px] uppercase tracking-widest">
          Evening
        </text>
        <line x1={LEFT} x2={RIGHT} y1={y(FLOOR)} y2={y(FLOOR)} className="stroke-zinc-400" strokeDasharray="4 4" />
        <path d={path(q)} fill="none" className="stroke-ink" strokeWidth={1.75} />
        <path d={path(double)} fill="none" className="stroke-sage" strokeWidth={2} />
        <text x={RIGHT + 8} y={y(q.at(-1)!) - 4} className="fill-ink font-mono text-[11px] uppercase tracking-widest">
          Q
        </text>
        <text x={RIGHT + 8} y={y(double.at(-1)!) + 12} className="fill-sage font-mono text-[11px] uppercase tracking-widest">
          Double
        </text>
      </svg>
    </div>
  )
}
