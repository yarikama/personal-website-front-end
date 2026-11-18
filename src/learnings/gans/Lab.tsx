import { useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { Button, Choice, Controls, Readout } from '../../components/explain/figure'
import Coins from './Coins'
import {
  COINS,
  fooled,
  frameAt,
  KINDS,
  LAB_ROUNDS,
  labRun,
  LOSSES,
  mean,
  nearNew,
  one,
  ORIGINAL,
  pct,
  realOf,
  STARTS,
  type Kind,
  type Loss,
  type Start,
} from './model'

// Real milliseconds per round of the game
const PACE = 120

interface Game {
  kind: Kind
  loss: Loss
  start: Start
}

// Play the game: pick the real coins, the forger's loss and its first
// batch, and watch the rounds
export default function Lab() {
  const reducedMotion = usePrefersReducedMotion()
  const [game, setGame] = useState<Game>({ kind: 'One kind', loss: ORIGINAL, start: 'Varied' })
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const last = LAB_ROUNDS - 1

  useAnimationFrame((_, delta) => {
    if (!playing) return
    const next = reducedMotion ? last : Math.min(last, t + delta / PACE)
    setT(next)
    if (next >= last) setPlaying(false)
  })

  // A new setting starts the game over, with the run that goes with it
  const change = (next: Partial<Game>) => {
    setGame({ ...game, ...next })
    setT(0)
    setPlaying(false)
  }

  const run = labRun(game.kind, game.loss, game.start)
  const frame = frameAt(run, t)
  const round = Math.floor(t)
  const real = realOf(game.kind)
  const shown = run[round]

  return (
    <div>
      <Coins
        real={real}
        fakes={frame.fakes}
        cashier={frame.cashier}
        nudges={game.loss}
        label={`Round ${round + 1} of ${LAB_ROUNDS}: the fakes average ${one(mean(frame.fakes))} grams and the cashier gives them ${pct(fooled(shown))} on average.`}
      />
      <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
        <Readout label="Round" value={round + 1} />
        <Readout label="Cashier fooled" value={pct(fooled(shown))} accent />
        {game.kind === 'One kind' ? (
          <Readout label="Average fake" value={`${one(mean(shown.fakes))} g`} />
        ) : (
          <Readout label="Fakes like the 9 g kind" value={`${nearNew(shown.fakes)} of ${COINS}`} />
        )}
      </div>
      <Controls>
        <Choice label="Real coins" options={KINDS} value={game.kind} onChange={(kind) => change({ kind })} />
        <Choice label="Forger’s loss" options={LOSSES} value={game.loss} onChange={(loss) => change({ loss })} />
        <Choice label="First batch" options={STARTS} value={game.start} onChange={(start) => change({ start })} />
      </Controls>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          onClick={() => {
            if (t >= last) setT(0)
            setPlaying(!playing)
          }}
        >
          {playing ? 'Pause' : t >= last ? 'Play again' : 'Play'}
        </Button>
        <Button
          onClick={() => {
            setPlaying(false)
            setT(Math.min(last, round + 1))
          }}
          disabled={t >= last}
        >
          One round
        </Button>
        <Button
          onClick={() => {
            setPlaying(false)
            setT(0)
          }}
          disabled={t === 0}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}
