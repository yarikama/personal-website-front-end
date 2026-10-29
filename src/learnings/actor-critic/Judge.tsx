import type { ReactNode } from 'react'
import { usePlay } from '../../components/explain/useLoop'
import { along, wayOf } from '../reinforce/geometry'
import Hill, { type Mark } from '../reinforce/Hill'
import { fresh, STALLS, TURNS } from '../reinforce/model'
import { evenFeel, type Walk } from './model'

// A walk is five legs: office to the first fork, then one per turn
export const LEGS = 5
// Faster than this a leg, and only the lanes taken and the habits show
const QUICK = 100
const RECENT = 30

const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}`
const ROW_NAMES = ['the top', 'the second fork', 'the third fork', 'the last fork']

// The actor–critic story: walks played leg by leg, from leg `from` (all
// walks counted, so walk w starts at w × LEGS) up to `to`, at `pace` ms a
// leg. Each turn is judged as soon as it is taken: the critic's verdict δ
// shows by its lane, the lane's width moves, and the guess in the fork it
// left is updated (ringed). `settled` rings every fork the walk passed.
export default function Judge({
  walks,
  from,
  to,
  pace,
  settled = false,
  named = false,
}: {
  walks: Walk[]
  from: number
  to: number
  pace: number
  settled?: boolean
  named?: boolean
}) {
  const played = usePlay(to - from, pace)
  const now = from + played
  const quick = pace < QUICK

  if (to === 0) {
    return (
      <Frame title="Before the first lunch" note=" ">
        <Hill
          habits={fresh()}
          values={evenFeel()}
          label="The hill, every lane as wide as the next, with the lunch you expect from each fork written in it"
        />
      </Frame>
    )
  }

  const w = Math.max(0, Math.min(Math.floor(now / LEGS - 1e-9), walks.length - 1))
  const walk = walks[w]
  const leg = Math.min(LEGS, now - w * LEGS)
  const judged = quick ? walk.steps.length : Math.max(0, Math.min(walk.steps.length, Math.floor(leg + 1e-9) - 1))
  const previous = w > 0 ? walks[w - 1] : null
  const habits = judged > 0 ? walk.steps[judged - 1].habits : (previous?.habits ?? fresh())
  const feel = judged > 0 ? walk.steps[judged - 1].feel : (previous?.feel ?? evenFeel())
  const forks = walk.steps.map((s) => s.fork)
  const way = wayOf(forks, walk.stall)
  // Out walking, until it stops at a fork for the story to tell
  const out = !quick && leg < LEGS && now < to
  const taken = walk.steps.flatMap((s, t) => (quick || t + 1 <= leg ? [[s.fork, s.turn] as [number, number]] : []))
  const marks: Mark[] = quick
    ? []
    : walk.steps.slice(0, judged).map((s) => ({ fork: s.fork, turn: s.turn, text: signed(s.delta), good: s.delta >= 0 }))
  const ringed = quick ? [] : settled ? forks : judged > 0 ? [walk.steps[judged - 1].fork] : []
  const last = judged > 0 ? walk.steps[judged - 1] : null
  const recent = walks.slice(Math.max(0, w + 1 - RECENT), w + 1)
  const shares = quick || named ? STALLS.map((_, s) => recent.filter((x) => x.stall === s).length / recent.length) : null

  const note = named
    ? 'The verdict: the TD error δ'
    : quick || !last
      ? ' '
      : last.stall !== null
        ? `${STALLS[last.stall]} · rated ${last.reward} · expected ${last.here.toFixed(1)} · δ ${signed(last.delta)}`
        : `${TURNS[last.turn]} at ${ROW_NAMES[judged - 1]} · ${last.here.toFixed(1)} → ${last.there.toFixed(1)} · δ ${signed(last.delta)}`

  return (
    <Frame title={`Lunch ${w + 1}`} note={note} good={named || (last?.delta ?? 0) >= 0}>
      <Hill
        habits={habits}
        values={feel}
        label={`Lunch ${w + 1}: the walk down, each turn judged by the critic as it is taken; lanes as wide as the habits, and the critic's guess in each fork`}
        taken={taken}
        walker={out ? along(way, leg) : null}
        arrived={!out ? { stall: walk.stall, score: walk.score } : null}
        marks={marks}
        ringed={ringed}
        shares={shares}
      />
      {(quick || named) && (
        <p className="mt-1 text-center font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">
          {named ? 'Lane widths: the actor · numbers: the critic' : `Bars: where the last ${recent.length} lunches ended`}
        </p>
      )}
    </Frame>
  )
}

function Frame({ title, note, good = true, children }: { title: string; note: string; good?: boolean; children: ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">{title}</div>
      <div className={`mt-2 min-h-[1.25rem] font-mono text-[0.8rem] uppercase tracking-widest ${good ? 'text-sage' : 'text-ink'}`}>
        {note}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}
