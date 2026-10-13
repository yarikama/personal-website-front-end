import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { setDark } from '../../lib/theme'
import { START, formatHash, last, next, parseHash, prev, samePosition, type Position } from '../../lib/deck'
import type { SlideDef } from './talk'

// The audience view and the presenter window keep each other in step over
// this channel; either one can drive the talk
const CHANNEL = 'talk-deck'

type Message = { type: 'go'; pos: Position } | { type: 'hello' }

const isPosition = (value: unknown): value is Position =>
  typeof value === 'object' &&
  value !== null &&
  Number.isInteger((value as Position).index) &&
  Number.isInteger((value as Position).step)

// The browser can refuse (an embedded frame, a blocked permission); the
// deck then simply stays in the window
export function toggleFullscreen() {
  const change = document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen()
  change.catch(() => {})
}

export function openPresenter() {
  window.open(`/talk/presenter${window.location.hash}`, 'talk-presenter', 'popup,width=1280,height=800')
}

export function useDeck(slides: SlideDef[], role: 'audience' | 'presenter') {
  const steps = useMemo(() => slides.map((slide) => slide.steps ?? 0), [slides])
  const [pos, setPos] = useState(() => parseHash(window.location.hash, steps))
  const posRef = useRef(pos)
  const channelRef = useRef<BroadcastChannel | null>(null)

  // Show `target`, keep the URL on it so a reload stays put, and tell the
  // other window unless it was the one that asked
  const show = useCallback((target: Position, broadcast: boolean) => {
    if (samePosition(target, posRef.current)) return
    posRef.current = target
    setPos(target)
    window.history.replaceState(null, '', formatHash(target))
    if (broadcast) channelRef.current?.postMessage({ type: 'go', pos: target } satisfies Message)
  }, [])

  const go = useCallback((target: Position) => show(target, true), [show])
  const forward = useCallback(() => go(next(posRef.current, steps)), [go, steps])
  const back = useCallback(() => go(prev(posRef.current, steps)), [go, steps])

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL)
    channelRef.current = channel
    channel.onmessage = (event: MessageEvent<Message>) => {
      const message = event.data
      if (message?.type === 'go' && isPosition(message.pos)) {
        show(parseHash(formatHash(message.pos), steps), false)
      } else if (message?.type === 'hello' && role === 'audience') {
        channel.postMessage({ type: 'go', pos: posRef.current } satisfies Message)
      }
    }
    // A presenter window opened later asks where the talk is
    if (role === 'presenter') channel.postMessage({ type: 'hello' } satisfies Message)
    return () => {
      channel.close()
      channelRef.current = null
    }
  }, [role, show, steps])

  // Typing a slide number into the address bar jumps there
  useEffect(() => {
    const onHashChange = () => go(parseHash(window.location.hash, steps))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [go, steps])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return
      // Space and Enter on a focused button press the button, not the deck
      if ((e.key === ' ' || e.key === 'Enter') && target.closest('button, a')) return

      switch (e.key) {
        // Presentation clickers send PageDown / PageUp
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case 'Enter':
          forward()
          break
        case ' ':
          if (e.shiftKey) back()
          else forward()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          back()
          break
        case 'Home':
          go(START)
          break
        case 'End':
          go(last(steps))
          break
        case 'f':
          toggleFullscreen()
          break
        case 't':
          setDark(!document.documentElement.classList.contains('dark'))
          break
        case 'p':
          if (role === 'audience') openPresenter()
          break
        default:
          return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [back, forward, go, role, steps])

  return { pos, steps, go, forward, back }
}
