import { useEffect, type RefObject } from 'react'

// The smallest a drawing's text may show, in pixels
const SMALLEST_TEXT = 11

// A drawing scales with its viewBox, its text with it: one drawn for a
// wide screen shrinks its labels past reading on a phone. Each label shown
// smaller than SMALLEST_TEXT is drawn larger to make up, as the figure
// narrows and as labels come and go; on a wide screen nothing changes.
// Only where asked (`on`): a drawing whose labels sit close together needs
// laying out for a phone instead, or the larger labels run into each other.
export function useReadableText(drawing: RefObject<HTMLDivElement | null>, on: boolean) {
  useEffect(() => {
    const root = drawing.current
    if (!root || !on) return
    const fit = () => {
      for (const text of root.querySelectorAll<SVGTextElement>('svg text')) {
        // Its own size, read once, before any making up
        const own = Number(text.dataset.size) || parseFloat(getComputedStyle(text).fontSize)
        if (!own) continue
        text.dataset.size = String(own)
        const matrix = text.getScreenCTM()
        const scale = matrix ? Math.hypot(matrix.a, matrix.b) : 1
        const shown = own * scale
        text.style.fontSize = shown < SMALLEST_TEXT && scale > 0 ? `${SMALLEST_TEXT / scale}px` : ''
      }
    }
    fit()
    const resized = new ResizeObserver(fit)
    resized.observe(root)
    // Labels a figure adds as it plays; not every move of one
    const added = new MutationObserver(fit)
    added.observe(root, { childList: true, subtree: true })
    return () => {
      resized.disconnect()
      added.disconnect()
    }
  }, [drawing, on])
}
