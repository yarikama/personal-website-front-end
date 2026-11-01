import { useEffect, useRef, useState } from 'react'

// The width an element is drawn at, in CSS pixels. A chart that takes its
// viewBox from it draws at 1:1, so its labels keep their size on a phone
// instead of shrinking with the whole drawing.
export function useWidth<T extends Element>(initial = 640) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(initial)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width)
      if (next > 0) setWidth(next)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

// Below this, a chart lays itself out for a phone
export const NARROW = 480
