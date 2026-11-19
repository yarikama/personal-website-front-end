import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle, X } from 'lucide-react'
import AskChat from './AskChat'
import { markTeaserSeen, TEASER_DELAY_MS, TEASER_QUESTIONS, teaserSeen } from './askTeaser'
import { useAskChat } from '../../hooks'

/**
 * The ask chat as a round button in the bottom-right corner of every public
 * page, opening a chat window. It shares the conversation with the home
 * page's Ask section, and the button steps aside while that section is on
 * screen so there are never two chat boxes in view. On a first visit a
 * bubble beside the button says what it is, with two questions to try.
 */
export default function AskWidget() {
  const [sectionInView, setSectionInView] = useState(false)
  const [teaser, setTeaser] = useState(false)
  const { turns, ask, isStreaming, widgetOpen: open, setWidgetOpen: setOpen } = useAskChat()
  const { pathname } = useLocation()

  // A first visit: the bubble comes in once the page has settled, and is
  // remembered at once, so it shows to each browser only once.
  useEffect(() => {
    if (teaserSeen()) return
    const timer = window.setTimeout(() => {
      markTeaserSeen()
      setTeaser(true)
    }, TEASER_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const askFromTeaser = (question: string) => {
    setTeaser(false)
    setOpen(true)
    if (!isStreaming) ask(question)
  }

  // Watch the home page's Ask section, when the page has one.
  useEffect(() => {
    setSectionInView(false)
    const section = document.getElementById('ask')
    if (!section) return
    const observer = new IntersectionObserver(
      ([entry]) => setSectionInView(entry.isIntersecting),
      { threshold: 0.25 }
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [pathname])

  // Moving to another page keeps the window as it was; Escape closes it.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const hidden = sectionInView && !open
  // Gone once the chat has been opened or anything asked: its job is done.
  const showTeaser = teaser && !open && !hidden && turns.length === 0

  return (
    <>
      {showTeaser && (
        <aside
          aria-label="Ask about me"
          // Above the button, its tail pointing at it. Fades in where motion
          // is welcome.
          className="fixed z-50 right-4 bottom-[11.5rem] sm:right-6 sm:bottom-[9.5rem] w-[min(320px,calc(100vw-2rem))]
            flex flex-col gap-3 rounded-[22px] bg-white dark:bg-[#1c1c1c] pl-5 pr-4 py-4
            shadow-[0_16px_40px_rgba(26,26,26,0.14),0_2px_6px_rgba(26,26,26,0.06)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.55)]
            transition-[opacity,translate] duration-300 starting:opacity-0 starting:translate-y-2 motion-reduce:transition-none"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-serif text-[22px] font-semibold leading-tight">Ask about me</p>
              <p className="text-sm leading-snug text-zinc-faded mt-1">
                A small model on my home server answers from this site. Try one:
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTeaser(false)}
              aria-label="Dismiss"
              className="shrink-0 -mt-1.5 -mr-1.5 w-10 h-10 rounded-full flex items-center justify-center text-zinc-faded hover:text-ink hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col items-start gap-2">
            {TEASER_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => askFromTeaser(q)}
                className="min-h-10 rounded-full bg-paper-dark dark:bg-zinc-800 px-3.5 py-2 text-left font-mono text-[13px] tracking-normal text-sage-ink hover:text-ink transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
          <span
            aria-hidden="true"
            className="absolute right-5 -bottom-[7px] w-4 h-4 rotate-45 rounded-[3px] bg-white dark:bg-[#1c1c1c]"
          />
        </aside>
      )}

      {open && (
        <div
          id="ask-widget"
          role="dialog"
          aria-label="Ask about me"
          // Phones: most of the screen, between the header and the footer
          // bar. Wider screens: a window above the button.
          className="fixed z-50 left-3 right-3 top-20 bottom-44
            sm:left-auto sm:top-auto sm:right-6 sm:bottom-40 sm:w-[400px] sm:h-[min(600px,calc(100dvh-14rem))]
            flex flex-col rounded-3xl border border-zinc-200 dark:border-zinc-700
            bg-paper dark:bg-[#0f0f0f] shadow-2xl overflow-hidden"
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-zinc-200 dark:border-zinc-700">
            <div>
              <p className="font-serif text-xl">Ask about me</p>
              <p className="text-xs text-zinc-faded mt-0.5">
                A small model on my home server, answering from this site. It can be wrong.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-zinc-faded hover:text-ink hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <AskChat className="flex-1 min-h-0" compact autoFocus />
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setTeaser(false)
          setOpen((o) => !o)
        }}
        aria-label={open ? 'Close the chat' : 'Ask about me'}
        aria-expanded={open}
        aria-controls="ask-widget"
        title="Ask about me"
        // Above the fixed footer bar, which is taller on phones (two rows).
        className={`fixed z-50 right-4 bottom-28 sm:right-6 sm:bottom-20 w-14 h-14 rounded-full
          flex items-center justify-center bg-sage text-paper shadow-lg
          hover:scale-105 active:scale-95 transition-[transform,opacity] duration-300
          ${hidden ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100'}`}
        tabIndex={hidden ? -1 : 0}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {/* An answer is still coming in while the window is closed */}
        {!open && isStreaming && (
          <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-paper border-2 border-sage animate-pulse" />
        )}
      </button>
    </>
  )
}
