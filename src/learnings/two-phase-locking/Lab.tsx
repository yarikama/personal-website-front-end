import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { Button, Choice, Controls, Figure, Readout } from '../../components/explain/figure'
import LockLab from './LockLab'
import { labRun, RULES, TIMING, TIMINGS, verdict, verdictSays, type Rule, type Timing } from './model'

const PACE = 750

// The lock manager to play with: a timing, a rule, and the events one at a
// time, by hand or played
export default function Lab() {
  const [timing, setTiming] = useState<Timing>('Early')
  const [rule, setRule] = useState<Rule>('Locks only')
  const [at, setAt] = useState(0)
  const [playing, setPlaying] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const lastTick = useRef<number | null>(null)

  const run = labRun(timing, rule)
  const total = run.events.length
  const shown = Math.min(at, total)
  const finished = shown === total
  const v = verdict(run)

  useAnimationFrame((time) => {
    if (!playing) {
      lastTick.current = null
      return
    }
    lastTick.current ??= time
    if (time - lastTick.current < PACE) return
    lastTick.current = time
    if (shown + 1 >= total) setPlaying(false)
    setAt(Math.min(total, shown + 1))
  })

  const choose = (next: { timing?: Timing; rule?: Rule }) => {
    if (next.timing) setTiming(next.timing)
    if (next.rule) setRule(next.rule)
    setAt(0)
    setPlaying(false)
  }
  const play = () => {
    if (reducedMotion) {
      setAt(total)
      return
    }
    if (finished) setAt(0)
    setPlaying(!playing)
  }

  return (
    <Figure
      caption={
        <>
          T1 adds 100 to A and B; T2 doubles them; both start at 25, so either order one at a time ends with A = B. A
          chip in sage is done, a dashed one waits for its lock. In the schedule a dashed underline marks a dirty read,
          and a struck-out step belongs to a try that was rolled back. Try Early under each rule, then Late for dirty
          reads, Crossed for a deadlock, and Readers for two shared locks on one item.
        </>
      }
    >
      <LockLab run={run} at={shown} />
      <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
        <Readout label="Serializable" value={finished ? (v.order ? 'Yes' : 'No') : '…'} accent />
        <Readout label="Dirty reads" value={finished ? v.dirty : '…'} />
        <Readout label="Deadlocks" value={finished ? v.deadlocks : '…'} />
        <Readout label="A, B at the end" value={finished ? `${v.values.A}, ${v.values.B}` : '…'} />
      </div>
      <p className="mt-4 min-h-[3rem] text-sm leading-relaxed text-zinc-faded">
        {finished ? verdictSays(run) : `${TIMING[timing].says}. Step ${shown} of ${total}.`}
      </p>
      <Controls>
        <Choice label="Timing" options={TIMINGS} value={timing} onChange={(t) => choose({ timing: t })} />
        <Choice label="Rule" options={RULES} value={rule} onChange={(r) => choose({ rule: r })} />
      </Controls>
      <Controls>
        <Button onClick={() => setAt(Math.min(total, shown + 1))} disabled={finished || playing}>
          Step
        </Button>
        <Button onClick={play}>{playing ? 'Pause' : finished ? 'Play again' : 'Play'}</Button>
        <Button
          onClick={() => {
            setAt(0)
            setPlaying(false)
          }}
          disabled={shown === 0}
        >
          Reset
        </Button>
      </Controls>
    </Figure>
  )
}
