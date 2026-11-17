import { useState } from 'react'
import { Choice, Controls } from '../../components/explain/figure'
import { best, oneIn, SCORED, scoreOf, SCORES, TO_TRANSLATE, type Score } from './model'

// The candidate English lines for one French line, each with a bar for the
// chosen score: the translation model, the language model, or their
// product. The best of them is sage.
export default function Channel() {
  const [score, setScore] = useState<Score>('Both')
  const values = SCORED.map((row) => scoreOf(row, score))
  const top = Math.max(...values)
  const winners = best(score)
  return (
    <div>
      <p className="mb-4 font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">
        Translating “{TO_TRANSLATE.join(' ')}”
      </p>
      <ul className="space-y-3" aria-label={`Scores by ${score}`}>
        {SCORED.map((row, k) => {
          const won = winners.includes(row.english)
          return (
            <li key={row.english} className="grid grid-cols-[7.5rem_1fr] items-center gap-x-3 gap-y-1 sm:grid-cols-[8.5rem_1fr_9rem]">
              <span className="font-mono text-[0.95rem] text-ink">{row.english}</span>
              <span className="h-4 rounded-full bg-ink/10">
                <span
                  className={`block h-4 rounded-full ${won ? 'bg-sage' : 'bg-ink/45'}`}
                  style={{ width: `${top > 0 ? (100 * values[k]) / top : 0}%`, minWidth: values[k] > 0 ? '0.25rem' : 0 }}
                />
              </span>
              <span className={`col-start-2 font-mono text-[0.875rem] tabular-nums sm:col-start-3 sm:text-right ${won ? 'text-ink' : 'text-zinc-faded'}`}>
                {oneIn(values[k])}
                {won ? ' · best' : ''}
              </span>
            </li>
          )
        })}
      </ul>
      <Controls>
        <Choice label="Score by" options={SCORES} value={score} onChange={setScore} />
      </Controls>
    </div>
  )
}
