import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'
import { percent, PRIOR, VERBALIZER, type Example, type Label, type Note, type Prediction } from './model'

// The story's skate shop: notes taped above two trays, a note to sort, the
// temp's lean between the trays, and the note dropping into one of them.

export interface Scene {
  // The notes taped above the trays
  taped: Example[]
  // The note to sort, and how the temp leans on it
  note: Note
  lean: Prediction
  // Whether the tray it lands in is the right one
  right: boolean
  // Show what the temp knows instead of a note
  knows?: boolean
  // Name everything as the language model it stands for
  revealed?: boolean
  // Show how the temp is reading the notes
  reading?: boolean
  // A caption above the shop
  title: string
}

// Seconds: the lean fills, then the note drops
const FILL_FROM = 0.4
const FILL_FOR = 1.1
const DROP_FROM = 1.9
const DROP_FOR = 0.6

const clamp = (x: number) => Math.max(0, Math.min(1, x))
const ease = (x: number) => 1 - (1 - x) ** 3

export default function Shop({ scene }: { scene: Scene }) {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [seconds, setSeconds] = useState(reducedMotion ? Infinity : 0)

  useAnimationFrame((time) => {
    if (seconds > DROP_FROM + DROP_FOR) return
    started.current ??= time
    setSeconds((time - started.current) / 1000)
  })

  const { taped, note, lean, right, knows, revealed, reading, title } = scene
  const fill = ease(clamp((seconds - FILL_FROM) / FILL_FOR))
  const drop = ease(clamp((seconds - DROP_FROM) / DROP_FOR))
  const landed = drop >= 1
  const praise = lean.label === 'praise'
  const trayName = (label: Label) =>
    revealed ? `“${VERBALIZER[label]}”` : label === 'praise' ? 'Praise' : 'Complaints'

  return (
    <div className="mx-auto max-w-[36rem] overflow-hidden font-mono text-[0.875rem]">
      <p className="uppercase tracking-widest text-zinc-faded">{title}</p>

      {/* What is taped up: the prompt's examples */}
      <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-400 p-3">
        <p className="text-[0.75rem] uppercase tracking-widest text-zinc-faded">
          {knows ? 'Everything the temp has read' : revealed ? `The prompt: ${taped.length} examples` : 'Taped above the trays'}
        </p>
        {knows ? (
          <Knows />
        ) : taped.length === 0 ? (
          <p className="mt-2 text-zinc-faded">Nothing taped up</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {taped.map((e) => (
              <li key={e.text} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-xl bg-sage/15 px-3 py-2 text-ink">
                <span>{revealed ? `${e.text} It was ${VERBALIZER[e.label]}!` : e.text}</span>
                {!revealed && <span className="text-[0.75rem] uppercase tracking-widest">→ {trayName(e.label)}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!knows && (
        <>
          {/* Who sorts, and how they lean */}
          <div className="mt-5 flex items-baseline justify-between gap-3">
            <span className="uppercase tracking-widest text-zinc-faded">{revealed ? 'Frozen language model' : 'The temp leans'}</span>
            <span className="tabular-nums text-ink">
              {percent(lean.great * fill)} {revealed ? 'great' : 'praise'}
            </span>
          </div>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-paper border border-zinc-300 dark:border-zinc-400" aria-hidden>
            <div className="h-full bg-sage" style={{ width: `${lean.great * fill * 100}%` }} />
            <div className="h-full bg-ink/35" style={{ width: `${lean.terrible * fill * 100}%` }} />
          </div>
          {reading && (
            <p className="mt-2 text-[0.75rem] text-zinc-faded">
              Reading the notes as skater talk: {percent(lean.reading.skate)}
              {taped.length > 0 && ` (with nothing taped up, ${percent(PRIOR.skate)})`}
            </p>
          )}

          {/* The note on its way down */}
          <div className="relative mt-4 h-12">
            {!landed && (
              <div
                className="absolute top-0 w-max max-w-full rounded-xl border border-ink bg-paper px-3 py-2 text-ink"
                style={{
                  // From the middle toward the middle of its tray
                  left: `${50 + (praise ? -25 : 25) * drop}%`,
                  transform: `translate(-50%, ${drop * 3.5}rem)`,
                }}
              >
                {revealed ? `${note.text} It was …` : note.text}
              </div>
            )}
          </div>

          {/* The two trays */}
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(['praise', 'complaint'] as Label[]).map((label) => {
              const here = landed && lean.label === label
              return (
                <div
                  key={label}
                  className={`min-h-[5.5rem] rounded-2xl border-2 p-3 ${
                    here ? (label === 'praise' ? 'border-sage' : 'border-ink') : 'border-zinc-300 dark:border-zinc-400'
                  }`}
                >
                  <p className="uppercase tracking-widest text-zinc-faded">{trayName(label)}</p>
                  {here && (
                    <p className="mt-2 text-ink">
                      {note.text}
                      <span className="mt-1 block text-[0.75rem] uppercase tracking-widest">
                        {right ? 'Right' : 'Wrong'} {revealed ? 'label' : 'tray'}
                      </span>
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// What the temp already knows: one word, two kinds of English
function Knows() {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      {(
        [
          ['Everyday English', `${Math.round(PRIOR.everyday * 20)} pages in 20 they read`, '“sick” is bad news'],
          ['Skater talk', `${Math.round(PRIOR.skate * 20)} page in 20`, '“sick” means brilliant'],
        ] as const
      ).map(([name, share, sense]) => (
        <div key={name} className="rounded-xl border border-zinc-300 dark:border-zinc-400 bg-paper p-3">
          <p className="text-[0.75rem] uppercase tracking-widest text-zinc-faded">{name}</p>
          <p className="mt-1 text-[0.75rem] text-zinc-faded">{share}</p>
          <p className="mt-2 text-ink">{sense}</p>
        </div>
      ))}
    </div>
  )
}
