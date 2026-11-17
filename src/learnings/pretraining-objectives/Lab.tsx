import { Readout } from '../../components/explain/figure'
import { bottomOf, flow, MARGIN, WIDTH } from './layout'
import type { Game } from './model'
import { TileRow } from './Tiles'

// One game on one sentence: what the model reads, what it must write, and
// how many guesses that makes.

const TOP = 22

export default function Lab({ game, label }: { game: Game; label: string }) {
  const input = flow(
    game.input.map((t) => t.text),
    TOP,
  )
  const outTop = bottomOf(input) + 36
  const output = flow(
    game.output.map((t) => t.text),
    outTop,
  )
  const height = bottomOf(output) + 8
  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="mx-auto w-full max-w-[30rem]" role="img" aria-label={label}>
        <text x={MARGIN} y={TOP - 8} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          The model reads
        </text>
        <TileRow tiles={game.input} places={input} />
        <text x={MARGIN} y={outTop - 8} className="fill-zinc-faded font-mono text-[10px] uppercase tracking-widest">
          {game.sees === 'left' ? 'Must write, each word from those before it' : 'Must write, seeing both sides'}
        </text>
        <TileRow tiles={game.output} places={output} />
      </svg>
      <div className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
        <Readout label="Guesses" value={game.guesses} accent />
        <Readout label="Words left as written" value={game.intact} />
        <Readout label="Each guess sees" value={game.sees === 'left' ? 'Left side' : 'Both sides'} />
      </div>
    </div>
  )
}
