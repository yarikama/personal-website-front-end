import { useMemo, useState } from 'react'
import { Choice, Controls, Readout } from '../../components/explain/figure'
import { seeded } from '../../components/explain/random'
import { usePlay } from '../../components/explain/useLoop'
import { AVERAGE_MISS, FIRST_GUESS, HIKES, HUT, learnRun, miss, NS, RUNS, showN, SHOWN_RUN, STEP, TRUE } from './model'

const WIDTH = 460
const HEIGHT = 200
const LEFT = 30
const BOTTOM = 170
const TOP = 12
const MOST = 200
const SLOT = (WIDTH - LEFT - 10) / HUT


const y = (minutes: number) => BOTTOM - (Math.min(MOST, minutes) / MOST) * (BOTTOM - TOP)

// Learning the trail with the n you pick: every post starts at 100 minutes
// and ten hikes go by; the bars are the chalk after each, the outlines the
// truth. Below, how far off each n ends up on average.
function Run({ n }: { n: number }) {
  const chalks = useMemo(() => learnRun(seeded(SHOWN_RUN), n, STEP, HIKES), [n])
  const hikes = Math.floor(usePlay(HIKES, 650))
  const chalk = chalks[hikes]
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.8rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">
          {hikes} of {HIKES} hikes
        </span>
        <span className="text-right text-sage">Off by {Math.round(miss(chalk))} min</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`The chalk on each post after ${hikes} hikes with n ${showN(n)}, beside the true minutes left`}
      >
        {[0, 100, 200].map((minutes) => (
          <g key={minutes}>
            <line x1={LEFT} x2={WIDTH - 6} y1={y(minutes)} y2={y(minutes)} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={0.5} />
            <text x={LEFT - 6} y={y(minutes) + 3} textAnchor="end" className="fill-zinc-400 font-mono text-[10px]">
              {minutes}
            </text>
          </g>
        ))}
        {TRUE.slice(0, HUT).map((value, i) => {
          const x = LEFT + i * SLOT + SLOT / 2
          const guess = Math.max(0, chalk[i])
          return (
            <g key={i}>
              <rect x={x - 10} y={y(guess)} width={20} height={BOTTOM - y(guess)} className="fill-sage/70" />
              <rect x={x - 13} y={y(value)} width={26} height={BOTTOM - y(value)} fill="none" className="stroke-ink" strokeWidth={1} strokeDasharray="3 2" />
              <text x={x} y={BOTTOM + 15} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
                {i}
              </text>
            </g>
          )
        })}
        <text x={WIDTH - 6} y={BOTTOM + 28} textAnchor="end" className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
          post
        </text>
      </svg>
    </div>
  )
}

export default function Learn() {
  const [n, setN] = useState<(typeof NS)[number]>(1)
  const top = Math.max(...AVERAGE_MISS.map((m) => m.miss))
  return (
    <div>
      <Run key={n} n={n} />
      <Controls>
        <Choice label="Legs before trusting the chalk" options={NS} value={n} onChange={setN} format={showN} />
        <Readout label={`Off by, over ${RUNS} runs`} value={`${Math.round(AVERAGE_MISS.find((m) => m.n === n)!.miss)} min`} accent />
      </Controls>
      <div className="mt-6">
        <p className="font-mono text-[0.7rem] uppercase tracking-widest text-zinc-faded">
          Off by after {HIKES} hikes, starting from {FIRST_GUESS} everywhere
        </p>
        <div className="mt-2 flex h-24 items-end gap-1.5">
          {AVERAGE_MISS.map((m) => (
            <button
              key={m.n}
              onClick={() => setN(m.n)}
              aria-label={`n ${showN(m.n)}: off by ${Math.round(m.miss)} minutes`}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="font-mono text-[0.7rem] tabular-nums text-zinc-faded">{Math.round(m.miss)}</span>
              <span
                className={`w-full ${m.n === n ? 'bg-sage' : 'bg-zinc-300 dark:bg-zinc-200/35'}`}
                style={{ height: `${(m.miss / top) * 60}%` }}
              />
              <span className={`font-mono text-[0.7rem] ${m.n === n ? 'text-sage' : 'text-zinc-faded'}`}>{showN(m.n)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
