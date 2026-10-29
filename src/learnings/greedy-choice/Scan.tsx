import { useEffect, useRef, useState } from 'react'
import { Code } from '../../components/explain/Code'
import { Button } from '../../components/explain/figure'
import { usePrefersReducedMotion } from '../../hooks'
import { byEnd, clock, scan, TEMPLATE, type Meeting, type ScanStep } from './model'

const WIDTH = 480
const LEFT = 30
const RIGHT = 470
const TOP = 26
const ROW = 22
const BAR = 13
// Real ms a line
const PACE = 1100

// What the line being run is doing, in words
function saying(step: ScanStep, day: Meeting[], order: number[]): string {
  const m = step.at === null ? null : day[order[step.at]]
  const span = m ? `${clock(m.start)}–${clock(m.end)}` : ''
  switch (step.line) {
    case 1:
      return `${day.length} requests, in the order they came in.`
    case 2:
      return 'Sort them by when they end.'
    case 3:
      return 'Nothing picked yet, and the room is free from the start.'
    case 4:
      return `Next in the list: ${span}.`
    case 5:
      return step.fits
        ? `It starts at ${clock(m!.start)}, and the room is free from ${clock(step.lastEnd)}: it fits.`
        : `It starts at ${clock(m!.start)}, but the room is busy until ${clock(step.lastEnd)}: skip it.`
    case 6:
      return `Pick ${span}.`
    case 7:
      return `The room is busy until ${clock(step.lastEnd)} now.`
    default:
      return `Done: ${step.picked.length} picked, in one pass.`
  }
}

// The template running on a day of requests, one line at a time: the
// requests on top, sorted by end once line 2 runs, and the code underneath
// with the running line lit. It starts playing when it comes into view;
// with reduced motion it starts at the end, to step through by hand.
export default function Scan({ day }: { day: Meeting[] }) {
  const reducedMotion = usePrefersReducedMotion()
  const steps = scan(day)
  const order = byEnd(day)
  const last = steps.length - 1
  const [at, setAt] = useState(reducedMotion ? last : 0)
  const [playing, setPlaying] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  // Play the first time it is mostly on screen
  useEffect(() => {
    const element = root.current
    if (!element || reducedMotion) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        setPlaying(true)
      },
      { threshold: 0.5 }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [reducedMotion])

  useEffect(() => {
    if (!playing) return
    if (at >= last) {
      setPlaying(false)
      return
    }
    const timer = setTimeout(() => setAt((a) => Math.min(last, a + 1)), PACE)
    return () => clearTimeout(timer)
  }, [playing, at, last])

  const step = steps[at]
  const from = Math.floor(Math.min(...day.map((m) => m.start)))
  const to = Math.ceil(Math.max(...day.map((m) => m.end)))
  const x = (hours: number) => LEFT + ((hours - from) / (to - from)) * (RIGHT - LEFT)
  const height = TOP + day.length * ROW + 22
  // Where meeting i sits: as it came in, then by end
  const rowOf = (i: number) => (step.sorted ? order.indexOf(i) : i)
  const freeAt = Number.isFinite(step.lastEnd) ? x(step.lastEnd) : LEFT - 12

  return (
    <div ref={root}>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.8rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">
          Picked <span className="text-ink tabular-nums">{step.picked.length}</span>
        </span>
        <span className="text-right text-zinc-faded">
          last_end <span className="text-sage tabular-nums">{clock(step.lastEnd)}</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="mt-3 w-full" role="img" aria-label={`The ${day.length} requests the code runs on`}>
        {Array.from({ length: to - from + 1 }, (_, k) => from + k).map((h) => (
          <g key={h}>
            <line x1={x(h)} x2={x(h)} y1={TOP - 6} y2={height - 18} className="stroke-zinc-200 dark:stroke-zinc-200/10" />
            <text x={x(h)} y={height - 4} textAnchor="middle" className="fill-zinc-400 font-mono text-[10px]">
              {((h + 11) % 12) + 1}
            </text>
          </g>
        ))}

        {/* When the room is free again */}
        {step.line >= 3 && (
          <g style={{ transform: `translateX(${freeAt}px)`, transition: 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <line y1={TOP - 8} y2={height - 18} className="stroke-sage" strokeWidth={1.5} strokeDasharray="4 3" />
            <text y={TOP - 12} textAnchor="middle" className="fill-sage font-mono text-[10px]">
              last_end
            </text>
          </g>
        )}

        {day.map((m, i) => {
          const k = order.indexOf(i)
          const here = step.sorted && step.at === k
          const picked = step.sorted && step.picked.includes(k)
          const skipped = step.sorted && step.skipped.includes(k)
          const y = TOP + rowOf(i) * ROW
          const tone = picked
            ? 'fill-sage stroke-sage'
            : skipped
              ? 'fill-ink/5 stroke-ink/40 dark:stroke-ink/30'
              : here
                ? 'fill-sage/20 stroke-sage'
                : 'fill-paper stroke-zinc-400'
          return (
            <g key={i} style={{ transform: `translateY(${y}px)`, transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
              {here && <path d={`M ${LEFT - 22} ${BAR / 2 - 5} l 8 5 l -8 5 z`} className="fill-sage" />}
              <rect x={x(m.start)} y={0} width={x(m.end) - x(m.start)} height={BAR} rx={2} className={`${tone} transition-colors`} strokeWidth={here ? 2 : 1.2} />
              {skipped && <line x1={x(m.start) + 4} x2={x(m.end) - 4} y1={BAR / 2} y2={BAR / 2} className="stroke-ink/50" />}
              {here && step.line === 5 && (
                <line x1={x(m.start)} x2={x(m.start)} y1={-4} y2={BAR + 4} className={step.fits ? 'stroke-sage' : 'stroke-ink'} strokeWidth={2.5} />
              )}
            </g>
          )
        })}
      </svg>

      <p className="mt-3 min-h-[3rem] font-serif text-xl font-light leading-snug" aria-live="polite">
        {saying(step, day, order)}
      </p>

      <div className="mt-3">
        <Code code={TEMPLATE} highlight={[step.line]} label="The template, in Python" />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          onClick={() => {
            if (at >= last) setAt(0)
            setPlaying((p) => !p || at >= last)
          }}
        >
          {playing ? 'Pause' : at >= last ? 'Replay' : 'Play'}
        </Button>
        <Button
          onClick={() => {
            setPlaying(false)
            setAt((a) => Math.min(last, a + 1))
          }}
          disabled={at >= last}
        >
          Step
        </Button>
        <Button
          onClick={() => {
            setPlaying(false)
            setAt(0)
          }}
          disabled={at === 0}
        >
          Start over
        </Button>
      </div>
    </div>
  )
}
