import { usePlay } from '../../components/explain/useLoop'
import { money, STORY_NUMBERS, total, TRANSFER, type Frame } from './model'
import Workbench from './Workbench'
import { WORDS, type Words } from './words'

// One sentence for what a frame shows, in the story's words or the system's
function caption(f: Frame, words: Words): string {
  const name = WORDS[words].name
  const story = words === 'story'
  if (f.step?.kind === 'set') {
    const { x } = f.step.record
    const value = f.step.disk[x]
    if (f.step.pass === 'undo') return story ? `No “done”: put ${name(x)} back to ${value}` : `Undo: ${x} = ${value}`
    return story ? `“Done” is there: copy ${name(x)} = ${value}` : `Redo: ${x} = ${value}`
  }
  if (f.crashed) return story ? 'Fire alarm! The scratch pad is lost' : 'Crash: memory is wiped'
  const e = f.event
  if (!e) return story ? `Ready to move ${money(TRANSFER.amount)}` : 'Ready'
  if (e.kind === 'write') {
    if (!story) return `WRITE(${e.x}, ${e.value})`
    const noted = f.logging === 'Undo' ? ' after noting the old one' : f.logging === 'Redo' ? ' and note it' : ''
    return `Work out ${name(e.x)} = ${e.value}${noted}`
  }
  if (e.kind === 'output') return story ? `Ink ${name(e.x)}: ${f.snap.disk[e.x]}` : `OUTPUT(${e.x})`
  if (e.kind === 'commit') return story ? 'Note “done”' : `COMMIT ${e.t}`
  return ''
}

// A story step of the ledger: plays its frames one after another, the first
// being where it starts from. Give it a `key` to play again.
export default function Ledger({ frames, words, pace = 1100 }: { frames: Frame[]; words: Words; pace?: number }) {
  const played = usePlay(frames.length - 1, pace)
  const f = frames[Math.min(frames.length - 1, Math.floor(played))]
  const sum = total(f.snap.disk)
  const short = sum !== STORY_NUMBERS.before
  const fresh = {
    memory: f.event?.kind === 'write' ? f.event.x : undefined,
    disk: f.event?.kind === 'output' ? f.event.x : f.step?.kind === 'set' ? f.step.record.x : undefined,
    log: f.event && (f.event.kind === 'write' || f.event.kind === 'commit') ? f.snap.log.length - 1 : undefined,
  }
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-[0.875rem] uppercase tracking-widest">
        <span className={f.crashed && !f.step ? 'text-ink' : 'text-zinc-faded'}>{caption(f, words)}</span>
        <span className={short ? 'text-ink' : 'text-zinc-faded'}>
          {WORDS[words].disk} total {money(sum)}
          {short && ` · ${money(STORY_NUMBERS.before - sum)} missing`}
        </span>
      </div>
      <div className="mt-4">
        <Workbench snap={f.snap} words={words} crashed={f.crashed} logged={f.logging !== 'None'} fresh={fresh} />
      </div>
    </div>
  )
}
