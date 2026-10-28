import { Readout } from '../../components/explain/figure'
import { discounted, LONG, route, SHORT, show } from './model'

// Two ways out of a maze, as their rewards one box a move: nothing until
// the exit, which pays 1, and then the end of the episode, drawn as a square
// that pays 0 for ever after. Each box fades as the step it stands for
// counts for less. Under each, what the route is worth at γ.
export default function Routes({ gamma }: { gamma: number }) {
  const rows = [
    { name: 'Short way out', moves: SHORT },
    { name: 'Long way out', moves: LONG },
  ]
  return (
    <div className="space-y-6" role="img" aria-label="Two routes out of a maze as rows of rewards, each ending in a square that pays nothing for ever">
      {rows.map((row, r) => {
        const rewards = route(row.moves)
        return (
          <div key={row.name}>
            <p className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">
              {row.name}: {row.moves} moves
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {rewards.map((reward, i) => (
                <span
                  key={i}
                  className={`flex h-6 w-6 items-center justify-center font-mono text-[0.75rem] ${
                    reward > 0 ? 'bg-sage text-paper' : 'border border-zinc-300 text-zinc-400 dark:border-zinc-200/25'
                  }`}
                  style={reward > 0 ? undefined : { opacity: 0.3 + 0.7 * gamma ** i }}
                >
                  {reward}
                </span>
              ))}
              <span className="h-6 w-6 bg-ink" title="The end of the episode" />
              <span className="font-mono text-[0.75rem] text-zinc-400">0 0 0 …</span>
            </div>
            <p className="mt-2 font-mono text-[0.8rem] text-ink">
              {gamma === 1 ? (
                '1'
              ) : (
                <>
                  {gamma}
                  <sup>{row.moves - 1}</sup> × 1
                </>
              )}{' '}
              ={' '}
              <span className={r === 0 ? 'text-sage' : undefined}>{show(discounted(rewards, gamma))}</span>
            </p>
          </div>
        )
      })}
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <Readout label="Short way, worth" value={show(discounted(route(SHORT), gamma))} accent />
        <Readout label="Long way, worth" value={show(discounted(route(LONG), gamma))} />
      </div>
    </div>
  )
}
