import { useId } from 'react'
import { lerp, usePlay } from '../../components/explain/useLoop'
import type { Event, Run, State } from './model'

// Story words or database words for the same drawing: the reveal relabels it
type Words = 'story' | 'db'
const ROOM = { story: { A: 'Kitchen', B: 'Bathroom' }, db: { A: 'Row A', B: 'Row B' } }
const KEY = { story: { A: 'K', B: 'B' }, db: { A: 'A', B: 'B' } }
const WHO = { story: ['You', 'Sam'], db: ['T1', 'T2'] }

const W = 600
// The house sits in the middle; the tape uses the whole width
const HOUSE_X = 20
const ROOM_Y = 12
const ROOM_H = 138
const ROOMS = { A: { x: 12, w: 200 }, B: { x: 348, w: 200 } }
const HOOK = { x: 236, y: 12, w: 88, h: 46 }
const SLOT = { A: { x: 245, y: 22 }, B: { x: 293, y: 22 } }
const TAG = { w: 22, h: 14 }
const R = 16
const TAPE_Y = 222
const ROW = 32
const LABEL_W = 40
const COL = 37
const H = TAPE_Y + 2 * ROW + 4

type Place = 'home' | 'hook' | 'A' | 'B'
// Where each person stands in each place, side by side
const SPOT: Record<Place, [number, number][]> = {
  home: [
    [226, 190],
    [334, 190],
  ],
  hook: [
    [246, 106],
    [314, 106],
  ],
  A: [
    [78, 104],
    [148, 104],
  ],
  B: [
    [412, 104],
    [482, 104],
  ],
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
const clamp = (t: number) => Math.max(0, Math.min(1, t))

// Where person `t` is after the first `k` events: at the hook to take, give
// back or wait for a key; in a room to work in it; home once done
function placeAfter(run: Run, t: number, k: number): Place {
  if (k > 0 && run.states[k - 1].committed[t]) return 'home'
  for (let i = k - 1; i >= 0; i--) {
    const e = run.events[i]
    if (e.t !== t || e.kind === 'deadlock') continue
    if (e.kind === 'op') return e.item as Place
    if (e.kind === 'commit') return 'home'
    return 'hook'
  }
  return 'home'
}

const stateAfter = (run: Run, k: number): State => (k === 0 ? run.start : run.states[k - 1])

function says(e: Event, words: Words): string {
  const who = WHO[words][e.t]
  const you = words === 'story' && e.t === 0
  const s = you ? '' : 's'
  if (e.kind === 'deadlock') return words === 'story' ? 'Stuck: each waits for the other' : 'Deadlock: T1 and T2 wait for each other'
  if (e.kind === 'commit') return words === 'story' ? (you ? 'You’re done' : `${who} is done`) : `${who} commits`
  if (e.kind === 'abort') return `${who} is rolled back`
  const room = words === 'story' ? ROOM.story[e.item as 'A' | 'B'].toLowerCase() : e.item
  if (words === 'story') {
    if (e.kind === 'lock') return `${who} take${s} the ${room} key`
    if (e.kind === 'unlock') return `${who} hang${s} the ${room} key back`
    if (e.kind === 'wait') return `${who} wait${s} for the ${room} key`
    return `${who} paint${s} the ${room}`
  }
  if (e.kind === 'lock') return `${who} gets an exclusive lock on ${room}`
  if (e.kind === 'unlock') return `${who} releases ${room}`
  if (e.kind === 'wait') return `${who} waits for a lock on ${room}`
  return `${who} writes ${room}`
}

// A cell of the tape: two short lines
function cell(e: Event, words: Words): [string, string] {
  const key = 'item' in e ? KEY[words][e.item as 'A' | 'B'] : ''
  if (words === 'story') {
    if (e.kind === 'lock') return ['take', key]
    if (e.kind === 'unlock') return ['back', key]
    if (e.kind === 'wait') return ['wait', key]
    if (e.kind === 'op') return ['paint', key]
    return ['done', '']
  }
  if (e.kind === 'lock') return [e.mode === 'X' ? 'xl' : 'sl', key]
  if (e.kind === 'unlock') return ['u', key]
  if (e.kind === 'wait') return ['wait', key]
  if (e.kind === 'op') return [e.op, key]
  return ['c', '']
}

function paintedBy(value: number, words: Words) {
  if (words === 'db') return value === 0 ? 'not written' : `written by ${WHO.db[value - 1]}`
  return value === 0 ? 'unpainted' : value === 1 ? 'your colour' : 'Sam’s colour'
}

function Tag({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      <rect x={x} y={y} width={TAG.w} height={TAG.h} rx={4} className="fill-paper stroke-ink" strokeWidth={1.4} />
      <circle cx={x + 5} cy={y + TAG.h / 2} r={2} className="fill-ink" />
      <text x={x + 14} y={y + 10.5} textAnchor="middle" className="fill-ink font-mono text-[10px]">
        {label}
      </text>
    </g>
  )
}

// Two people, two rooms and a hook with one key per room. It plays the
// events of `run` from `from` up to `to`, with the ones before `from`
// already done; under it, a tape with one cell per event, a row per person.
// Give it a `key` to play again.
export default function House({
  run,
  from,
  to,
  words,
  pace = 900,
}: {
  run: Run
  from: number
  to: number
  words: Words
  pace?: number
}) {
  // An id safe inside url(#…)
  const arrow = `arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const played = usePlay(to - from, pace)
  const finished = played >= to - from
  const current = finished ? to : from + Math.floor(played)
  const f = finished ? 0 : played - Math.floor(played)
  const event = finished ? undefined : run.events[current]

  // Keys, paint and waiting change halfway through an event; people walk
  // in its first part
  const shown = event && f >= 0.5 ? current + 1 : current
  const state = stateAfter(run, shown)
  const walk = ease(clamp(f / 0.6))
  const at = [0, 1].map((t) => {
    const a = SPOT[placeAfter(run, t, current)][t]
    const b = SPOT[placeAfter(run, t, event ? current + 1 : current)][t]
    return [lerp(a[0], b[0], walk), lerp(a[1], b[1], walk)] as [number, number]
  })

  const holder = (item: 'A' | 'B') => state.locks[item]?.[0]?.t ?? null
  const tape = run.events.slice(0, shown).filter((e) => e.kind !== 'deadlock')
  const last = run.events[shown - 1]
  const status = event ? says(event, words) : shown === 0 ? (words === 'story' ? 'Nobody has started' : 'Nothing has run') : last.kind === 'deadlock' ? says(last, words) : 'Done'
  const rooms = (['A', 'B'] as const).map((i) => `${ROOM[words][i]}: ${paintedBy(state.values[i], words)}`).join(' · ')

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className={event?.kind === 'wait' || last?.kind === 'deadlock' ? 'text-ink' : 'text-zinc-faded'}>{status}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`${status}. ${rooms}.`}>
        <g transform={`translate(${HOUSE_X},0)`}>
          {/* The rooms, coloured by who painted them last */}
          {(['A', 'B'] as const).map((i) => {
            const v = state.values[i]
            return (
              <g key={i}>
                <rect
                  x={ROOMS[i].x}
                  y={ROOM_Y}
                  width={ROOMS[i].w}
                  height={ROOM_H}
                  rx={14}
                  className={`${v === 1 ? 'fill-sage/25' : v === 2 ? 'fill-ink/15' : 'fill-paper'} stroke-zinc-300 dark:stroke-zinc-200/25 transition-colors duration-500`}
                  strokeWidth={1.4}
                />
                <text x={ROOMS[i].x + 14} y={ROOM_Y + 22} className="fill-ink font-mono text-[11px] uppercase tracking-widest">
                  {ROOM[words][i]}
                </text>
                <text x={ROOMS[i].x + 14} y={ROOM_Y + 38} className="fill-zinc-faded font-mono text-[10px]">
                  {paintedBy(v, words)}
                </text>
              </g>
            )
          })}

          {/* The hook, and the keys on it */}
          <rect x={HOOK.x} y={HOOK.y} width={HOOK.w} height={HOOK.h} rx={10} className="fill-none stroke-zinc-300 dark:stroke-zinc-200/25" strokeDasharray="3 4" />
          <text x={HOOK.x + HOOK.w / 2} y={HOOK.y + HOOK.h - 6} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
            {words === 'story' ? 'keys' : 'locks'}
          </text>
          {(['A', 'B'] as const).map((i) => (holder(i) === null ? <Tag key={i} x={SLOT[i].x} y={SLOT[i].y} label={KEY[words][i]} /> : null))}

          {/* Who waits for whom */}
          {[0, 1].map((t) => {
            const want = state.waiting[t]
            if (!want) return null
            const h = holder(want.item as 'A' | 'B')
            if (h === null || h === t) return null
            const [x1, y1] = at[t]
            const [x2, y2] = at[h]
            const bend = t === 0 ? -34 : 34
            const mx = (x1 + x2) / 2
            const my = (y1 + y2) / 2 + bend
            const stuck = state.cycle !== null || run.stuck
            return (
              <path
                key={t}
                d={`M${x1},${y1 + (bend < 0 ? -R : R)} Q${mx},${my} ${x2},${y2 + (bend < 0 ? -R : R)}`}
                className={`fill-none ${stuck ? 'stroke-ink' : 'stroke-zinc-400'}`}
                strokeWidth={stuck ? 2 : 1.4}
                strokeDasharray="4 4"
                markerEnd={`url(#${arrow})`}
              />
            )
          })}
          <defs>
            <marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className="fill-ink" />
            </marker>
          </defs>

          {/* The people, with the keys they hold */}
          {[0, 1].map((t) => {
            const [x, y] = at[t]
            const keys = (['A', 'B'] as const).filter((i) => holder(i) === t)
            const want = state.waiting[t]
            return (
              <g key={t}>
                <circle cx={x} cy={y} r={R} className={`fill-paper ${t === 0 ? 'stroke-sage' : 'stroke-ink'}`} strokeWidth={2} />
                <text x={x} y={y + 3.5} textAnchor="middle" className="fill-ink font-mono text-[10px]">
                  {WHO[words][t]}
                </text>
                {keys.map((i, j) => (
                  <Tag key={i} x={x + R + 3} y={y - 18 + j * 18} label={KEY[words][i]} />
                ))}
                {want && (
                  <text x={x} y={y + R + 26} textAnchor="middle" className="fill-ink font-mono text-[10px]">
                    wants {KEY[words][want.item as 'A' | 'B']}
                  </text>
                )}
              </g>
            )
          })}

        </g>

        {/* The tape: one cell per event, a row per person */}
        {[0, 1].map((t) => (
          <text key={t} x={0} y={TAPE_Y + t * ROW + 17} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
            {WHO[words][t]}
          </text>
        ))}
        {tape.map((e, k) => {
          const [top, bottom] = cell(e, words)
          const x = LABEL_W + k * COL
          const y = TAPE_Y + e.t * ROW
          const tone =
            e.kind === 'wait' ? 'fill-paper stroke-ink' : e.kind === 'op' ? 'fill-sage/20 stroke-sage' : 'fill-paper stroke-zinc-300 dark:stroke-zinc-200/25'
          return (
            <g key={k}>
              <rect x={x} y={y} width={COL - 4} height={ROW - 6} rx={5} className={tone} strokeWidth={1.2} strokeDasharray={e.kind === 'wait' ? '3 3' : undefined} />
              <text x={x + (COL - 4) / 2} y={y + 11} textAnchor="middle" className={`${e.kind === 'op' ? 'fill-sage-ink' : 'fill-ink'} font-mono text-[10px]`}>
                {top}
              </text>
              <text x={x + (COL - 4) / 2} y={y + 22} textAnchor="middle" className="fill-zinc-faded font-mono text-[10px]">
                {bottom}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="mt-2 text-center font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">{rooms}</p>
    </div>
  )
}
