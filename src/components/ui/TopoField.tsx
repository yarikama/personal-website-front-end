import { useEffect, useRef } from 'react'

// A few smooth hills, [x, y, spread, height], in the box's own 0..1 coordinates
const HILLS = [[0.72, 0.38, 0.3, 1], [0.38, 0.7, 0.22, 0.7], [0.95, 0.85, 0.18, 0.55], [0.55, 0.12, 0.14, 0.45], [0.18, 0.25, 0.2, 0.35]]
const STEP = 6, LEVELS = 14, GAP = 0.075

/**
 * Contour lines of a still field, drawn once on a canvas and again when the
 * box resizes or the theme changes. Decoration only: it is hidden from screen
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
        for (const [hx, hy, s, a] of HILLS) {
          const dx = x / W - hx, dy = (y / H - hy) * (H / W)
          v += a * Math.exp(-(dx * dx + dy * dy) / (2 * s * s))
        }
        return v + 0.04 * Math.sin(x / 37) * Math.cos(y / 53)
      }
      const cols = Math.ceil(W / STEP) + 1, rows = Math.ceil(H / STEP) + 1
      const v = new Float32Array(cols * rows)
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) v[j * cols + i] = f(i * STEP, j * STEP)
      g.strokeStyle = getComputedStyle(canvas).getPropertyValue('--color-sage').trim() || '#6b8f8b'
      g.lineWidth = 1
      // Marching squares, one height at a time; every fifth line a little stronger, as on a map
      for (let k = 1; k <= LEVELS; k++) {
        const lv = k * GAP
        g.globalAlpha = k % 5 === 0 ? 0.55 : 0.28
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
