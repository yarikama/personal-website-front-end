import { useMemo, useRef, useState } from 'react'
import { Button, Choice, Controls, Readout } from '../../components/explain/figure'
import { seeded } from '../../components/explain/random'
import { learnAll, meanMiss, playGame, PLAY_SEED, SQUARES, TRUE, type Game } from './model'
import Track, { type Note } from './Track'

const COUNTING = ['every visit', 'first visit'] as const
const SHOWING = ['your averages', 'the true values'] as const

// Play games yourself and watch each square's average: only the squares a
// game stood on change. Count every visit to a square or only the first in
// each game, on the same games; and compare with the board's true answer.
export default function Play() {
  const random = useRef(seeded(PLAY_SEED))
  const [games, setGames] = useState<Game[]>([])
  const [counting, setCounting] = useState<(typeof COUNTING)[number]>('every visit')
  const [showing, setShowing] = useState<(typeof SHOWING)[number]>('your averages')

  const firstVisit = counting === 'first visit'
  const estimates = useMemo(() => learnAll(games, firstVisit), [games, firstVisit])
  const last = games[games.length - 1]
  const most = Math.max(1, ...SQUARES.map((square) => estimates[square].count))

  const play = (count: number) =>
    setGames((before) => [...before, ...Array.from({ length: count }, () => playGame(random.current))])
  const restart = () => {
    random.current = seeded(PLAY_SEED)
    setGames([])
  }

  const truth = showing === 'the true values'
  const notes: Record<number, Note> = Object.fromEntries(
    SQUARES.map((square) => {
      const { mean, count } = estimates[square]
      const note: Note = truth
        ? { main: TRUE[square].toFixed(1), sub: 'true' }
        : count
          ? { main: mean.toFixed(1), sub: `n = ${count}`, accent: last?.includes(square), tint: count / most }
          : { main: '–', sub: 'n = 0' }
      return [square, note]
    })
  )
  const fewest = SQUARES.reduce((a, b) => (estimates[b].count < estimates[a].count ? b : a))

  return (
    <div>
      <Track
        label={
          truth
            ? 'The true number of turns left from each square'
            : `Each square’s average number of turns left after ${games.length} games`
        }
        notes={notes}
        trail={truth ? [] : (last ?? [])}
      />
      <Controls>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => play(1)}>Play a game</Button>
          <Button onClick={() => play(100)}>Play 100</Button>
          <Button onClick={restart} disabled={!games.length}>
            Start over
          </Button>
        </div>
        <Choice label="Count" options={COUNTING} value={counting} onChange={setCounting} />
        <Choice label="Show" options={SHOWING} value={showing} onChange={setShowing} />
      </Controls>
      <Controls>
        <Readout label="Games" value={games.length.toLocaleString('en-US')} />
        <Readout label="Average miss, in turns" value={games.length ? meanMiss(estimates).toFixed(2) : '–'} accent />
        <Readout label="Fewest counts" value={`${estimates[fewest].count} on ${fewest}`} />
      </Controls>
    </div>
  )
}
