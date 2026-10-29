import { useMemo } from 'react'
import { Readout } from '../../components/explain/figure'
import { usePlay } from '../../components/explain/useLoop'
import { KNOBS, SHARES, TRUTH, twoKnobs, type Aim, type Share } from './model'

const WIDTH = 480
const HEIGHT = 240
const LEFT = 40
const RIGHT = 470
const TOP = 16
const BOTTOM = 206
const LOW = -10
const HIGH = 40
// Milliseconds an update while it plays
const PACE = 8

const x = (update: number) => LEFT + (update / KNOBS.updates) * (RIGHT - LEFT)
const y = (minutes: number) => BOTTOM - ((minutes - LOW) / (HIGH - LOW)) * (BOTTOM - TOP)
const path = (values: number[]) => values.map((v, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')

// The two-knob rule learning from a notebook of drives: the pier's and the
// far shore's guesses update by update, against the true 10 and 6. Plays
// once; give it a `key` per setting.
export default function Knobs({ aim, share }: { aim: Aim; share: Share }) {
  const run = useMemo(() => twoKnobs(aim, SHARES[share]), [aim, share])
  const shown = Math.floor(usePlay(run.pier.length - 1, PACE))
  const pier = run.pier.slice(0, shown + 1)
  const shore = run.shore.slice(0, shown + 1)
  const blown = run.blewUp !== null && shown >= run.blewUp
  const clipId = `knobs-${aim}-${share}`.replace(/\W/g, '')
  const show = (value: number) => (Math.abs(value) >= 100 ? 'blew up' : value.toFixed(1))

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Guesses over ${KNOBS.updates} updates: ${
          run.blewUp !== null ? `they blow up after ${run.blewUp}` : `they settle at ${show(run.pier.at(-1)!)} and ${show(run.shore.at(-1)!)}`
        }`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={LEFT} y={TOP} width={RIGHT - LEFT} height={BOTTOM - TOP} />
          </clipPath>
        </defs>
        {[0, 10, 20, 30, 40].map((m) => (
          <g key={m}>
            <line x1={LEFT} x2={RIGHT} y1={y(m)} y2={y(m)} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={m === 0 ? 1 : 0.5} />
            <text x={LEFT - 6} y={y(m) + 4} textAnchor="end" className="fill-zinc-400 font-mono text-[10px]">
              {m}
            </text>
          </g>
        ))}
        {/* The true drives */}
        <line x1={LEFT} x2={RIGHT} y1={y(TRUTH.pier)} y2={y(TRUTH.pier)} className="stroke-sage" strokeDasharray="4 4" />
        <line x1={LEFT} x2={RIGHT} y1={y(TRUTH.shore)} y2={y(TRUTH.shore)} className="stroke-ink" strokeDasharray="4 4" strokeWidth={0.75} />
        {/* When the copy was refreshed */}
        {run.refreshes
          .filter((r) => r <= shown)
          .map((r) => (
            <line key={r} x1={x(r)} x2={x(r)} y1={BOTTOM} y2={BOTTOM + 6} className="stroke-sage" strokeWidth={1.5} />
          ))}
        <g clipPath={`url(#${clipId})`}>
          <path d={path(shore)} className="fill-none stroke-ink" strokeWidth={1.5} strokeLinejoin="round" />
          <path d={path(pier)} className="fill-none stroke-sage" strokeWidth={2.5} strokeLinejoin="round" />
        </g>
        {blown && (
          <text x={Math.min(x(run.blewUp!) + 6, RIGHT - 70)} y={TOP + 14} className="fill-ink font-mono text-[11px] uppercase tracking-widest">
            off the chart
          </text>
        )}
        <text x={LEFT} y={HEIGHT - 8} className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
          0 updates
        </text>
        <text x={RIGHT} y={HEIGHT - 8} textAnchor="end" className="fill-zinc-400 font-mono text-[10px] uppercase tracking-widest">
          {KNOBS.updates} updates
        </text>
        {aim === 'frozen' && (
          <text x={(LEFT + RIGHT) / 2} y={HEIGHT - 8} textAnchor="middle" className="fill-sage font-mono text-[10px] uppercase tracking-widest">
            ticks: copy refreshed
          </text>
        )}
      </svg>
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
        <Readout label="Pier (truly 10)" value={show(pier.at(-1)!)} accent />
        <Readout label="Far shore (truly 6)" value={show(shore.at(-1)!)} />
        <Readout label="Updates" value={blown ? run.blewUp! : shown} />
      </div>
    </div>
  )
}
