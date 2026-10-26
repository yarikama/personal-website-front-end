import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { DotGrid, DotKey } from '../../components/explain/DotGrid'
import { usePrefersReducedMotion } from '../../hooks'
import { MS_PER_MINUTE, SLOW_MS } from './model'

// Narrow, so the table stays large on a phone
const WIDTH = 460
const HEIGHT = 300
const TABLE = { x: 230, y: 150, r: 44 }
const SEAT = 68
// Where each guest sets off from: an ellipse around the table
const FROM = { x: 190, y: 125 }
// Real milliseconds per minute of the evening
const PLAYBACK = 45
const LATE = SLOW_MS / MS_PER_MINUTE

// "7:05 PM", for `minutes` past seven
const clock = (minutes: number) => {
  const m = Math.floor(minutes)
  return `${7 + Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} PM`
}

// One dinner: every guest walks to the table, arriving `arrivals` minutes
// after seven, and dinner starts when the last one sits down. It plays as
// soon as it is shown; with reduced motion it shows the end.
export function OneDinner({ arrivals }: { arrivals: number[] }) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [minute, setMinute] = useState(reducedMotion ? Infinity : 0)
  const last = Math.max(...arrivals)

  useAnimationFrame((time) => {
    if (minute >= last) return
    started.current ??= time
    setMinute((time - started.current) / PLAYBACK)
  })

  const seated = minute >= last
  const waited = last > LATE
  const waiting = arrivals.filter((at) => at > minute).length

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.8rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">{clock(Math.min(minute, last))}</span>
        <span className={`text-right ${seated ? (waited ? 'text-ink' : 'text-sage') : 'text-zinc-faded'}`}>
          {seated
            ? waited
              ? `Dinner starts ${Math.round(last)} minutes late`
              : 'Everyone’s here. Dinner starts'
            : `Waiting for ${waiting} ${waiting === 1 ? 'friend' : 'friends'}…`}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto w-full max-w-[30rem]"
        role="img"
        aria-label="Friends walking to a dinner table"
      >
        <circle
          cx={TABLE.x}
          cy={TABLE.y}
          r={TABLE.r}
          className={seated ? (waited ? 'fill-ink/10 stroke-ink' : 'fill-sage/20 stroke-sage') : 'fill-paper stroke-zinc-400'}
          strokeWidth={1.5}
        />
        <text x={TABLE.x} y={TABLE.y + 4} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
          {seated ? 'Dinner' : 'Table'}
        </text>
        {arrivals.map((at, i) => {
          const angle = (i / arrivals.length) * Math.PI * 2 - Math.PI / 2
          const t = Math.min(1, minute / at)
          const x = TABLE.x + Math.cos(angle) * (FROM.x + (SEAT - FROM.x) * t)
          const y = TABLE.y + Math.sin(angle) * (FROM.y + (SEAT - FROM.y) * t)
          // A guest still on the way well after seven is the one everyone waits for
          const late = at > LATE && minute > 10
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={11} className={late ? 'fill-ink' : 'fill-sage'} />
              {late && t < 1 && (
                <text x={x} y={y - 18} textAnchor="middle" className="fill-ink font-mono text-[11px] uppercase tracking-widest">
                  Running late
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// A hundred dinners (or pages) at once, each a dot: light if it started on
// time, dark if it waited for someone
export function ManyDinners({ waited, unit }: { waited: boolean[]; unit: 'dinner' | 'page' }) {
  const count = waited.filter(Boolean).length
  const words =
    unit === 'dinner'
      ? { late: 'waited for someone', fine: 'started on time', what: 'dinners' }
      : { late: 'slow: waited on a slow server', fine: 'fast', what: 'pages' }
  return (
    <div>
      <p className="font-serif text-3xl font-light">
        <span className={count > 0 ? 'text-ink' : 'text-sage'}>{count}</span>
        <span className="text-zinc-faded">
          {' '}
          of {waited.length} {words.what} {unit === 'dinner' ? 'waited' : 'were slow'}
        </span>
      </p>
      <div className="mt-4">
        <DotGrid
          tones={waited.map((late) => (late ? 'bad' : 'fine'))}
          label={`${count} of ${waited.length} ${words.what} ${words.late}`}
          run={`${unit}-${waited.length}`}
        />
      </div>
      <DotKey
        items={[
          ['fine', words.fine],
          ['bad', words.late],
        ]}
      />
    </div>
  )
}
