import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { Button, Controls, Readout, Slider } from '../../components/explain/figure'
import { LAB, labCrate, norm, scale, unit, weightsAfter, wrongCount, type Summary, type Vec } from './model'
import { Arrow, Key, Look, Plane } from './Plane'
import { screen, sx } from './planeScale'

// Real milliseconds per mistake, played
const PACE = 260

// Each gap's crate and run, worked out once
const crates = new Map<string, Summary>()
function crateAt(gap: number) {
  const key = gap.toFixed(2)
  let found = crates.get(key)
  if (!found) {
    found = labCrate(Number(key))
    crates.set(key, found)
  }
  return found
}

const gapSays = (gap: number) => (gap < -0.001 ? `overlap ${(-gap).toFixed(2)}` : gap.toFixed(2))
const count = (value: number) => Math.round(value).toLocaleString('en-US')

// A hundred points with a gap to set, and the perceptron run on them one
// mistake at a time: the line turning at each, the count of mistakes
// against the most there can be, (R/γ)²
export default function Lab() {
  const [gap, setGap] = useState<number>(LAB.start)
  const [k, setK] = useState(0)
  const [playing, setPlaying] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const lastTick = useRef<number | null>(null)

  const crate = crateAt(gap)
  const { data, run, r, gamma, angle, bound } = crate
  const total = run.mistakes.length
  const shown = Math.min(k, total)
  const finished = shown === total
  const w: Vec | null = shown === 0 ? null : weightsAfter(run, shown)
  const last = shown > 0 ? run.mistakes[shown - 1] : null

  useAnimationFrame((time) => {
    if (!playing) {
      lastTick.current = null
      return
    }
    lastTick.current ??= time
    if (time - lastTick.current < PACE) return
    lastTick.current = time
    if (shown + 1 >= total) setPlaying(false)
    setK(Math.min(total, shown + 1))
  })

  const choose = (to: number) => {
    setGap(to)
    setK(0)
    setPlaying(false)
  }
  const play = () => {
    if (reducedMotion) {
      setK(total)
      return
    }
    if (finished) setK(0)
    setPlaying(!playing)
  }

  // The widest gap's two edges, and the circle of radius R
  const normal = unit(angle)
  const along: Vec = [-normal[1] * 3, normal[0] * 3]
  const edge = (side: number) => {
    const at = scale(normal, side * gamma)
    return { from: screen([at[0] + along[0], at[1] + along[1]]), to: screen([at[0] - along[0], at[1] - along[1]]) }
  }
  const [mx, my] = screen([0, 0])
  const rx = sx(r) - mx
  // Where the labels go: R on the circle, up and to the right where it is
  // empty; 2γ in the middle of the strip, near its far end
  const tag = screen(scale(unit(0.2 * Math.PI), r))
  const strip = screen(scale(along, -0.4))

  const status = finished
    ? run.settled
      ? `Settled: round ${run.passes} went by with no mistake, so the line never moves again.`
      : `Still turning after ${count(run.passes)} rounds: no line through the middle splits these points.`
    : last
      ? `Mistake ${shown} came in round ${last.pass + 1}, on point ${last.at + 1}.`
      : 'No rule yet: the first point it looks at is a mistake.'

  return (
    <div>
      <div className="select-none">
        <Plane
          data={data}
          w={w}
          rings
          label={`${data.length} points; R ${r.toFixed(2)}, gap γ ${gamma > 0 ? gamma.toFixed(2) : 'none'}. After ${shown} mistakes the line calls ${w ? wrongCount(data, w) : data.length} points wrong.`}
          under={
            <g>
              <circle cx={mx} cy={my} r={rx} className="fill-none stroke-zinc-400" strokeDasharray="3 5" />
              <text x={tag[0] + 6} y={tag[1] - 6} className="fill-ink font-mono text-[12px]">
                R
              </text>
              {gamma > 0 &&
                [1, -1].map((side) => {
                  const { from, to } = edge(side)
                  return (
                    <line
                      key={side}
                      x1={from[0]}
                      y1={from[1]}
                      x2={to[0]}
                      y2={to[1]}
                      className="stroke-zinc-400"
                      strokeDasharray="6 4"
                    />
                  )
                })}
            </g>
          }
        >
          {last && <Look at={data[last.at].x} wrong />}
          {w && <Arrow from={[0, 0]} to={scale(w, 0.7 / norm(w))} tone="sage" />}
          {gamma > 0.08 && (
            <text x={strip[0]} y={strip[1]} textAnchor="middle" dy={4} className="fill-ink font-mono text-[12px]">
              2γ
            </text>
          )}
        </Plane>
        <Key named />
      </div>
      <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
        <Readout label="Mistakes" value={count(shown)} accent />
        <Readout label="At most (R/γ)²" value={Number.isFinite(bound) ? count(Math.floor(bound)) : 'no limit'} />
        <Readout label="Called wrong now" value={w ? wrongCount(data, w) : data.length} />
      </div>
      <p className="mt-4 min-h-[3rem] text-sm leading-relaxed text-zinc-faded">
        R {r.toFixed(2)} · γ {gamma > 0 ? gamma.toFixed(3) : 'none'}. {status}
      </p>
      <Controls>
        <Slider label="Gap" value={gap} min={LAB.gaps[0]} max={LAB.gaps[1]} step={LAB.step} onChange={choose} format={gapSays} />
      </Controls>
      <Controls>
        <Button onClick={() => setK(Math.min(total, shown + 1))} disabled={finished || playing}>
          Next mistake
        </Button>
        <Button onClick={play}>{playing ? 'Pause' : finished ? 'Play again' : 'Play'}</Button>
        <Button
          onClick={() => {
            setK(total)
            setPlaying(false)
          }}
          disabled={finished}
        >
          To the end
        </Button>
        <Button
          onClick={() => {
            setK(0)
            setPlaying(false)
          }}
          disabled={shown === 0}
        >
          Reset
        </Button>
      </Controls>
    </div>
  )
}
