import { useMemo, useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { CHARGER, chargeFirstRun, COLUMNS, FULL, grabRun, ROWS, type Frame, type Tile } from './model'

const TILE = 50
const PAD = 14
const WIDTH = COLUMNS * TILE + PAD * 2
const HEIGHT = ROWS * TILE + PAD * 2
// Real milliseconds per frame of a run: slow while there is little to
// see, quicker across the whole room
const PACE = { grab: 520, charge: 150 }

export type Run = keyof typeof PACE

const RUNS: Record<Run, () => Frame[]> = { grab: grabRun, charge: chargeFirstRun }

const centre = ({ x, y }: Tile) => ({ cx: PAD + x * TILE + TILE / 2, cy: PAD + y * TILE + TILE / 2 })

// Where the robot is at `t`, a fractional frame: between two tiles mid-move
function place(frames: Frame[], t: number) {
  const a = centre(frames[Math.floor(t)].at)
  const b = centre(frames[Math.min(frames.length - 1, Math.ceil(t))].at)
  const f = t - Math.floor(t)
  return { cx: a.cx + (b.cx - a.cx) * f, cy: a.cy + (b.cy - a.cy) * f }
}

// A robot vacuum in a room, seen from above: the dirt, the charger on the
// left wall, the robot and the trail it leaves. It plays `run` from frame
// `from` to frame `to` as soon as it is shown; with reduced motion it shows
// `to`. `explain` labels a speck as a reward and the charger as value.
export default function Room({ run, from, to, explain = false }: { run: Run; from: number; to: number; explain?: boolean }) {
  const frames = useMemo(() => RUNS[run](), [run])
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [t, setT] = useState(reducedMotion ? to : from)

  useAnimationFrame((time) => {
    if (t >= to) return
    started.current ??= time
    setT(Math.min(to, from + (time - started.current) / PACE[run]))
  })

  const frame = frames[Math.floor(t)]
  const robot = place(frames, t)
  const dead = frame.battery === 0 && Math.floor(t) === frames.length - 1
  const charging = frame.at.x === CHARGER.x && frame.at.y === CHARGER.y && !frame.moved
  const battery = frame.battery / FULL
  const trail = frames
    .slice(0, Math.floor(t) + 1)
    .filter((f) => f.moved || f === frames[0])
    .map((f) => centre(f.at))
  const charger = centre(CHARGER)

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.8rem] uppercase tracking-widest">
        <span className="text-zinc-faded">
          Score <span className="font-serif text-2xl normal-case tracking-normal text-ink lining-nums tabular-nums">{frame.score}</span>
        </span>
        <span className="flex items-center gap-2 text-zinc-faded">
          {dead ? <span className="text-ink">Battery dead</span> : charging ? <span className="text-sage">Charging</span> : 'Battery'}
          <span className="relative inline-block h-3 w-16 border border-zinc-400" aria-hidden>
            <span
              className={`absolute inset-y-0 left-0 ${battery < 0.1 ? 'bg-ink' : 'bg-sage'}`}
              style={{ width: `${battery * 100}%` }}
            />
          </span>
          <span className="w-10 text-right tabular-nums text-ink">{Math.round(battery * 100)}%</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`A robot vacuum in a room with ${frame.dirt.length} specks of dirt left; score ${frame.score}`}
      >
        <rect x={PAD} y={PAD} width={COLUMNS * TILE} height={ROWS * TILE} className="fill-paper stroke-zinc-300 dark:stroke-zinc-200/25" strokeWidth={1.5} />
        {Array.from({ length: COLUMNS - 1 }, (_, i) => (
          <line
            key={`c${i}`}
            x1={PAD + (i + 1) * TILE}
            x2={PAD + (i + 1) * TILE}
            y1={PAD}
            y2={PAD + ROWS * TILE}
            className="stroke-zinc-200 dark:stroke-zinc-200/10"
          />
        ))}
        {Array.from({ length: ROWS - 1 }, (_, i) => (
          <line
            key={`r${i}`}
            y1={PAD + (i + 1) * TILE}
            y2={PAD + (i + 1) * TILE}
            x1={PAD}
            x2={PAD + COLUMNS * TILE}
            className="stroke-zinc-200 dark:stroke-zinc-200/10"
          />
        ))}

        {/* The charger, against the left wall */}
        <rect x={PAD - 6} y={charger.cy - 16} width={14} height={32} rx={2} className="fill-sage" />
        <path
          d={`M ${PAD + 2} ${charger.cy - 9} l -5 10 h 5 l -2 8 l 6 -11 h -5 z`}
          className="fill-paper"
        />

        {/* The trail so far */}
        {trail.length > 1 && (
          <polyline
            points={[...trail, robot].map((p) => `${p.cx},${p.cy}`).join(' ')}
            fill="none"
            className="stroke-sage/40"
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Each speck: a little cluster of dots */}
        {frame.dirt.map((tile) => {
          const { cx, cy } = centre(tile)
          return (
            <g key={`${tile.x},${tile.y}`} className="fill-ink/70">
              <circle cx={cx - 5} cy={cy - 2} r={3} />
              <circle cx={cx + 4} cy={cy - 5} r={2.2} />
              <circle cx={cx + 2} cy={cy + 5} r={2.6} />
            </g>
          )
        })}

        {/* The robot: a disc with a bumper, dark once its battery is dead */}
        <g transform={`translate(${robot.cx} ${robot.cy})`}>
          <circle r={17} className={dead ? 'fill-ink' : 'fill-sage'} />
          <path d="M -12 -9 A 15 15 0 0 1 12 -9" fill="none" className="stroke-paper" strokeWidth={2.5} strokeLinecap="round" />
          <circle r={3} className="fill-paper" />
        </g>

        {explain && (
          <g className="font-mono text-[11px] uppercase tracking-widest">
            <Callout at={centre({ x: 6, y: 2 })} dy={-1} text="+1: a reward, good now" tone="ink" />
            <Callout at={charger} dy={1} dx={24} text="Charged here: worth 20 to come" tone="sage" />
          </g>
        )}
      </svg>
    </div>
  )
}

// A label with a short line to what it names
function Callout({
  at,
  text,
  tone,
  dy,
  dx = 0,
}: {
  at: { cx: number; cy: number }
  text: string
  tone: 'ink' | 'sage'
  dy: 1 | -1
  dx?: number
}) {
  const y = at.cy + dy * 46
  const anchor = dx > 0 ? 'start' : 'middle'
  const x = at.cx + dx
  const width = text.length * 7.6 + 14
  const left = anchor === 'start' ? x - 7 : x - width / 2
  return (
    <g>
      <line x1={at.cx} y1={at.cy + dy * 18} x2={x} y2={y - dy * 10} className={tone === 'ink' ? 'stroke-ink' : 'stroke-sage'} />
      <rect x={left} y={y - 10} width={width} height={20} className={`fill-paper ${tone === 'ink' ? 'stroke-ink' : 'stroke-sage'}`} />
      <text x={anchor === 'start' ? x : x} y={y + 4} textAnchor={anchor} className={tone === 'ink' ? 'fill-ink' : 'fill-sage'}>
        {text}
      </text>
    </g>
  )
}
