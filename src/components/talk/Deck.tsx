import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Moon, Presentation, Sun } from 'lucide-react'
import { setDark, useIsDark } from '../../lib/theme'
import Stage from './Stage'
import { openPresenter, toggleFullscreen, useDeck } from './useDeck'
import type { SlideDef } from './talk'

// Controls and the cursor fade out after this long without the mouse moving
const IDLE_MS = 2500

function ControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="p-2 text-zinc-faded hover:text-sage transition-colors duration-300"
    >
      {children}
    </button>
  )
}

// The audience view: one slide filling the window, driven by the keyboard,
// a clicker or the presenter window
export default function Deck({ slides }: { slides: SlideDef[] }) {
  const { pos, forward, back } = useDeck(slides, 'audience')
  const isDark = useIsDark()
  const [idle, setIdle] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const idleTimer = useRef(0)

  const wake = () => {
    setIdle(false)
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_MS)
  }

  useEffect(() => {
    idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_MS)
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      window.clearTimeout(idleTimer.current)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [])

  return (
    <div className={`fixed inset-0 bg-paper text-ink ${idle ? 'cursor-none' : ''}`} onMouseMove={wake}>
      <Stage className="absolute inset-0" slide={slides[pos.index]} index={pos.index} step={pos.step} total={slides.length} />

      <div
        className={`
          fixed bottom-4 right-4 flex items-center bg-paper border border-zinc-200 dark:border-zinc-200/30
          transition-opacity duration-500 ease-elegant
          ${idle ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        `}
      >
        <ControlButton label="Previous (←)" onClick={back}>
          <ChevronLeft size={18} aria-hidden="true" />
        </ControlButton>
        <span className="font-mono text-sm text-zinc-faded tabular-nums px-1">
          {pos.index + 1} / {slides.length}
        </span>
        <ControlButton label="Next (→)" onClick={forward}>
          <ChevronRight size={18} aria-hidden="true" />
        </ControlButton>
        <span className="w-px h-5 bg-zinc-200 dark:bg-zinc-200/30 mx-1" aria-hidden="true" />
        <ControlButton label="Presenter view (P)" onClick={openPresenter}>
          <Presentation size={18} aria-hidden="true" />
        </ControlButton>
        <ControlButton label={fullscreen ? 'Exit full screen (F)' : 'Full screen (F)'} onClick={toggleFullscreen}>
          {fullscreen ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
        </ControlButton>
        <ControlButton label={isDark ? 'Light theme (T)' : 'Dark theme (T)'} onClick={() => setDark(!isDark)}>
          {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </ControlButton>
      </div>
    </div>
  )
}
