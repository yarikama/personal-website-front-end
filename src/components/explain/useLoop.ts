import { useRef, useState } from 'react'
import { useAnimationFrame } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'

// Where a looping animation is, from 0 to 1, going round every `period` ms.
// With reduced motion it holds still at `still`, a moment that shows the
// point on its own.
export function useLoop(period: number, still = 0.6): number {
  const reducedMotion = usePrefersReducedMotion()
  const started = useRef<number | null>(null)
  const [phase, setPhase] = useState(still)
  useAnimationFrame((time) => {
    if (reducedMotion) return
    started.current ??= time
    setPhase(((time - started.current) % period) / period)
  })
  return reducedMotion ? still : phase
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// How far along a stretch from `start` to `end` of the loop `phase` is,
// from 0 to 1, or null outside it
export function within(phase: number, start: number, end: number): number | null {
  const at = (phase - start + 1) % 1
  const length = (end - start + 1) % 1 || 1
  return at <= length ? at / length : null
}
