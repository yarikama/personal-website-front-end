import type { ReactNode } from 'react'
import { seeded } from '../../components/explain/random'
import { lerp, usePlay } from '../../components/explain/useLoop'
import { sample, START, taste, type Evening, type Habit } from './model'

const WIDTH = 560
const HEIGHT = 372
const LEFT = 30
const RIGHT = 530
// The amounts, along the axis, and the habit and the taste above it
const AXIS = 206
const BELL = 112
const TASTE = 150
// The spread, evening by evening, in a strip underneath
const STRIP = [294, 342]

const x = (pinches: number) => LEFT + (Math.max(-0.4, Math.min(10.4, pinches)) / 10) * (RIGHT - LEFT)
const tasteY = (rating: number) => AXIS - (rating / 10) * TASTE
const bellY = (pinches: number, { centre, spread }: Habit) => AXIS - BELL * Math.exp(-0.5 * ((pinches - centre) / spread) ** 2)
const TASTE_PATH = Array.from({ length: 201 }, (_, i) => {
  const p = i / 20
  return `${i ? 'L' : 'M'}${x(p).toFixed(1)},${tasteY(taste(p)).toFixed(1)}`
}).join(' ')

function bellPath(habit: Habit) {
  const low = Math.max(-0.4, habit.centre - 4 * habit.spread)
  const high = Math.min(10.4, habit.centre + 4 * habit.spread)
  const points = Array.from({ length: 121 }, (_, i) => {
    const p = low + ((high - low) * i) / 120
    return `L${x(p).toFixed(1)},${bellY(p, habit).toFixed(1)}`
  })
  return `M${x(low).toFixed(1)},${AXIS} ${points.join(' ')} L${x(high).toFixed(1)},${AXIS} Z`
}

// A habit partway from one to another: the centre in a line, the spread
// by its log, as it learns
const between = (a: Habit, b: Habit, k: number): Habit => ({
  centre: lerp(a.centre, b.centre, k),
  spread: Math.exp(lerp(Math.log(a.spread), Math.log(b.spread), k)),
})

// What the habit looks like before any learning: a few evenings drawn from it
const SHOWN = (() => {
  const random = seeded(21)
  return Array.from({ length: 14 }, () => sample(START, random))
})()

// Drop the try by this share of an evening, rate it, then learn
const DROPPED = 0.32
const LEARNING = [0.55, 0.85]
// Faster than this an evening, and only the habit and the latest tries show
const QUICK = 300
const RECENT = 30

const one = (value: number) => value.toFixed(1)
const kind = (surprise: number) => (surprise > 0.05 ? 'better' : surprise < -0.05 ? 'worse' : 'same')

export type Show = 'any' | 'habit' | 'evenings'

