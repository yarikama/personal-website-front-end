import type { ReactNode } from 'react'
import { usePlay } from '../../components/explain/useLoop'
import { add, norm, scale, type Mistake, type Summary, type Vec, type Visit } from './model'
import { Arrow, Key, Look, Plane } from './Plane'
import { screen } from './planeScale'

// How much of w the update step draws, so the arrows fit in the square
const DRAWN = 0.7

export type Show = 'intro' | 'calls' | 'mistake' | 'run' | 'messy' | 'named'

// The story's crate of avocados. `tidy` is the crate a line splits, with
// its looks in order; `messy` the one it doesn't; `calls` a few right
// calls and `mistake` the wrong one after them. Give it a `key` per step.
export default function Crate({
  show,
  tidy,
  tidyVisits,
  messy,
  messyVisits,
  calls,
  mistake,
}: {
  show: Show
  tidy: Summary
  tidyVisits: Visit[]
  messy: Summary
  messyVisits: Visit[]
  calls: Visit[]
  mistake: Mistake
}) {
  const n = tidy.data.length
  const span =
    show === 'intro' ? n : show === 'calls' ? calls.length : show === 'mistake' ? 4 : show === 'run' ? tidyVisits.length : show === 'messy' ? messyVisits.length : 1
  const pace = show === 'intro' ? 70 : show === 'calls' ? 650 : show === 'mistake' ? 1100 : show === 'run' ? 150 : show === 'messy' ? 70 : 1
  const played = usePlay(span, pace)

  if (show === 'intro') {
    return (
      <Frame left={`A crate of ${n}`} right="ripe or not?">
        <Plane data={tidy.data} w={null} shown={played} label={`${n} avocados on a chart of how soft and how dark each is, ripe ones and unripe ones in two loose groups`} />
      </Frame>
    )
  }

  if (show === 'calls') {
    const look = calls[Math.min(calls.length - 1, Math.floor(played))]
    const ripe = tidy.data[look.at].y === 1
    return (
      <Frame left={`Avocado ${look.at + 1} of ${n}`} right={`Called ${ripe ? 'ripe' : 'not ripe'} · right`}>
        <Plane data={tidy.data} w={look.before} label="A straight line through the middle; the avocados on its shaded side are called ripe, and each one looked at is called right">
          <Look at={tidy.data[look.at].x} wrong={false} />
        </Plane>
      </Frame>
    )
  }

  if (show === 'mistake') {
    const point = tidy.data[mistake.at]
    const push = scale(point.x, point.y)
    const turn = Math.max(0, Math.min(1, played - 2))
    const w = add(mistake.before, scale(push, turn))
    const tip = scale(mistake.before, DRAWN)
    const grown = Math.max(0, Math.min(1, played - 1))
    const done = played >= 3
    const [said, truth] = point.y === 1 ? ['not ripe', 'ripe'] : ['ripe', 'not ripe']
    const right = played < 1 ? `Called ${said} · wrong` : played < 3 ? 'Turning the rule' : `Now called ${truth} · right`
    return (
      <Frame left={`Avocado ${mistake.at + 1} of ${n}`} right={right}>
        <Plane
          data={tidy.data}
          w={w}
          label="An unripe avocado on the ripe side is called wrong; the arrow that sets the line is pushed away from that avocado, and the line turns until the avocado is on the unripe side"
        >
          <Look at={point.x} wrong={!done} />
          {played >= 1 && (
            <g>
              <Arrow from={[0, 0]} to={scale(w, DRAWN)} tone="sage" />
              <Arrow from={tip} to={add(tip, scale(push, DRAWN * grown))} tone="ink" dashed />
            </g>
          )}
        </Plane>
      </Frame>
    )
  }

  if (show === 'run' || show === 'messy') {
    const all = show === 'run' ? tidyVisits : messyVisits
    const data = show === 'run' ? tidy.data : messy.data
    const i = Math.min(all.length - 1, Math.floor(played))
    const look = all[i]
    const finished = played >= all.length
    const thisRound = all.slice(i - (i % data.length), i + 1).filter((v) => v.wrong).length
    const right =
      show === 'run' && finished
        ? `${look.mistakes} wrong calls · then none`
        : show === 'run'
          ? `Wrong calls ${look.mistakes}`
          : `Wrong this round ${thisRound} · in all ${look.mistakes}`
    return (
      <Frame left={`Round ${look.pass + 1}`} right={right}>
        <Plane
          data={data}
          w={look.after}
          label={
            show === 'run'
              ? `Round after round over the same crate: the line turns at each wrong call, ${look.mistakes} of them, then stops`
              : 'A messier crate where the two kinds overlap: the line turns again every round'
          }
        >
          {!finished && <Look at={data[look.at].x} wrong={look.wrong} />}
        </Plane>
      </Frame>
    )
  }

  // The reveal: the same crate, settled, in its own names
  const w = tidy.run.mistakes.at(-1)!.after
  const arrow = scale(w, 0.9 / norm(w))
  const [ax, ay] = screen(arrow)
  // Where the line leaves the chart on the right, for its name
  const along: Vec = [arrow[1] * 1.45, -arrow[0] * 1.45]
  const [lx, ly] = screen(along)
  return (
    <Frame left="weights w" right={`mistakes k = ${tidy.run.mistakes.length}`} named>
      <Plane data={tidy.data} w={w} named label="The same chart with its names: each point is x, its label y is +1 or −1, and the line is w · x = 0 with the arrow w at right angles to it">
        <Arrow from={[0, 0]} to={arrow} tone="sage" />
        <text x={ax + 10} y={ay - 6} className="fill-ink font-mono text-[14px]">
          w
        </text>
        <text x={lx - 4} y={ly + 24} textAnchor="end" className="fill-ink font-mono text-[12px]">
          w · x = 0
        </text>
      </Plane>
    </Frame>
  )
}

function Frame({ left, right, named = false, children }: { left: string; right: string; named?: boolean; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className="shrink-0 text-zinc-faded">{left}</span>
        <span className="text-right text-ink tabular-nums">{right}</span>
      </div>
      <div className="mt-2">{children}</div>
      <Key named={named} />
    </div>
  )
}
