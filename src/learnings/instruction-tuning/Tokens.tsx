import { two, type Scored } from './model'

// A conversation as the model reads it, one chip per token. Sage chips count
// toward the loss, each with its surprise under it; dashed chips are read but
// not scored. `shown` cuts the row short, for a figure that types it out.
export default function Tokens({
  tokens,
  costs = true,
  shown = Infinity,
}: {
  tokens: Scored[]
  costs?: boolean
  shown?: number
}) {
  return (
    <ul className="flex flex-wrap gap-1.5 font-mono" aria-hidden>
      {tokens.slice(0, shown).map((t, i) => (
        <li
          key={i}
          className={`flex min-w-[2.25rem] flex-col items-center rounded-lg border px-2 py-1 text-ink ${
            t.scored ? 'border-sage bg-sage/15' : 'border-dashed border-zinc-300 bg-paper dark:border-zinc-400'
          }`}
        >
          <span className={t.tag ? 'text-[0.75rem] leading-5' : 'text-[0.875rem] leading-5'}>{t.text}</span>
          {costs && (
            <span className={`text-[0.75rem] tabular-nums ${t.scored ? 'text-ink' : 'text-zinc-faded'}`}>
              {t.cost === null ? '—' : two(t.cost)}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
