import { useState } from 'react'
import { Choice, Controls, Readout } from '../../components/explain/figure'
import {
  ALL_PROMPTS,
  blankHappy,
  lean,
  pct,
  promptName,
  REVIEWS,
  rightAfter,
  rightBefore,
  type Label,
  type Prompt,
} from './model'
import Sorting, { SortingKey } from './Sorting'

const LABELS: readonly Label[] = ['P', 'N']
const SAY: Record<Label, string> = { P: 'Pos', N: 'Neg' }
const SWITCH = ['Off', 'On'] as const
const ORDINAL = ['1st', '2nd', '3rd', '4th, last']

// Pick the four demonstrations' labels, and calibration on or off. Below,
// every one of the 16 prompts, from the one leaning most Negative to the one
// leaning most Positive: how many reviews it sorts right without and with
// calibration.
export default function Lab() {
  const [prompt, setPrompt] = useState<Prompt>(['N', 'N', 'P', 'P'])
  const [calibrated, setCalibrated] = useState<(typeof SWITCH)[number]>('Off')
  const on = calibrated === 'On'
  const set = (i: number, l: Label) => setPrompt(prompt.map((x, j) => (j === i ? l : x)) as unknown as Prompt)
  const shift = on ? 0 : lean(prompt)

  return (
    <div>
      <Sorting
        prompt={prompt}
        shift={shift}
        blank={1}
        blankChance={blankHappy(prompt)}
        named
        description={`Demonstrations ${promptName(prompt)}, calibration ${calibrated.toLowerCase()}: ${on ? rightAfter(prompt) : rightBefore(prompt)} of 12 test reviews on the right side.`}
      />
      <SortingKey named />
      <Controls>
        {prompt.map((l, i) => (
          <Choice key={i} label={ORDINAL[i]} options={LABELS} value={l} onChange={(x) => set(i, x)} format={(x) => SAY[x]} />
        ))}
        <Choice label="Calibration" options={SWITCH} value={calibrated} onChange={setCalibrated} />
      </Controls>
      <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
        <Readout label="N/A scores" value={`${pct(blankHappy(prompt))} Pos`} />
        <Readout label="Right, as is" value={`${rightBefore(prompt)} / ${REVIEWS.length}`} />
        <Readout label="Right, calibrated" value={`${rightAfter(prompt)} / ${REVIEWS.length}`} accent />
      </div>
      <AllPrompts chosen={prompt} />
    </div>
  )
}

const W = 600
const H = 176
const L = 64
const R = 584
const TOP = 22
const BOTTOM = 124
const FEWEST = 6
const MOST = 12
const y = (n: number) => BOTTOM - ((n - FEWEST) / (MOST - FEWEST)) * (BOTTOM - TOP)
const x = (i: number) => L + ((i + 0.5) / ALL_PROMPTS.length) * (R - L)
const small = 'fill-zinc-faded font-mono text-[10px] uppercase tracking-widest'

function AllPrompts({ chosen }: { chosen: Prompt }) {
  const at = ALL_PROMPTS.findIndex((p) => promptName(p) === promptName(chosen))
  const column = (R - L) / ALL_PROMPTS.length
  return (
    <div className="mt-8">
      <p className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">All 16 prompts</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full"
        role="img"
        aria-label={`Reviews sorted right for each of the 16 prompts, ordered by lean: between ${Math.min(...ALL_PROMPTS.map(rightBefore))} and ${Math.max(...ALL_PROMPTS.map(rightBefore))} as is, ${rightAfter(chosen)} for every one once calibrated.`}
      >
        <rect x={L + at * column + 2} y={TOP - 14} width={column - 4} height={BOTTOM - TOP + 28} rx={8} className="fill-ink" fillOpacity={0.07} />
        {[6, 9, 12].map((n) => (
          <g key={n}>
            <line x1={L} x2={R} y1={y(n)} y2={y(n)} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
            <text x={L - 10} y={y(n) + 4} textAnchor="end" className="fill-zinc-faded font-mono text-[10px]">
              {n}/12
            </text>
          </g>
        ))}
        {ALL_PROMPTS.map((p, i) => (
          <g key={promptName(p)}>
            <title>{`${promptName(p)}: ${rightBefore(p)} as is, ${rightAfter(p)} calibrated`}</title>
            <circle cx={x(i)} cy={y(rightAfter(p))} r={8} className="fill-none stroke-sage" strokeWidth={2.5} />
            <circle cx={x(i)} cy={y(rightBefore(p))} r={4.5} className="fill-ink" />
          </g>
        ))}
        <text x={x(at)} y={BOTTOM + 30} textAnchor="middle" className="fill-ink font-mono text-[11px] uppercase tracking-widest">
          {promptName(chosen)}
        </text>
        <text x={L} y={H - 4} className={small}>
          ← leans Negative
        </text>
        <text x={R} y={H - 4} textAnchor="end" className={small}>
          leans Positive →
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">
        <span className="inline-flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <circle cx="7" cy="7" r="4.5" className="fill-ink" />
          </svg>
          As is
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <circle cx="9" cy="9" r="7" className="fill-none stroke-sage" strokeWidth={2.5} />
          </svg>
          Calibrated
        </span>
      </div>
    </div>
  )
}