// The story's soup: the habit's bell curve over how much salt, the tries it
// draws, and the spread evening by evening underneath. `show` is 'any' for
// a needle sweeping across every amount, 'habit' for a few draws from the
// first habit, or 'evenings' to play evenings `from` (already over) to
// `to`, at `pace` ms each. Give it a `key` per step.
export default function Salt({
  evenings,
  show,
  from = 0,
  to = 0,
  pace,
  named = false,
}: {
  evenings: Evening[]
  show: Show
  from?: number
  to?: number
  pace: number
  named?: boolean
}) {
  const span = show === 'any' ? 1 : show === 'habit' ? SHOWN.length : Math.max(0, to - from)
  const played = usePlay(span, pace)

  if (show !== 'evenings') {
    const sweep = show === 'any' ? 5 + 4.6 * Math.sin(played * Math.PI * 4 - Math.PI / 2) : null
    const dropped = show === 'habit' ? SHOWN.slice(0, Math.floor(played) + (played >= span ? 0 : 1)) : []
    return (
      <Frame title={show === 'any' ? 'Any amount' : 'Your habit'} note={show === 'any' ? 'not only whole pinches: anything between' : `centre ${one(START.centre)} · spread ${START.spread}`}>
        <Drawing habit={show === 'habit' ? START : null} spreads={[]} named={false} label={show === 'any' ? 'An axis of how much salt, from 0 to 10 pinches, and a marker sweeping across every amount' : 'The habit: a bell curve centred on 2 pinches, half a pinch wide, and a few evenings drawn from it'}>
          {sweep !== null && (
            <g>
              <line x1={x(sweep)} x2={x(sweep)} y1={AXIS - 60} y2={AXIS} className="stroke-sage" strokeWidth={2.5} />
              <text x={x(sweep)} y={AXIS - 68} textAnchor="middle" className="fill-sage font-mono text-[12px] tabular-nums">
                {sweep.toFixed(2)}
              </text>
            </g>
          )}
          {dropped.map((p, i) => {
            const fall = i === dropped.length - 1 && played < span ? Math.min(1, (played - i) / 0.6) : 1
            const y = lerp(bellY(p, START), AXIS, fall)
            return <circle key={i} cx={x(p)} cy={y} r={4.5} className="fill-ink" opacity={0.5} />
          })}
        </Drawing>
      </Frame>
    )
  }

  const quick = pace < QUICK
  const now = from + played
  const index = Math.min(Math.floor(now), Math.max(0, to - 1))
  const part = now >= to ? 1 : now - index
  const evening = to > 0 ? evenings[index] : null
  if (!evening) return null

  const dropping = !quick && part < DROPPED
  const learned = quick ? part : Math.max(0, Math.min(1, (part - LEARNING[0]) / (LEARNING[1] - LEARNING[0])))
  const habit = between(evening.before, evening.after, learned)
  const done = learned >= 1 ? index + 1 : index
  const spreads = [START.spread, ...evenings.slice(0, done).map((e) => e.after.spread)]
  const tries = quick || named ? evenings.slice(Math.max(0, index + 1 - RECENT), index + 1) : [evening]
  const surprise = evening.surprise

  // Which way each number is being pushed, while it learns
  const pushing = !quick && !named && part >= LEARNING[0] && index > 0
  const centreWay = Math.sign(evening.after.centre - evening.before.centre)
  const spreadWay = Math.sign(evening.after.spread - evening.before.spread)

  const verdict = dropping
    ? ' '
    : quick || named
      ? `last ${tries.length} evenings: ${tries.filter((e) => e.surprise > 0.05).length} better than usual`
      : index === 0
        ? `${one(evening.pinches)} pinches · rated ${one(evening.rating)} · your first, so your usual`
        : `${one(evening.pinches)} pinches · rated ${one(evening.rating)} · ${one(Math.abs(surprise))} ${surprise > 0 ? 'better' : 'worse'} than usual`

  return (
    <Frame
      title={quick || named ? `Evening ${index + 1}` : `Evening ${index + 1}`}
      usual={dropping && index === 0 ? undefined : dropping ? evenings[index - 1].usual : evening.usual}
      note={verdict}
      named={named}
    >
      <Drawing
        habit={habit}
        spreads={spreads}
        named={named}
        tasted
        label={`Evening ${index + 1}: the habit's bell curve, centred on ${one(habit.centre)} pinches with a spread of ${habit.spread.toFixed(2)}, the taste of every amount, and the latest tries`}
      >
        {tries.map((e, i) => {
          const latest = i === tries.length - 1
          const fall = latest && !quick && !named ? Math.min(1, part / DROPPED) : 1
          const y = lerp(bellY(e.pinches, e.before), AXIS, fall)
          const how = kind(e.surprise)
          const fade = quick || named ? 0.25 + (0.75 * (i + 1)) / tries.length : 1
          return (
            <circle
              key={index - tries.length + 1 + i}
              cx={x(e.pinches)}
              cy={y}
              r={latest && !quick ? 5.5 : 4}
              strokeWidth={1.5}
              opacity={fade}
              className={how === 'better' ? 'fill-sage stroke-sage' : how === 'worse' ? 'fill-paper stroke-ink' : 'fill-zinc-400 stroke-zinc-400'}
            />
          )
        })}
        {!quick && !named && !dropping && (
          <text x={x(evening.pinches)} y={AXIS - 14} textAnchor="middle" className={`font-mono text-[12px] tabular-nums ${surprise > 0.05 ? 'fill-sage' : 'fill-ink'}`}>
            {one(evening.rating)}
          </text>
        )}
        {pushing && centreWay !== 0 && (
          <text x={x(habit.centre) + centreWay * 16} y={AXIS - BELL - 26} textAnchor="middle" className="fill-sage font-mono text-[16px]">
            {centreWay > 0 ? '→' : '←'}
          </text>
        )}
        {pushing && spreadWay !== 0 && (
          <g className="fill-sage font-mono text-[14px]">
            <text x={x(habit.centre - habit.spread) - 10} y={AXIS - BELL * Math.exp(-0.5)} textAnchor="middle" dy={4}>
              {spreadWay > 0 ? '◂' : '▸'}
            </text>
            <text x={x(habit.centre + habit.spread) + 10} y={AXIS - BELL * Math.exp(-0.5)} textAnchor="middle" dy={4}>
              {spreadWay > 0 ? '▸' : '◂'}
            </text>
          </g>
        )}
      </Drawing>
    </Frame>
  )
}

