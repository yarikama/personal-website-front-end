import { useEffect, useRef } from 'react'

// The peaks of what I work on, [name, x, y, spread, height]: x and y in the
// box's own 0..1 coordinates and spread as a share of its width, so each peak
// is round. Each narrow enough to show its own rings, and clear of the link
// on the right
const PEAKS: [string, number, number, number, number][] = [
  ['Math', 0.2, 0.45, 0.065, 0.7],
  ['ML', 0.4, 0.68, 0.07, 0.95],
  ['Systems', 0.6, 0.3, 0.065, 0.85],
  ['Web', 0.88, 0.22, 0.05, 0.6],
]
const STEP = 4, LEVELS = 16, GAP = 0.06

/**
 * A contour map of a few named peaks, drawn once on a canvas and again when
 * the box resizes or the theme changes. Decoration only: it is hidden from screen
 * readers, takes no pointer, and fades out toward the left (see the class
 * passed in), so it never sits under text.
 */
export default function TopoField({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    function draw() {
      if (!canvas) return
      const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1
      if (!r.width || !r.height) return
      canvas.width = Math.round(r.width * dpr)
      canvas.height = Math.round(r.height * dpr)
      const g = canvas.getContext('2d')
      if (!g) return
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const W = r.width, H = r.height
      const f = (x: number, y: number) => {
        let v = 0
        for (const [, hx, hy, s, a] of PEAKS) {
          const dx = x / W - hx, dy = (y / H - hy) * (H / W)
          v += a * Math.exp(-(dx * dx + dy * dy) / (2 * s * s))
        }
        return v + 0.04 * Math.sin(x / 37) * Math.cos(y / 53)
      }
      const cols = Math.ceil(W / STEP) + 1, rows = Math.ceil(H / STEP) + 1
      const v = new Float32Array(cols * rows)
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) v[j * cols + i] = f(i * STEP, j * STEP)
      g.strokeStyle = getComputedStyle(canvas).getPropertyValue('--color-sage').trim() || '#6b8f8b'
      // Marching squares, one height at a time; every fifth line stronger and
      // a little thicker, as on a map
      for (let k = 1; k <= LEVELS; k++) {
        const lv = k * GAP
        const major = k % 5 === 0
        g.lineWidth = major ? 1.5 : 1.1
        g.globalAlpha = major ? 0.9 : 0.5
        g.beginPath()
        for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
          const a = v[j * cols + i], b = v[j * cols + i + 1], d = v[(j + 1) * cols + i], e = v[(j + 1) * cols + i + 1]
          const x = i * STEP, y = j * STEP, p: [number, number][] = []
          const t = (m: number, n: number) => (lv - m) / (n - m)
          if ((a < lv) !== (b < lv)) p.push([x + STEP * t(a, b), y])
          if ((b < lv) !== (e < lv)) p.push([x + STEP, y + STEP * t(b, e)])
          if ((d < lv) !== (e < lv)) p.push([x + STEP * t(d, e), y + STEP])
          if ((a < lv) !== (d < lv)) p.push([x, y + STEP * t(a, d)])
          for (let n = 0; n + 1 < p.length; n += 2) { g.moveTo(p[n][0], p[n][1]); g.lineTo(p[n + 1][0], p[n + 1][1]) }
        }
        g.stroke()
      }
      // Each summit named, as on a map: a small triangle and the name beside it.
      // Not on a narrow screen, where the map runs behind the heading
      if (W < 480) return
      const style = getComputedStyle(canvas)
      g.globalAlpha = 0.85
      g.fillStyle = style.getPropertyValue('--color-ink').trim() || '#1a1a1a'
      // A halo in the page's colour keeps the name clear of the rings under it
      g.strokeStyle = style.getPropertyValue('--color-paper').trim() || '#f7f6f3'
      g.lineWidth = 4
      g.lineJoin = 'round'
      g.font = `500 11px ${style.getPropertyValue('--font-mono').trim() || 'monospace'}`
      g.letterSpacing = '0.15em'
      g.textBaseline = 'middle'
      for (const [name, hx, hy] of PEAKS) {
        const x = hx * W, y = hy * H
        g.beginPath()
        g.moveTo(x, y - 4)
        g.lineTo(x + 4, y + 3)
        g.lineTo(x - 4, y + 3)
        g.closePath()
        g.fill()
        g.strokeText(name.toUpperCase(), x + 9, y)
        g.fillText(name.toUpperCase(), x + 9, y)
      }
    }

    draw()
    const size = new ResizeObserver(draw)
    size.observe(canvas)
    // The theme is a class on <html>: redraw in the other sage when it flips
    const theme = new MutationObserver(draw)
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => { size.disconnect(); theme.disconnect() }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none ${className}`} />
}
