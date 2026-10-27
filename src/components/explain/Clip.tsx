import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { usePrefersReducedMotion } from '../../hooks'
import { useIsDark } from '../../lib/theme'
import { Figure } from './figure'

type State = 'waiting' | 'playing' | 'paused' | 'ended'

const ACTION: Record<State, { icon: typeof Play; label: string }> = {
  waiting: { icon: Play, label: 'Play' },
  playing: { icon: Pause, label: 'Pause' },
  paused: { icon: Play, label: 'Play' },
  ended: { icon: RotateCcw, label: 'Replay' },
}

// A short animation rendered with ManimGL (manim/scenes/<slug>.py, by
// manim/render.sh): a formula built a piece at a time, or a derivation, which
// a still figure could only show finished. `src` is "<slug>/<clip>", served
// from public/learnings/ in a light and a dark version, each with a poster
// of its last frame. It plays once when it scrolls into view; with reduced
// motion it shows the poster, the whole result, until asked to play.
// `label` says in words what it shows, for screen readers.
export function Clip({ src, label, caption }: { src: string; label: string; caption: ReactNode }) {
  const dark = useIsDark()
  const reducedMotion = usePrefersReducedMotion()
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<State>('waiting')
  const file = `/learnings/${src}-${dark ? 'dark' : 'light'}`

  // Play the first time it is mostly on screen; again after the theme
  // changes, since that swaps the video
  useEffect(() => {
    const element = video.current
    if (!element || reducedMotion) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        element.play().catch(() => {
          // Autoplay refused (a power saver, say): the button still plays it
        })
      },
      { threshold: 0.6 }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [file, reducedMotion])

  const toggle = () => {
    const element = video.current
    if (!element) return
    if (!element.paused) return element.pause()
    if (element.ended) element.currentTime = 0
    element.play().catch(() => {})
  }

  const { icon: Icon, label: action } = ACTION[state]
  return (
    <Figure caption={caption}>
      <div className="relative">
        <video
          key={file}
          ref={video}
          src={`${file}.mp4`}
          poster={`${file}.jpg`}
          muted
          playsInline
          preload="metadata"
          aria-label={label}
          onClick={toggle}
          onPlay={() => setState('playing')}
          onPause={(event) => setState(event.currentTarget.ended ? 'ended' : 'paused')}
          onEnded={() => setState('ended')}
          onLoadStart={() => setState('waiting')}
          className="block aspect-video w-full cursor-pointer"
        />
        <button
          onClick={toggle}
          className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 border border-zinc-300 dark:border-zinc-200/20 bg-paper/80 px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-widest text-zinc-faded backdrop-blur-sm transition-colors hover:text-ink"
        >
          <Icon size={12} aria-hidden /> {action}
        </button>
      </div>
    </Figure>
  )
}
