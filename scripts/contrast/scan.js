// Runs inside a page (Playwright's page.evaluate). Every piece of text on
// it, HTML and SVG, with the colour it is drawn in and the colour behind
// it, both composited through opacity and translucent layers, and the WCAG
// contrast ratio between them. Returns what falls short of WCAG AA: 4.5:1,
// or 3:1 for text 24px and up (18.66px bold). Text WCAG exempts is skipped:
// disabled controls and anything aria-hidden.
//
// Kept as a plain function so check-contrast.mjs can hand it to the page.
export function scan() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  // Any CSS colour (hex, rgb, oklch, color-mix) as RGBA, as the browser draws it
  const rgba = (css) => {
    if (!css || css === 'none' || css === 'transparent' || css.startsWith('url(')) return { r: 0, g: 0, b: 0, a: 0 }
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = '#000'
    ctx.fillStyle = css
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    return { r, g, b, a: a / 255 }
  }
  const over = (top, under) => {
    const a = top.a + under.a * (1 - top.a)
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 }
    const mix = (k) => (top[k] * top.a + under[k] * under.a * (1 - top.a)) / a
    return { r: mix('r'), g: mix('g'), b: mix('b'), a }
  }
  const luminance = ({ r, g, b }) => {
    const f = (v) => {
      const c = v / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }
  const hex = (c) => `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
  const SHAPES = 'rect, circle, ellipse, path, polygon'

  // The SVG shapes painted under an SVG text's middle, lowest first
  function shapesUnder(text) {
    const svg = text.ownerSVGElement
    if (!svg) return []
    const box = text.getBoundingClientRect()
    const x = box.left + box.width / 2
    const y = box.top + box.height / 2
    const below = []
    for (const shape of svg.querySelectorAll(SHAPES)) {
      if (!(shape.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING)) continue
      const r = shape.getBoundingClientRect()
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue
      // A path's box holds far more than it fills; only closed, filled shapes count
      if (shape.tagName === 'path' && !/z\s*$/i.test(shape.getAttribute('d') || '')) continue
      below.push(shape)
    }
    return below
  }

  const failures = []
  for (const el of document.querySelectorAll('body *')) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue
    if (el.closest('[aria-hidden="true"], :disabled, [aria-disabled="true"]')) continue
    const style = getComputedStyle(el)
    if (style.visibility !== 'visible' || style.display === 'none') continue
    const box = el.getBoundingClientRect()
    if (box.width < 2 || box.height < 2) continue

    // Opacity down the ancestors, and the HTML backgrounds behind the text
    let opacity = 1
    const layers = []
    let hidden = false
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n)
      if (s.display === 'none' || s.visibility === 'hidden') hidden = true
      opacity *= Number(s.opacity)
      if (n instanceof SVGElement) continue
      const bg = rgba(s.backgroundColor)
      if (bg.a > 0) layers.push(bg)
      if (bg.a >= 1) break
    }
    if (hidden || opacity < 0.05) continue
    let bg = { r: 255, g: 255, b: 255, a: 1 }
    for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg)

    const svg = el instanceof SVGElement
    if (svg) {
      for (const shape of shapesUnder(el)) {
        const s = getComputedStyle(shape)
        const fill = rgba(s.fill)
        let alpha = Number(s.fillOpacity || 1)
        for (let n = shape; n && n !== el.ownerSVGElement; n = n.parentElement) alpha *= Number(getComputedStyle(n).opacity)
        fill.a *= alpha
        if (fill.a > 0) bg = over(fill, bg)
      }
      // A halo (a stroke painted under the fill, as with paint-order="stroke") is what
      // sits right behind the letters, so it is the background that counts
      const halo = rgba(style.stroke)
      if (style.paintOrder.startsWith('stroke') && halo.a > 0 && parseFloat(style.strokeWidth) >= 2) {
        halo.a *= Number(style.strokeOpacity || 1)
        bg = over(halo, bg)
      }
    }
    const fg = rgba(svg ? style.fill : style.color)
    if (svg) fg.a *= Number(style.fillOpacity || 1)
    fg.a *= opacity
    const shown = over(fg, bg)

    const size = parseFloat(style.fontSize)
    const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700)
    const need = large ? 3 : 4.5
    const ratio = contrast(shown, bg)
    if (ratio + 0.005 < need) {
      failures.push({
        ratio: Math.round(ratio * 100) / 100,
        need,
        fg: hex(shown),
        bg: hex(bg),
        size,
        text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40),
        className: String(el.getAttribute('class') || '').slice(0, 100),
      })
    }
  }
  return failures
}
