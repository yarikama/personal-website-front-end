import {
  EXAMPLES,
  GREAT_AFTER,
  line,
  pattern,
  percent,
  predict,
  PRIOR,
  READING_NAMES,
  READINGS,
  VERBALIZER,
  WEIGHT_COUNT,
  WORDS,
  type Example,
  type Note,
} from './model'

// The weights as they were when the page loaded, to count any that moved
const LOADED = JSON.stringify({ PRIOR, GREAT_AFTER })
const moved = () => (JSON.stringify({ PRIOR, GREAT_AFTER }) === LOADED ? 0 : WEIGHT_COUNT)

const heading = 'text-[0.75rem] uppercase tracking-widest text-zinc-faded'
const box = 'rounded-2xl border border-zinc-300 dark:border-zinc-400 p-3 sm:p-4'

// The stand-in opened up: pick the examples in the prompt and the note to
// sort; see the prompt it reads, its next word, how it reads the prompt,
// and its fourteen weights, which never move.
export default function Lab({
  chosen,
  onToggle,
  note,
}: {
  chosen: Example[]
  onToggle: (example: Example) => void
  note: Note
}) {
  // Examples go into the prompt in the order they are listed
  const examples = EXAMPLES.filter((e) => chosen.includes(e))
  const next = predict(examples, note)

  return (
    <div className="flex flex-col gap-4 font-mono text-[0.875rem]">
      <div>
        <p className={heading}>Examples to put in the prompt</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => {
            const on = chosen.includes(e)
            return (
              <button
                key={e.text}
                aria-pressed={on}
                onClick={() => onToggle(e)}
                className={`rounded-xl border px-3 py-1.5 text-left transition-colors ${
                  on ? 'border-sage bg-sage/15 text-ink' : 'border-zinc-300 dark:border-zinc-400 text-zinc-faded hover:text-ink'
                }`}
              >
                {e.text} → {VERBALIZER[e.label]}
              </button>
            )
          })}
        </div>
      </div>

      <div className={box}>
        <p className={heading}>
          What the model reads ({examples.length === 0 ? 'zero' : examples.length === 1 ? 'one' : 'few'}-shot)
        </p>
        <div className="mt-2 flex flex-col gap-1 text-ink">
          {examples.map((e) => (
            <p key={e.text}>{line(e)}</p>
          ))}
          <p>
            {pattern(note)} <span className="text-sage-ink">___</span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={box}>
          <p className={heading}>Its next word</p>
          {(['great', 'terrible'] as const).map((w) => {
            const p = next[w]
            const wins = VERBALIZER[next.label] === w
            return (
              <div key={w} className="mt-3">
                <div className="flex justify-between">
                  <span className="text-ink">
                    {w}
                    {wins && <span className="text-sage-ink"> ← picked</span>}
                  </span>
                  <span className="tabular-nums text-ink">{percent(p)}</span>
                </div>
                <div className="mt-1 h-2.5 rounded-full bg-paper border border-zinc-300 dark:border-zinc-400 overflow-hidden">
                  <div className={`h-full ${w === 'great' ? 'bg-sage' : 'bg-ink/35'}`} style={{ width: `${p * 100}%` }} />
                </div>
              </div>
            )
          })}
          <p className="mt-4 text-zinc-faded">Reading the prompt as</p>
          {READINGS.map((r) => (
            <div key={r} className="mt-1 flex justify-between gap-3">
              <span className="text-ink">{READING_NAMES[r]}</span>
              <span className="tabular-nums text-ink">{percent(next.reading[r])}</span>
            </div>
          ))}
        </div>

        <div className={box}>
          <p className={heading}>Its weights: P(great | word)</p>
          <table className="mt-2 w-full tabular-nums">
            <thead>
              <tr className="text-zinc-faded">
                <th className="py-1 text-left font-normal">word</th>
                <th className="py-1 text-right font-normal">everyday</th>
                <th className="py-1 text-right font-normal">skater</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              {WORDS.map((w) => (
                <tr key={w} className={w === note.word ? 'text-sage-ink' : undefined}>
                  <td className="py-0.5">{w}</td>
                  {READINGS.map((r) => (
                    <td key={r} className="py-0.5 text-right">
                      {GREAT_AFTER[w][r].toFixed(1)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="pt-2 text-zinc-faded">share read</td>
                {READINGS.map((r) => (
                  <td key={r} className="pt-2 text-right">
                    {PRIOR[r].toFixed(2)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-ink">
            Weights changed: {moved()} of {WEIGHT_COUNT}
          </p>
        </div>
      </div>
    </div>
  )
}
