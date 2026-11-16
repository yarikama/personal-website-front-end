import { useEffect, useRef } from 'react'
import { ANGLE, OFFSET, SHEET, TILES, screen, seeded } from './risoPrint'

const PITCH = 3.4 // CSS px between dots
const PRINT_MS = 1600

/**
 * The Lab Notes heading's print: a grid of squares in two riso inks, screened
 * into dots, with a little grain and the second ink a touch off register. It
 * prints once as it comes into view: the first ink goes down, then the second
 * slides in and lands. With reduced motion it is simply there. On paper the
 * inks multiply; on the dark page a lighter cut of each screens onto it.
 * Decoration only: hidden from screen readers, no pointer.
 */
export default function RisoGrid({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let plates: { a: HTMLCanvasElement; b: HTMLCanvasElement; scale: number } | null = null
    let printed = 0, raf = 0

    // One plate per ink: its squares' coverage, screened into dots, with grain knocked out
    function plate(ink: 'a' | 'b', w: number, h: number, scale: number, dpr: number) {
      const mask = document.createElement('canvas')
      mask.width = w; mask.height = h
      const m = mask.getContext('2d')!
      m.scale(scale, scale)
      for (const t of TILES) if (t.ink === ink) {
        m.fillStyle = `rgba(0,0,0,${t.cover})`
        m.beginPath(); m.roundRect(t.x, t.y, t.size, t.size, 12); m.fill()
      }
      const out = document.createElement('canvas')
      out.width = w; out.height = h
      const o = out.getContext('2d')!
      o.fillStyle = '#000'
      for (const [x, y, r] of screen(m.getImageData(0, 0, w, h).data, w, h, ANGLE[ink], PITCH * dpr)) {
        o.beginPath(); o.arc(x, y, r, 0, Math.PI * 2); o.fill()
      }
      o.globalCompositeOperation = 'destination-out'
      const rand = seeded(ink === 'a' ? 7 : 11)
      for (let i = 0; i < w * h * 0.015; i++) o.fillRect(rand() * w, rand() * h, 1, 1)
      return out
    }

    function build() {
      if (!canvas) return
      const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1
      if (!r.width) return
      const w = (canvas.width = Math.round(r.width * dpr)), h = (canvas.height = Math.round(r.height * dpr))
      const scale = w / SHEET.w
      plates = { a: plate('a', w, h, scale, dpr), b: plate('b', w, h, scale, dpr), scale }
    }

    // Paints the print at progress p: ink A over the first 45%, ink B sliding into register after
    function paint(p: number) {
      if (!canvas || !plates) return
      const g = canvas.getContext('2d')!
      const css = getComputedStyle(canvas)
      const dark = document.documentElement.classList.contains('dark')
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, canvas.width, canvas.height)
      g.globalCompositeOperation = dark ? 'screen' : 'multiply'
      const ease = (x: number) => 1 - Math.pow(1 - x, 3)
      const pa = ease(Math.min(1, p / 0.45)), pb = ease(Math.max(0, Math.min(1, (p - 0.4) / 0.6)))
      ink(g, plates.a, css.getPropertyValue('--color-riso-a').trim(), pa, 0, 0)
      ink(g, plates.b, css.getPropertyValue('--color-riso-b').trim(), pb, (OFFSET.x + 28 * (1 - pb)) * plates.scale, OFFSET.y * plates.scale)
      g.globalCompositeOperation = 'source-over'
    }
    function ink(g: CanvasRenderingContext2D, plateCanvas: HTMLCanvasElement, color: string, alpha: number, dx: number, dy: number) {
      if (alpha <= 0 || !canvas) return
      const t = document.createElement('canvas')
      t.width = canvas.width; t.height = canvas.height
      const tc = t.getContext('2d')!
      tc.drawImage(plateCanvas, 0, 0)
      tc.globalCompositeOperation = 'source-in'
      tc.fillStyle = color
      tc.fillRect(0, 0, t.width, t.height)
      g.globalAlpha = alpha * 0.92
      g.drawImage(t, dx, dy)
      g.globalAlpha = 1
    }

    function print() {
      build()
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { printed = 1; return paint(1) }
      const t0 = performance.now()
      const tick = (now: number) => {
        printed = Math.min(1, (now - t0) / PRINT_MS)
        paint(printed)
        if (printed < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    const seen = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return
      seen.disconnect()
      print()
    }, { rootMargin: '0px 0px -10% 0px' })
    seen.observe(canvas)

    // A new size rebuilds the plates; a theme flip repaints them in the other cut of the inks
    let resizeTimer = 0
    const size = new ResizeObserver(() => {
      if (!printed) return
      clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => { build(); paint(printed) }, 150)
    })
    size.observe(canvas)
    const theme = new MutationObserver(() => { if (printed) paint(printed) })
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(resizeTimer)
      seen.disconnect(); size.disconnect(); theme.disconnect()
    }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none block aspect-[5/4] w-full ${className}`} />
}
