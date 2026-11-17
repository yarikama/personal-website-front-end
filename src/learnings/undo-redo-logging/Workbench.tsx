import type { LogRecord, Snapshot } from './model'
import { WORDS, type Words } from './words'

const head = 'font-mono text-[0.8125rem] uppercase tracking-widest text-zinc-faded'

function Value({ name, value, tone }: { name: string; value: number; tone: 'quiet' | 'plain' | 'new' | 'lost' }) {
  const colour =
    tone === 'new' ? 'text-sage-ink' : tone === 'plain' ? 'text-ink' : tone === 'lost' ? 'text-zinc-faded line-through' : 'text-zinc-faded'
  return (
    <div className={`flex justify-between gap-3 rounded-lg px-2 py-1 ${tone === 'new' ? 'bg-sage/15' : ''}`}>
      <span className="text-zinc-faded">{name}</span>
      <span className={`tabular-nums ${colour}`}>{value}</span>
    </div>
  )
}

// What the database holds at one moment: the values in memory (the buffer
// pool) with the log records still there, the values on disk, and the log
// on disk. `crashed` shows memory as lost; `fresh` marks what just changed.
export default function Workbench({
  snap,
  words,
  crashed,
  logged = true,
  fresh = {},
  extraLog = [],
}: {
  snap: Snapshot
  words: Words
  crashed: boolean
  logged?: boolean
  fresh?: { memory?: string; disk?: string; log?: number }
  extraLog?: LogRecord[]
}) {
  const say = WORDS[words]
  const xs = Object.keys(snap.disk)
  const log = [...snap.log, ...extraLog]
  return (
    <div className="grid grid-cols-2 gap-3 font-mono text-[0.8125rem] sm:grid-cols-3">
      <div className={`rounded-xl p-3 ${crashed ? 'border border-dashed border-zinc-300 dark:border-zinc-200/25' : 'bg-paper'}`}>
        <p className={head}>
          {say.memory}
          {crashed && <span className="text-ink"> · {say.lost}</span>}
        </p>
        <div className="mt-2 space-y-0.5">
          {xs.map((x) => (
            <Value
              key={x}
              name={say.name(x)}
              value={snap.memory[x]}
              tone={crashed ? 'lost' : fresh.memory === x ? 'new' : snap.memory[x] !== snap.disk[x] ? 'plain' : 'quiet'}
            />
          ))}
        </div>
        {snap.tail.length > 0 && (
          <div className="mt-3">
            <p className={head}>{say.tail}</p>
            <ul className="mt-1 space-y-0.5 px-2">
              {snap.tail.map((r, i) => (
                <li key={i} className={crashed ? 'text-zinc-faded line-through' : 'text-ink'}>
                  {say.record(r)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-paper p-3">
        <p className={head}>{say.disk}</p>
        <div className="mt-2 space-y-0.5">
          {xs.map((x) => (
            <Value key={x} name={say.name(x)} value={snap.disk[x]} tone={fresh.disk === x ? 'new' : 'plain'} />
          ))}
        </div>
      </div>

      <div className="col-span-2 rounded-xl bg-paper p-3 sm:col-span-1">
        <p className={head}>{say.log}</p>
        {!logged ? (
          <p className="mt-2 px-2 text-zinc-faded">{say.noLog}</p>
        ) : log.length === 0 ? (
          <p className="mt-2 px-2 text-zinc-faded">empty</p>
        ) : (
          <ul className="mt-2 space-y-0.5">
            {log.map((r, i) => (
              <li
                key={i}
                className={`rounded-lg px-2 py-0.5 ${fresh.log === i ? 'bg-sage/15 text-sage-ink' : 'text-ink'}`}
              >
                {say.record(r)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
