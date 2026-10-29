import { useEffect, useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { Button, Choice, Controls, Readout } from '../../components/explain/figure'
import Labelled from '../../components/explain/Labelled'
import { signed, state } from '../../components/explain/ladders'
import Gaps from './Gaps'
import { Board, Owed } from './Notebook'
import { at, grainName, GRAINS, PER_SWEEP, run, sameAsBest, switchedBy, type Grain } from './model'

// Every run takes about this long to play, whatever its grain
const PLAY_MS = 9000

// Judging and improving at a grain the reader picks, played on the board
// and on the two jobs' unfinished work. It starts playing the first time
// it is mostly on screen, and again on each new grain; with reduced motion
// it shows the end.
export default function Grains() {
  const reducedMotion = usePrefersReducedMotion()
  const [grain, setGrain] = useState<Grain>('settled')
  const [updates, setUpdates] = useState(0)
  const [playing, setPlaying] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const last = useRef<number | null>(null)

  const chosen = run(grain)
  const end = chosen.updates
  // A grain just picked can find `updates` from the last one
  const now = reducedMotion ? end : Math.min(updates, end)

  useEffect(() => {
    const element = root.current
    if (!element || reducedMotion) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        setPlaying(true)
      },
      { threshold: 0.4 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [reducedMotion])

  useAnimationFrame((time) => {
    if (!playing) {
      last.current = null
      return
    }
    if (now >= end) {
      setPlaying(false)
      return
    }
    const since = last.current === null ? 0 : time - last.current
    last.current = time
    setUpdates((u) => Math.min(end, Math.min(u, end) + (since / PLAY_MS) * end))
  })

  const pick = (next: Grain) => {
    setGrain(next)
    setUpdates(0)
    setPlaying(!reducedMotion)
  }

  const moment = chosen.moments[at(chosen, now)]
  const done = now >= end
  const sweeps = now / PER_SWEEP

  return (
    <div ref={root}>
      <Labelled
        left={
          <>
            Sweep <span className="text-ink tabular-nums">{sweeps.toFixed(grain === 'square' ? 1 : 0)}</span>
          </>
        }
        right={<Owed moment={moment} />}
      >
        <Board
          moment={moment}
          label={`The board after ${sweeps.toFixed(1)} sweeps' worth of updates, judging ${grainName(grain)} between improvements; ringed squares would rather take the other move`}
        />
      </Labelled>
      <div className="mt-6">
        <Gaps run={chosen} upTo={now} />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
        <Readout label="Moves switched" value={switchedBy(chosen, now)} />
        <Readout label="Square 1" value={signed(moment.values[state(1)], 2)} />
        <Readout label="The best play?" value={done ? (sameAsBest(moment.plan) ? 'Yes' : 'No') : '…'} accent={done} />
      </div>
      <Controls>
        <Choice label="Judge between improvements" options={GRAINS} value={grain} onChange={pick} format={grainName} />
        <Button
          onClick={() => {
            if (done) setUpdates(0)
            setPlaying((p) => !p || done)
          }}
        >
          {playing ? 'Pause' : done ? 'Replay' : 'Play'}
        </Button>
      </Controls>
    </div>
  )
}
