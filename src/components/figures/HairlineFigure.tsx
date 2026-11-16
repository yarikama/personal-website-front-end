import { useEffect, useRef } from 'react'
import { inject, mk, tour } from '../../lib/hairline'
import type { FigureDef } from './types'

/**
 * Mounts a Hairline figure in a 5:4 box. It walks its own lap until a pointer
 * arrives, then answers the pointer; off screen, at rest, or with reduced
 * motion, it does no work (the engine's loop sees to that).
 */
export default function HairlineFigure({ figure, className = '' }: { figure: FigureDef; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stage = ref.current
    if (!stage) return
    inject(document)
    const svg = mk('svg', { viewBox: '0 0 400 320', 'aria-hidden': 'true' }, stage)
    // The figure names what is under the pointer; the cover shows no read-out.
    const handle = figure.mount({ stage, svg, read: { textContent: null } }, figure.value)
    const lap = tour(stage, figure.tour)
    return () => {
      lap.stop()
      handle.destroy()
      svg.remove()
    }
  }, [figure])

  return <div ref={ref} data-hairline={figure.name} role="img" aria-label={figure.label} className={className} />
}
