import type { ReactNode } from 'react'
import { usePlay } from '../../components/explain/useLoop'
import Labelled from '../../components/explain/Labelled'
import Track from '../../components/explain/LaddersTrack'
import { bestValues } from '../../components/explain/planning'
import Gaps from './Gaps'
import { offText, PER_SWEEP, type Moment, type Run } from './model'

const SCALE = Math.max(...bestValues().map(Math.abs))

// The board at one moment of a run: every square's value and move, and
// rings on `rung` (by default, the squares that would rather take the
// other move)
export function Board({ moment, rung, label }: { moment: Moment; rung?: number[]; label: string }) {
  return (
    <Track
      label={label}
      values={moment.values}
      shade
      scale={SCALE}
      plan={moment.plan}
      rung={rung ?? moment.unhappy}
    />
  )
}

// Both jobs' unfinished work at a moment, for the line above the board
export function Owed({ moment }: { moment: Moment }) {
  const count = moment.unhappy.length
  return (
    <>
      off <span className="text-sage tabular-nums">{offText(moment.off)}</span> ·{' '}
      <span className="text-ink tabular-nums">{count}</span> to switch
    </>
  )
}

// A stretch of a run played on the board, moment `from` to `to`, at `pace`
// ms a moment; give it a `key` to play it again
export function Stretch({
  run,
  from,
  to,
  pace,
  left,
  label,
}: {
  run: Run
  from: number
  to: number
  pace: number
  left: (moment: Moment) => ReactNode
  label: string
}) {
  const played = usePlay(to - from, pace)
  const moment = run.moments[Math.min(to, from + Math.floor(played))]
  return (
    <Labelled left={left(moment)} right={<Owed moment={moment} />}>
      <Board moment={moment} label={label} />
    </Labelled>
  )
}

// A whole run's unfinished work, drawn as it plays: `pace` ms a sweep
export function Playback({ run, pace, left, right }: { run: Run; pace: number; left: ReactNode; right?: ReactNode }) {
  const played = usePlay(run.updates / PER_SWEEP, pace)
  return (
    <Labelled left={left} right={right}>
      <Gaps run={run} upTo={played * PER_SWEEP} ghost={false} />
    </Labelled>
  )
}
