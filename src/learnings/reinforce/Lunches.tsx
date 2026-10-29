import type { ReactNode } from 'react'
import { usePlay } from '../../components/explain/useLoop'
import { along, wayOf } from '../../components/explain/hillGeometry'
import Hill, { type Mark } from '../../components/explain/Hill'
import { chancesAt, fresh, STALLS, type Day, type Habits } from '../../components/explain/lunchHill'

// Walk at this share of a lunch, then the rating, then the habits move
const WALKED = 0.62
const LEARNING = [0.72, 0.9]
// Faster than this a lunch, and only the lanes taken and the habits show
const QUICK = 300
// Stall shares over this many of the latest lunches
const RECENT = 30

// Habits partway from one set to another, by their chances: what the
// drawing shows while a lunch is being learned from
function between(a: Habits, b: Habits, k: number): Habits {
  return a.map((h, fork) => {
    const from = chancesAt(a, fork)[1]
    const to = chancesAt(b, fork)[1]
    const right = from + (to - from) * k
    // Back to preferences: only the gap matters to the drawing
    const gap = Math.log(right / (1 - right))
    return [0, Number.isFinite(gap) ? gap : h[1] - h[0]]
  })
}

// The REINFORCE story: lunches from `from` (already over when the figure
// opens) up to `to`, at `pace` ms a lunch. Each one walks down, gets its
// rating, and then every turn it took moves by how the rating compares
// with the usual.
export default function Lunches({ days, from, to, pace, named = false }: { days: Day[]; from: number; to: number; pace: number; named?: boolean }) {
  const played = usePlay(to - from, pace)
  const now = from + played
  const quick = pace < QUICK
  const index = Math.min(Math.floor(now), to - 1)
  const part = now >= to ? 1 : now - index
  const day = to > 0 ? days[index] : null
  const before = index > 0 ? days[index - 1].habits : fresh()

  if (!day) {
    return (
      <Frame title="Before the first lunch" note=" ">
        <Hill habits={fresh()} label="The hill: four rows of forks between the office and five stalls, every lane as wide as the next" />
      </Frame>
    )
  }

  const walking = !quick && part < WALKED
  const rated = quick || part >= WALKED
  const learned = quick ? 1 : Math.max(0, Math.min(1, (part - LEARNING[0]) / (LEARNING[1] - LEARNING[0])))
  const habits = learned >= 1 ? day.habits : learned > 0 ? between(before, day.habits, learned) : before
  const way = wayOf(day.forks, day.stall)
  const legs = walking ? (part / WALKED) * (way.length - 1) : way.length - 1
  const taken = day.forks.flatMap((fork, t) => (t + 1 <= legs ? [[fork, day.turns[t]] as [number, number]] : []))
  const surprise = day.surprise
  const marks: Mark[] =
    learned > 0 && !quick && Math.abs(surprise) > 0.05
      ? day.forks.map((fork, t) => ({ fork, turn: day.turns[t], text: surprise > 0 ? '▲' : '▼', good: surprise > 0 }))
      : []
  const recent = days.slice(Math.max(0, index + 1 - RECENT), index + 1)
  const shares = quick || named ? STALLS.map((_, s) => recent.filter((d) => d.stall === s).length / recent.length) : null

  const verdict = !rated
    ? ' '
    : index === 0
      ? `${STALLS[day.stall]} · rated ${day.score} · your first, so your usual`
      : Math.abs(surprise) < 0.05
        ? `${STALLS[day.stall]} · rated ${day.score} · just your usual`
        : `${STALLS[day.stall]} · rated ${day.score} · ${Math.abs(surprise).toFixed(1)} ${surprise > 0 ? 'better' : 'worse'} than usual`

  return (
    <Frame
      title={`Lunch ${index + 1}`}
      usual={rated ? day.usual : index > 0 ? days[index - 1].usual : undefined}
      named={named}
      note={verdict}
      good={surprise >= 0}
    >
      <Hill
        habits={habits}
        label={`Lunch ${index + 1}: the walk down the hill, the stall it ends at, and every lane as wide as the habit for taking it`}
        taken={taken}
        walker={walking ? along(way, legs) : null}
        arrived={rated ? { stall: day.stall, score: day.score } : null}
        marks={marks}
        shares={shares}
        named={named}
      />
      {(quick || named) && (
        <p className="mt-1 text-center font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">
          Bars: where the last {recent.length} lunches ended
        </p>
      )}
    </Frame>
  )
}

function Frame({
  title,
  usual,
  note,
  good = true,
  named = false,
  children,
}: {
  title: string
  usual?: number
  note: string
  good?: boolean
  named?: boolean
  children: ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.8rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">{title}</span>
        {usual !== undefined && (
          <span className="text-right text-zinc-faded">
            {named ? 'Baseline b' : 'Usual'} <span className="text-ink">{usual.toFixed(1)}</span>
          </span>
        )}
      </div>
      <div className={`mt-2 min-h-[1.25rem] font-mono text-[0.8rem] uppercase tracking-widest ${good ? 'text-sage' : 'text-ink'}`}>
        {named ? 'The rating: the return G' : note}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

