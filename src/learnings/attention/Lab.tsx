import Grid from './Grid'
import { hardRow, PAIRS, pct, WEIGHTS, type PairName } from './model'

// A sentence pair's attention grid, with one English word picked: what that
// step's context is made of, soft (every word, by its weight) or hard (only
// the word with the most)
export default function Lab({ pair, step, hard }: { pair: PairName; step: number; hard: boolean }) {
  const { source, target } = PAIRS[pair]
  const weights = hard ? WEIGHTS[pair].map(hardRow) : WEIGHTS[pair]
  const row = weights[step] ?? weights[0]
  const parts = row
    .map((w, j) => ({ w, word: source[j] }))
    .filter(({ w }) => w > 0)
    .sort((a, b) => b.w - a.w)

  return (
    <>
      <Grid source={source} target={target} weights={weights} shown={target.map(() => 1)} focus={step} tops />
      <p className="mt-4 text-center font-mono text-[0.875rem] leading-relaxed text-ink">
        <span className="text-zinc-faded">Writing “{target[step]}”, the context mixes </span>
        {parts.map(({ w, word }, k) => (
          <span key={word} className="whitespace-nowrap">
            {k > 0 && ' + '}
            {pct(w)} {word}
          </span>
        ))}
      </p>
    </>
  )
}
