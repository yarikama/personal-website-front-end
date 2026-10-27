import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { lerp } from '../../components/explain/useLoop'
import { usePrefersReducedMotion } from '../../hooks'
import { DRIVE, nudge } from './model'

const WIDTH = 460
const HEIGHT = 250
const ROAD = 200
// Bars stand on this line, at this many pixels to the minute
const BASE = 178
const PER_MINUTE = 1.6
const HOME = 70
const JAM = 230
const AIRPORT = 400
const BAR = 36

const corrected = nudge(DRIVE.first, DRIVE.jam, DRIVE.step)

// The arrow from the later guess back to the earlier one, over the gap
// between the two bars
const FROM = { x: JAM - BAR / 2 - 6, y: BASE - DRIVE.jam * PER_MINUTE + 8 }
const TO = { x: HOME + BAR / 2 + 8, y: BASE - DRIVE.first * PER_MINUTE + 8 }
const ARC = `M ${FROM.x} ${FROM.y} C ${FROM.x - 50} ${FROM.y - 50}, ${TO.x + 40} ${TO.y - 50}, ${TO.x} ${TO.y}`

// From 0 to 1 over `ms` after it is first drawn; 1 at once with reduced motion
function useProgress(ms: number): number {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [progress, setProgress] = useState(0)
  useAnimationFrame((time) => {
    if (reducedMotion || progress >= 1) return
    started.current ??= time
    setProgress(Math.min(1, (time - started.current) / ms))
  })
  return reducedMotion ? 1 : progress
}

// Eased, so things settle rather than stop
const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3

function Bar({ x, minutes, label, tone }: { x: number; minutes: number; label: string; tone: 'sage' | 'ink' }) {
  const height = minutes * PER_MINUTE
  return (
    <g>
      <rect
        x={x - BAR / 2}
        y={BASE - height}
        width={BAR}
        height={height}
        className={tone === 'sage' ? 'fill-sage/80' : 'fill-ink/80'}
      />
      <text x={x} y={BASE - height - 8} textAnchor="middle" className="fill-ink font-mono text-[11px]">
        {label}
      </text>
    </g>
  )
}

// The drive to the airport, one step of the story at a time: the first
// guess, the jam and the guess it brings, then the first guess corrected
// halfway toward the second, then the same picture in the method's words.
// Give it a `key` per step so each plays from its start.
export function Drive({ step }: { step: number }) {
  const t = useProgress(step === 1 ? 2400 : 1400)
  const named = step === 4

  // Where the car is, and each guess, at this moment of this step
  const car = step === 0 ? HOME : step === 1 ? lerp(HOME, JAM, ease(t / 0.55)) : JAM
  const jammed = step >= 1 && (step > 1 || t > 0.5)
  const firstGuess = step === 3 ? lerp(DRIVE.first, corrected, ease((t - 0.3) / 0.7)) : step === 4 ? corrected : DRIVE.first
  const secondGuess = step === 1 ? DRIVE.jam * ease((t - 0.55) / 0.45) : step > 1 ? DRIVE.jam : 0
  const homeGrow = step === 0 ? ease(t) : 1

  const status = [
    'You guess the whole trip: 40 minutes',
    'Ten minutes in: a jam. Now 60',
    'The jam says the first guess was low',
    'Move it halfway: 40 → 50',
    'Each guess is a value; the next one corrects it',
  ][step]

  return (
    <div>
      <p className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">{status}</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto mt-2 w-full max-w-[30rem]" role="img" aria-label={status}>
        {/* The road, and where you are on it */}
        <line x1={30} y1={ROAD} x2={430} y2={ROAD} className="stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={10} />
        <line x1={30} y1={ROAD} x2={430} y2={ROAD} className="stroke-paper" strokeWidth={1.5} strokeDasharray="8 8" />
        {[
          [HOME, named ? 'now: s' : 'Home'],
          [JAM, named ? 'next: s′' : '10 min in'],
          [AIRPORT, named ? 'the end' : 'Airport'],
        ].map(([x, label]) => (
          <text
            key={label}
            x={x}
            y={ROAD + 30}
            textAnchor="middle"
            className={`font-mono text-[11px] uppercase tracking-widest ${named ? 'fill-sage' : 'fill-zinc-400'}`}
          >
            {label}
          </text>
        ))}

        {/* The jam ahead */}
        {jammed &&
          [262, 296, 330].map((x) => (
            <rect key={x} x={x} y={ROAD - 6} width={24} height={12} rx={3} className="fill-zinc-400" />
          ))}
        {/* Your car */}
        <rect x={car - 14} y={ROAD - 7} width={28} height={14} rx={3} className="fill-ink" />

        {/* Your guesses for the whole trip, where you made them */}
        <Bar
          x={HOME}
          minutes={firstGuess * homeGrow}
          label={named ? 'V(s)' : `${Math.round(firstGuess)} min`}
          tone="ink"
        />
        {secondGuess > 0 && (
          <Bar x={JAM} minutes={secondGuess} label={named ? 'V(s′)' : `${Math.round(secondGuess)} min`} tone="sage" />
        )}

        {/* The later guess pulls the earlier one toward it */}
        {step >= 2 && (
          <g className="stroke-sage fill-none" strokeWidth={2}>
            <path
              d={ARC}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={step === 2 ? 1 - ease(t) : 0}
            />
            <path
              d={`M ${TO.x + 1} ${TO.y - 11} L ${TO.x} ${TO.y} L ${TO.x + 10} ${TO.y - 4}`}
              opacity={step === 2 ? ease((t - 0.8) / 0.2) : 1}
            />
          </g>
        )}
        {step === 3 && (
          <line
            x1={HOME - BAR / 2 - 6}
            x2={HOME + BAR / 2 + 6}
            y1={BASE - DRIVE.jam * PER_MINUTE}
            y2={BASE - DRIVE.jam * PER_MINUTE}
            className="stroke-sage"
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
        )}
      </svg>
    </div>
  )
}
