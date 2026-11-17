import { useEffect, useState } from 'react'
import { Button, Choice, Controls, Readout, Slider } from '../../components/explain/figure'
import { lerp, usePlay } from '../../components/explain/useLoop'
import { frameAt } from './frames'
import { final, INITS, LAB, LAB_K, labRun, RESTARTS, restarts, rounds, type Init, type State } from './model'
import Scatter from './Scatter'

// Real milliseconds a half-round takes, stepping or running
const TWEEN = 380
const PACE = 450

// The lab's crowds: pick k and how to start, then step or run Lloyd's
// algorithm, and see where this run ends among a hundred of each kind
export default function Lab() {
  const [k, setK] = useState(LAB_K.start)
  const [init, setInit] = useState<Init>('Random')
  const [seed, setSeed] = useState(1)
  const [half, setHalf] = useState(0)
  const [running, setRunning] = useState(false)

  const trace = labRun(k, init, seed)
  const last = trace.length - 1
  // A setting changed since `half` was set: never past the end
  const at = Math.min(half, last)
  const playing = running && at < last

  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => setHalf((h) => h + 1), PACE)
    return () => clearInterval(timer)
  }, [playing])

  const restart = (change: () => void) => {
    change()
    setHalf(0)
    setRunning(false)
  }

  const done = at >= last
  const many = restarts(k)

  return (
    <div>
      <Moving key={`${k} ${init} ${seed} ${at}`} trace={trace} at={at} />
      <Controls>
        <Slider label="k, centres" value={k} min={LAB_K.low} max={LAB_K.high} onChange={(n) => restart(() => setK(n))} />
        <Choice label="Start" options={INITS} value={init} onChange={(i) => restart(() => setInit(i))} />
      </Controls>
      <Controls>
        <Button onClick={() => setHalf(at + 1)} disabled={done || playing}>
          Half a round
        </Button>
        <Button onClick={() => setRunning(true)} disabled={done || playing}>
          Run
        </Button>
        <Button onClick={() => restart(() => setSeed((s) => (s % RESTARTS) + 1))}>New start</Button>
      </Controls>
      <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
        <Readout label="Round" value={Math.ceil(at / 2)} />
        <Readout label="Objective" value={trace[at].cost === null ? '—' : trace[at].cost!.toFixed(1)} accent />
        <Readout label={`Best of ${2 * RESTARTS} runs`} value={many.best.toFixed(1)} />
      </div>
      <Restarts k={k} init={init} ended={done ? final(trace) : null} />
    </div>
  )
}

// The drawing, sliding from the half-round before `at` to `at`
function Moving({ trace, at }: { trace: State[]; at: number }) {
  const played = usePlay(1, TWEEN)
  const t = at === 0 ? 0 : lerp(at - 1, at, played)
  const frame = frameAt(LAB, trace, t)
  const said =
    at === 0
      ? 'Starting centres'
      : at === trace.length - 1
        ? `Round ${rounds(trace)} · converged`
        : `Round ${frame.round} · ${frame.phase === 'assign' ? 'assign to the nearest centre' : 'move centres to the means'}`
  return (
    <div>
      <p className="min-h-[1.5rem] font-mono text-[0.875rem] uppercase tracking-widest text-sage-ink">{said}</p>
      <Scatter
        points={LAB}
        frame={frame}
        label={`${LAB.length} points in five crowds and ${trace[0].centres.length} centres: ${said}`}
      />
    </div>
  )
}

const H_WIDTH = 560
const H_LEFT = 20
const H_RIGHT = 540
const ROW = 72
const BAR = 40
const BINS = 28

// A hundred runs from each kind of start: how many ended at each objective
function Restarts({ k, init, ended }: { k: number; init: Init; ended: number | null }) {
  const { finals, best, reached } = restarts(k)
  const high = Math.max(...INITS.flatMap((i) => finals[i]))
  const low = best
  const span = Math.max(1e-9, high - low)
  const bin = (f: number) => Math.min(BINS - 1, Math.floor(((f - low) / span) * BINS))
  const x = (f: number) => H_LEFT + ((f - low) / span) * (H_RIGHT - H_LEFT)
  const width = (H_RIGHT - H_LEFT) / BINS
  const counts = INITS.map((i) => {
    const c = Array.from({ length: BINS }, () => 0)
    for (const f of finals[i]) c[bin(f)] += 1
    return c
  })
  const most = Math.max(...counts.flat())
  // By the square root, so a single run still shows beside the many at the best
  const tall = (c: number) => Math.max(3, Math.sqrt(c / most) * BAR)
  const top = 26
  const height = top + INITS.length * ROW + 34

  return (
    <svg
      viewBox={`0 0 ${H_WIDTH} ${height}`}
      className="mt-8 w-full"
      role="img"
      aria-label={`Final objectives of ${RESTARTS} runs from each start at k = ${k}: random starts reached the best, ${best.toFixed(1)}, ${reached.Random} times; k-means++ ${reached['k-means++']} times`}
    >
      <text x={H_LEFT} y={12} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
        {RESTARTS} restarts each · where they ended
      </text>
      {INITS.map((name, row) => {
        const base = top + (row + 1) * ROW
        const sage = name === 'k-means++'
        return (
          <g key={name}>
            <text x={H_RIGHT} y={base - BAR - 8} textAnchor="end" className="fill-ink font-mono text-[12px]">
              {name}: {reached[name]} of {RESTARTS} at the best
            </text>
            <line x1={H_LEFT} x2={H_RIGHT} y1={base} y2={base} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
            {counts[row].map((c, b) =>
              c === 0 ? null : (
                <rect
                  key={b}
                  x={H_LEFT + b * width + 1}
                  y={base - tall(c)}
                  width={width - 2}
                  height={tall(c)}
                  rx={1.5}
                  className={sage ? 'fill-sage' : 'fill-ink'}
                />
              )
            )}
            {ended !== null && name === init && (
              <g>
                <path d={`M${x(ended)},${base + 3} l-6,9 h12 z`} className="fill-sage-ink" />
              </g>
            )}
          </g>
        )
      })}
      <g className="fill-zinc-faded font-mono text-[11px]">
        <text x={H_LEFT} y={height - 6}>
          {low.toFixed(0)} · the best
        </text>
        <text x={H_RIGHT} y={height - 6} textAnchor="end">
          worse · {high.toFixed(0)}
        </text>
      </g>
    </svg>
  )
}
