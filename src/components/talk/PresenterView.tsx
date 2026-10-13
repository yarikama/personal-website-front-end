import { useEffect, useState } from 'react'
import { formatDuration, next, plannedSeconds, samePosition } from '../../lib/deck'
import Stage from './Stage'
import { useDeck } from './useDeck'
import { sections, type SlideDef } from './talk'

// Within this many seconds of the plan counts as on pace
const PACE_SLACK = 30

const SHORTCUTS = [
  ['→ / Space / PageDown', 'Next'],
  ['← / Shift+Space / PageUp', 'Back'],
  ['Home / End', 'First / last slide'],
  ['F', 'Full screen (audience window)'],
  ['T', 'Light / dark theme'],
]

function Label({ children }: { children: string }) {
  return <p className="font-mono text-sm text-zinc-400 uppercase tracking-widest mb-3">{children}</p>
}

// A clock that starts itself once the talk leaves the first slide
function useTalkClock(started: boolean) {
  const [runStart, setRunStart] = useState<number | null>(null)
  const [banked, setBanked] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (started && runStart === null && banked === 0) setRunStart(Date.now())
  }, [started, runStart, banked])

  const running = runStart !== null
  return {
    seconds: (banked + (running ? now - runStart : 0)) / 1000,
    running,
    toggle: () => {
      if (running) {
        setBanked(banked + Date.now() - runStart)
        setRunStart(null)
      } else {
        setRunStart(Date.now())
      }
    },
    reset: () => {
      setBanked(0)
      setRunStart(null)
    },
  }
}

// Opened from the audience view with P. Shows the clock against the plan,
// the notes, what comes next and an outline to jump around in.
export default function PresenterView({ slides }: { slides: SlideDef[] }) {
  const { pos, steps, go } = useDeck(slides, 'presenter')
  const clock = useTalkClock(pos.index > 0 || pos.step > 0)
  const slide = slides[pos.index]
  const upcoming = next(pos, steps)
  const atEnd = samePosition(upcoming, pos)

  const planned = plannedSeconds(
    pos.index,
    slides.map((s) => s.section),
    sections
  )
  const drift = clock.seconds - planned

  // Keep the current slide in view in the outline
  useEffect(() => {
    document.querySelector('[aria-current="step"]')?.scrollIntoView({ block: 'nearest' })
  }, [pos.index])
  const pace =
    Math.abs(drift) < PACE_SLACK
      ? 'On pace'
      : drift > 0
        ? `${formatDuration(drift)} behind`
        : `${formatDuration(-drift)} ahead`

  return (
    <div className="h-dvh flex flex-col bg-paper text-ink">
      <header className="flex flex-wrap items-center gap-x-8 gap-y-2 px-8 py-4 border-b border-zinc-200 dark:border-zinc-200/30">
        <p className="font-mono text-4xl tabular-nums">{formatDuration(clock.seconds)}</p>
        <div className="font-mono text-sm uppercase tracking-widest">
          <span className="text-zinc-400">Plan {formatDuration(planned)}</span>
          <span className={`ml-4 ${drift >= PACE_SLACK ? 'text-ink font-medium' : 'text-sage'}`}>{pace}</span>
        </div>
        <div className="flex gap-2 font-mono text-sm uppercase tracking-widest">
          <button
            type="button"
            onClick={clock.toggle}
            className="px-3 py-1 border border-zinc-200 dark:border-zinc-200/30 hover:border-sage hover:text-sage transition-colors duration-300"
          >
            {clock.running ? 'Pause' : 'Start'}
          </button>
          <button
            type="button"
            onClick={clock.reset}
            className="px-3 py-1 border border-zinc-200 dark:border-zinc-200/30 hover:border-sage hover:text-sage transition-colors duration-300"
          >
            Reset
          </button>
        </div>
        <p className="ml-auto font-mono text-sm text-zinc-400 uppercase tracking-widest">
          Slide {pos.index + 1} / {slides.length}
          {steps[pos.index] > 0 && ` · Step ${pos.step} / ${steps[pos.index]}`}
        </p>
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-8 p-8">
        <section className="min-h-0 overflow-y-auto flex flex-col gap-6">
          <Stage
            className="relative w-full aspect-video shrink-0 border border-zinc-200 dark:border-zinc-200/30"
            slide={slide}
            index={pos.index}
            step={pos.step}
            total={slides.length}
            animate={false}
          />
          <div className="grid grid-cols-2 gap-6 items-start">
            <div>
              <Label>{upcoming.index === pos.index && !atEnd ? 'Next: reveal' : 'Next'}</Label>
              {atEnd ? (
                <p className="font-serif text-2xl text-zinc-faded">End of talk. Questions.</p>
              ) : (
                <Stage
                  className="relative w-full aspect-video border border-zinc-200 dark:border-zinc-200/30"
                  slide={slides[upcoming.index]}
                  index={upcoming.index}
                  step={upcoming.step}
                  total={slides.length}
                  animate={false}
                />
              )}
            </div>
            <dl className="font-mono text-sm text-zinc-faded space-y-1.5">
              {SHORTCUTS.map(([keys, action]) => (
                <div key={keys} className="flex justify-between gap-4">
                  <dt className="text-zinc-400">{keys}</dt>
                  <dd>{action}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="min-h-0 flex flex-col gap-6">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Label>Notes</Label>
            <p className="font-serif text-3xl font-light tracking-tight mb-4">{slide.title}</p>
            {slide.notes?.length ? (
              <ul className="space-y-3 text-xl leading-relaxed text-ink-light list-disc pl-6 marker:text-sage">
                {slide.notes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-lg text-zinc-400">No notes for this slide.</p>
            )}
          </div>

          <nav className="max-h-[45%] overflow-y-auto border-t border-zinc-200 dark:border-zinc-200/30 pt-4" aria-label="Outline">
            {sections.map((section) => (
              <div key={section.id} className="mb-4">
                <p className="flex justify-between font-mono text-sm text-zinc-400 uppercase tracking-widest mb-1">
                  <span>{section.label}</span>
                  <span>{section.minutes} min</span>
                </p>
                <ol>
                  {slides.map((s, i) =>
                    s.section === section.id ? (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => go({ index: i, step: 0 })}
                          aria-current={i === pos.index ? 'step' : undefined}
                          className={`w-full text-left py-0.5 text-base transition-colors duration-300 hover:text-sage ${
                            i === pos.index ? 'text-sage font-medium' : 'text-zinc-faded'
                          }`}
                        >
                          <span className="inline-block w-8 font-mono text-sm text-zinc-400 tabular-nums">{i + 1}</span>
                          {s.title}
                        </button>
                      </li>
                    ) : null
                  )}
                </ol>
              </div>
            ))}
          </nav>
        </section>
      </main>
    </div>
  )
}