// The axis, the taste of every amount, the habit's bell curve with its
// centre and spread marked, and the strip of spreads underneath
function Drawing({
  habit,
  spreads,
  named,
  tasted = false,
  label,
  children,
}: {
  habit: Habit | null
  spreads: number[]
  named: boolean
  tasted?: boolean
  label: string
  children?: ReactNode
}) {
  const sx = (i: number, count: number) => LEFT + (i / Math.max(1, count)) * (RIGHT - LEFT)
  const sy = (spread: number) => STRIP[1] - (Math.min(spread, SPREAD_TOP) / SPREAD_TOP) * (STRIP[1] - STRIP[0])
  const shoulder = AXIS - BELL * Math.exp(-0.5)
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={label}>
      {/* The amounts */}
      <line x1={LEFT} x2={RIGHT} y1={AXIS} y2={AXIS} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
      {Array.from({ length: 11 }, (_, p) => (
        <g key={p}>
          <line x1={x(p)} x2={x(p)} y1={AXIS} y2={AXIS + 5} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
          <text x={x(p)} y={AXIS + 19} textAnchor="middle" className="fill-zinc-400 font-mono text-[11px]">
            {p}
          </text>
        </g>
      ))}
      <text x={(LEFT + RIGHT) / 2} y={AXIS + 38} textAnchor="middle" className={`font-mono text-[11px] tracking-widest ${named ? 'fill-sage' : 'fill-zinc-faded uppercase'}`}>
        {named ? 'action a, in pinches' : 'pinches of salt'}
      </text>

      {/* How each amount would taste */}
      {tasted && (
        <g>
          <path d={TASTE_PATH} className="fill-none stroke-zinc-400" strokeWidth={1.5} strokeDasharray="4 4" />
          <text x={x(5)} y={tasteY(10) - 8} textAnchor="middle" className="fill-zinc-faded font-mono text-[11px]">
            {named ? 'reward r' : 'how it would taste'}
          </text>
        </g>
      )}

      {/* The habit */}
      {habit && (
        <g>
          <path d={bellPath(habit)} className="fill-sage/15 stroke-sage" strokeWidth={2} />
          <line x1={x(habit.centre)} x2={x(habit.centre)} y1={AXIS} y2={AXIS - BELL - 6} className="stroke-sage" strokeDasharray="3 3" />
          <text x={x(habit.centre)} y={AXIS - BELL - 12} textAnchor="middle" className="fill-sage font-mono text-[12px] tabular-nums">
            {named ? `mean μ ${one(habit.centre)}` : `centre ${one(habit.centre)}`}
          </text>
          <line x1={x(habit.centre - habit.spread)} x2={x(habit.centre + habit.spread)} y1={shoulder} y2={shoulder} className="stroke-sage" strokeWidth={1.5} />
          <text x={x(habit.centre + habit.spread) + 22} y={shoulder - 8} className="fill-sage font-mono text-[12px] tabular-nums">
            {named ? `σ ${habit.spread.toFixed(2)}` : `± ${habit.spread.toFixed(2)}`}
          </text>
        </g>
      )}
      {children}

      {/* The spread, evening by evening */}
      {spreads.length > 0 && (
        <g>
          <line x1={LEFT} x2={RIGHT} y1={STRIP[1]} y2={STRIP[1]} className="stroke-zinc-300 dark:stroke-zinc-200/25" />
          <path
            d={spreads.map((s, i) => `${i ? 'L' : 'M'}${sx(i, STRIP_EVENINGS).toFixed(1)},${sy(s).toFixed(1)}`).join(' ')}
            className="fill-none stroke-sage"
            strokeWidth={2}
          />
          <circle cx={sx(spreads.length - 1, STRIP_EVENINGS)} cy={sy(spreads.at(-1)!)} r={3} className="fill-sage" />
          <text x={LEFT} y={STRIP[0] - 8} className="fill-zinc-faded font-mono text-[11px] uppercase tracking-widest">
            the spread, evening by evening
          </text>
          <text x={RIGHT} y={STRIP[1] + 16} textAnchor="end" className="fill-zinc-400 font-mono text-[11px]">
            {STRIP_EVENINGS}
          </text>
        </g>
      )}
    </svg>
  )
}

const SPREAD_TOP = 1.4
const STRIP_EVENINGS = 150

function Frame({
  title,
  usual,
  note,
  named = false,
  children,
}: {
  title: string
  usual?: number
  note: string
  named?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.8rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">{title}</span>
        {usual !== undefined && (
          <span className="text-right text-zinc-faded">
            {named ? 'Baseline b' : 'Usual'} <span className="text-ink tabular-nums">{one(usual)}</span>
          </span>
        )}
      </div>
      <div className="mt-2">{children}</div>
      <p className="mt-1 min-h-[3em] sm:min-h-[1.5em] text-center font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">{note}</p>
    </div>
  )
}
