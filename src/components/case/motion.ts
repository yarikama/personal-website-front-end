import { useEffect, useRef, useState } from 'react'
import { animate, useInView } from 'motion/react'
import { usePrefersReducedMotion } from '../../hooks'

// Once an element is mostly on screen: the moment a case study's figures
// start to move. With reduced motion they are simply there, finished.
export function useSeen<T extends Element>(amount = 0.4) {
  const ref = useRef<T>(null)
  const inView = useInView(ref, { once: true, amount })
  const reducedMotion = usePrefersReducedMotion()
  return { ref, seen: inView || reducedMotion, reducedMotion }
}

// A number counting up from 0 to `to` once `go` is true
export function useCountUp(to: number, go: boolean, duration = 1.2) {
  const reducedMotion = usePrefersReducedMotion()
  const [value, setValue] = useState(reducedMotion ? to : 0)
  useEffect(() => {
    if (!go) return
    if (reducedMotion) {
      setValue(to)
      return
    }
    const controls = animate(0, to, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: setValue })
    return () => controls.stop()
  }, [to, go, duration, reducedMotion])
  return value
}

export const EASE = [0.16, 1, 0.3, 1] as const
