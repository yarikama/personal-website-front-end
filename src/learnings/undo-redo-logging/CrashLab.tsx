import { usePlay } from '../../components/explain/useLoop'
import {
  eventText,
  recordText,
  type Broken,
  type Crash,
  type Event,
  type LogRecord,
  type RecoveryStep,
} from './model'
import Workbench from './Workbench'

const head = 'font-mono text-[0.8125rem] uppercase tracking-widest text-zinc-faded'

function stepText(step: RecoveryStep): string {
  switch (step.kind) {
    case 'sort':
      return `Committed: ${step.committed.join(', ') || 'none'} · not: ${step.unfinished.join(', ') || 'none'}`
    case 'set': {
      const r = step.record
      return `${step.pass === 'redo' ? 'Redo' : 'Undo'} ${recordText(r)}: ${r.x} = ${step.pass === 'redo' ? r.new : r.old}`
    }
    case 'skip':
      return `Skip ${recordText(step.record)}: ${step.record.t} ${step.pass === 'redo' ? 'did not commit' : 'committed'}`
    case 'abort':
      return `Write <ABORT ${step.t}>`
  }
}

const PASS = { redo: 'Redo pass, oldest record first', undo: 'Undo pass, newest record first' }

function ruleText(b: Broken): string {
  switch (b.rule) {
    case 'U1':
      return `${b.x} reached the disk before the log record that could undo it: that breaks U1.`
    case 'U2':
      return `<COMMIT ${b.t}> reached the disk while ${b.x} was still only in memory: that breaks U2.`
    case 'R1':
      return `${b.x} reached the disk before <COMMIT ${b.t}> did: that breaks R1.`
    case 'UR1':
      return `${b.x} reached the disk before the log record of its change: that breaks UR1.`
  }
}

// Recovery from one crash, played a step at a time: the disk and the log on
// disk as recovery leaves them, the steps so far, and then the verdict.
// Give it a `key` to play again.
export function Recovery({ crash, broke }: { crash: Crash; broke: Broken | null }) {
  const steps = crash.recovery.steps
  const played = usePlay(steps.length, 750)
  const shown = Math.min(steps.length, Math.floor(played) + 1)
  const finished = played >= steps.length
  const current = steps[shown - 1]
  const aborts: LogRecord[] = steps
    .slice(0, shown)
    .flatMap((s) => (s.kind === 'abort' ? [{ kind: 'abort', t: s.t } as LogRecord] : []))
  const snap = { ...crash.at, disk: current.disk }
  const fresh = {
    disk: current.kind === 'set' ? current.record.x : undefined,
    log: current.kind === 'set' || current.kind === 'skip' ? current.at : current.kind === 'abort' ? crash.at.log.length + aborts.length - 1 : undefined,
  }
  const right = crash.wrong.length === 0
  const kept = [...crash.committed]
  const wiped = steps[0].kind === 'sort' ? steps[0].unfinished : []

  return (
    <div>
      <Workbench snap={snap} words="system" crashed fresh={fresh} extraLog={aborts} />
      <p className={`${head} mt-5`}>Recovery</p>
      <ol className="mt-2 space-y-0.5 font-mono text-[0.8125rem]">
        {steps.slice(0, shown).map((step, i) => {
          const pass = step.kind === 'set' || step.kind === 'skip' ? step.pass : null
          const prev = steps[i - 1]
          const newPass = pass && !(prev && (prev.kind === 'set' || prev.kind === 'skip') && prev.pass === pass)
          return (
            <li key={i}>
              {newPass && <p className="mt-2 text-zinc-faded">{PASS[pass]}</p>}
              <p className={`rounded-lg px-2 py-0.5 ${step.kind === 'set' ? 'text-ink' : 'text-zinc-faded'} ${i === shown - 1 && !finished ? 'bg-sage/15' : ''}`}>
                {stepText(step)}
              </p>
            </li>
          )
        })}
      </ol>
      <div className="mt-4 min-h-[3.5rem] text-[0.95rem] leading-relaxed">
        {finished &&
          (right ? (
            <p className="text-sage-ink">
              Right: {kept.length ? `${kept.join(' and ')} kept whole` : 'nothing had committed'}
              {wiped.length ? `, ${wiped.join(' and ')} wiped out` : ''}.
            </p>
          ) : (
            <p className="text-ink">
              Wrong:{' '}
              {crash.wrong.map((x) => `${x} reads ${crash.recovery.disk[x]} but should be ${crash.right[x]}`).join('; ')}.{' '}
              {broke && ruleText(broke)}
            </p>
          ))}
      </div>
    </div>
  )
}

// The order of events, one row each; pick a row to crash right after it.
// Rows after the crash never happened; the row that breaks a rule is marked.
export function Timeline({
  events,
  crash,
  broke,
  onCrash,
}: {
  events: Event[]
  crash: number
  broke: Broken | null
  onCrash: (after: number) => void
}) {
  const marker = (
    <li aria-hidden className="my-1 flex items-center gap-2 px-2">
      <span className="rounded-full bg-ink px-3 py-0.5 font-mono text-[0.75rem] uppercase tracking-widest text-paper">Crash</span>
    </li>
  )
  return (
    <ol className="font-mono text-[0.8125rem]">
      {crash === 0 && marker}
      {events.map((e, i) => {
        const happened = i < crash
        return (
          <li key={i}>
            <button
              onClick={() => onCrash(i + 1)}
              aria-label={`Crash after step ${i + 1}, ${eventText(e)}`}
              className={`flex w-full items-baseline gap-3 rounded-lg px-2 py-1 text-left transition-colors hover:bg-sage/10 ${
                happened ? 'text-ink' : 'text-zinc-faded'
              }`}
            >
              <span className="w-5 shrink-0 text-right tabular-nums text-zinc-faded">{i + 1}</span>
              <span className={`flex-1 ${happened ? '' : 'line-through decoration-zinc-faded/60'}`}>{eventText(e)}</span>
              {broke?.at === i && (
                <span className="shrink-0 rounded-full border border-ink px-2 text-[0.75rem] uppercase tracking-widest text-ink">
                  {broke.rule}
                </span>
              )}
            </button>
            {i + 1 === crash && marker}
          </li>
        )
      })}
    </ol>
  )
}
