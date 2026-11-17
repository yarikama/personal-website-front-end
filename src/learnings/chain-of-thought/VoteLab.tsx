import { useState } from 'react'
import { Choice, Controls, Readout, Slider } from '../../components/explain/figure'
import { LAB_MOST_CHAINS, LAB_PROBLEMS, LAB_SPREADS, LAB_START, labRun, percent, voteCurve, type Spread } from './model'

const WIDTH = 600
const HEIGHT = 250
const LEFT = 58
const RIGHT = 580
const TOP = 16
const BOTTOM = 210

const kX = (k: number) => LEFT + ((k - 1) / (LAB_MOST_CHAINS - 1)) * (RIGHT - LEFT)
const shareY = (share: number) => BOTTOM - share * (BOTTOM - TOP)
const label = 'fill-zinc-faded font-mono text-[11px] uppercase tracking-widest'

// How often the vote is right as the chains per vote grow, for a chain right
// with chance p and wrong chains spread over a few wrong answers alike
export default function VoteLab() {
  const [p, setP] = useState(LAB_START.p)
  const [spread, setSpread] = useState<Spread>(LAB_START.spread)
  const [k, setK] = useState(LAB_START.k)

  const curve = voteCurve(p, spread)
  const exact = curve[k - 1]
  const sampled = labRun(p, spread, k)
  const points = curve.map((share, i) => `${kX(i + 1).toFixed(1)},${shareY(share).toFixed(1)}`).join(' ')
  const better = exact > p + 0.005
  const worse = exact < p - 0.005

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`A chain is right ${percent(p)} of the time, wrong chains spread over ${spread} ${spread === 1 ? 'answer' : 'answers'}: a vote of ${k} is right ${percent(exact)} of the time.`}
      >
        {[0, 0.5, 1].map((share) => (
          <g key={share}>
            <line x1={LEFT} x2={RIGHT} y1={shareY(share)} y2={shareY(share)} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
            <text x={LEFT - 8} y={shareY(share) + 4} textAnchor="end" className="fill-zinc-faded font-mono text-[11px]">
              {percent(share)}
            </text>
          </g>
        ))}
        {[1, 10, 20, 30, 40].map((n) => (
          <text key={n} x={kX(n)} y={BOTTOM + 18} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
            {n}
          </text>
        ))}
        <text x={RIGHT} y={BOTTOM + 36} textAnchor="end" className={label}>
          Chains per vote
        </text>

        {/* One chain, for comparison */}
        <line
          x1={LEFT}
          x2={RIGHT}
          y1={shareY(p)}
          y2={shareY(p)}
          className="stroke-ink"
          strokeOpacity={0.55}
          strokeDasharray="4 4"
        />
        <text x={RIGHT} y={shareY(p) + (p > 0.85 ? 16 : -6)} textAnchor="end" className={label}>
          One chain
        </text>

        <polyline points={points} fill="none" className="stroke-sage" strokeWidth={2.5} />
        <line x1={kX(k)} x2={kX(k)} y1={TOP} y2={BOTTOM} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
        <circle cx={kX(k)} cy={shareY(exact)} r={6} className="fill-sage" />
      </svg>
      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-4">
        <Readout label="One chain right" value={percent(p)} />
        <Readout label={`Vote of ${k} right`} value={percent(exact)} accent />
        <Readout label={`Sampled, ${LAB_PROBLEMS.toLocaleString('en-US')} problems`} value={percent(sampled)} />
      </div>
      <p className="mt-3 font-mono text-[0.875rem] text-zinc-faded">
        {better
          ? 'The vote beats one chain.'
          : worse
            ? `The vote is worse than one chain${p < (1 - p) / spread ? ': one wrong answer is more common than the right one' : ''}.`
            : 'The vote is no better than one chain.'}
      </p>
      <Controls>
        <Slider
          label="A chain is right"
          value={p}
          min={0.05}
          max={0.95}
          step={0.05}
          onChange={(value) => setP(Math.round(value * 100) / 100)}
          format={percent}
        />
        <Choice label="Wrong answers it spreads over" options={LAB_SPREADS} value={spread} onChange={setSpread} />
        <Slider label="Chains per vote" value={k} min={1} max={LAB_MOST_CHAINS} onChange={setK} />
      </Controls>
    </div>
  )
}
