import { usePlay } from '../../components/explain/useLoop'
import { LIKELIEST_TEXT, OPENING, PERSON_TEXT, scientific, totalOf, type Written } from './model'

// The largest chance in either text sets the bars' full width
const FULL = Math.max(...LIKELIEST_TEXT.map((w) => w.p), ...PERSON_TEXT.map((w) => w.p))

function Column({ title, written, tone, shown }: { title: string; written: Written[]; tone: 'ink' | 'sage'; shown: number }) {
  return (
    <div>
      <p className="font-mono text-[0.875rem] uppercase tracking-widest text-zinc-faded">{title}</p>
      <ol className="mt-3 space-y-3">
        {written.map((w, i) => (
          <li key={i} className={`transition-opacity duration-300 ${i < shown ? 'opacity-100' : 'opacity-0'}`} aria-hidden={i >= shown}>
            <p className="font-serif text-lg leading-snug text-ink">{w.text}</p>
            <div className="mt-1 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-300">
                <div
                  className={`h-2 rounded-full ${tone === 'ink' ? 'bg-ink' : 'bg-sage'}`}
                  style={{ width: `${Math.max(1.5, (w.p / FULL) * 100)}%` }}
                />
              </div>
              <span className="w-12 text-right font-mono text-[0.875rem] tabular-nums text-ink">{w.p.toFixed(3)}</span>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 font-mono text-[0.875rem] text-zinc-faded">
        All four: <span className="text-ink">{scientific(totalOf(written))}</span>
      </p>
    </div>
  )
}

// One opening, two ways to go on, four sentences each, with the toy model's
// chance for each sentence after the ones before it. The sentences appear
// one at a time.
export default function Echo() {
  const shown = usePlay(LIKELIEST_TEXT.length, 650)
  return (
    <div>
      <p className="font-serif text-xl leading-snug text-ink">{OPENING}</p>
      <div className="mt-6 grid gap-8 sm:grid-cols-2">
        <Column title="The likeliest next sentence, each time" written={LIKELIEST_TEXT} tone="ink" shown={shown} />
        <Column title="What a person might write" written={PERSON_TEXT} tone="sage" shown={shown} />
      </div>
    </div>
  )
}
