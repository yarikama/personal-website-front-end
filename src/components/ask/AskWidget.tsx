import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle, X } from 'lucide-react'
import AskChat from './AskChat'
import { useAskChat } from '../../hooks'

/**
 * The ask chat as a round button in the bottom-right corner of every public
 * page, opening a chat window. It shares the conversation with the home
 * page's Ask section, and the button steps aside while that section is on
 * screen so there are never two chat boxes in view.
 */
export default function AskWidget() {
  const [sectionInView, setSectionInView] = useState(false)
  const { isStreaming, widgetOpen: open, setWidgetOpen: setOpen } = useAskChat()
  const { pathname } = useLocation()

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

  return (
    <>
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
        onClick={() => setOpen((o) => !o)}
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
