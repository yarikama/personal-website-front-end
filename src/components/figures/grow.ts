import {
  Cam, clamp, facing, fit, poly, proj, prism, rings, ringAt, rrect,
  tween, tset, tval, tdone, disposer, flatDot, mk, place, pointer, put, register, solid,
  type FigureMount, type Ring, type Solid, type Tween, type Vec2, type Vec3,
} from '../../lib/hairline'
import type { FigureDef } from './types'

/**
 * Grow, the cover of cross-size generalisation for GNN job shop scheduling: a
 * factory floor of machines, from 2 × 2 to 7 × 7, and in its far corner a
 * pillar, the one number that grows with the factory. The pointer's x sets
 * the factory's size; machines come and go staggered out from the edge, and
 * the pillar rises with the count. Drawn to Hairline's ten rules.
 */

export const NMIN = 2, NMAX = 7, REST_N = 4
const CELL = 14, MF = 10.5, MD = 7.5, MH = 7, PX0 = -22, PX1 = -10, STAGGER = 30
export const pillar = (n: number) => 4 + n * n * 1.2
const E = NMAX * CELL

export const EXTREMES: Vec3[] = [
  [PX0 - 6, -8, -3], [E + 8, E + 8, -3], [E + 8, -8, -3], [PX0 - 6, E + 8, -3],
  [PX0, 0, pillar(NMAX)], [PX1, 12, pillar(NMAX)],
]
const C = Cam(45, 0.5, 1.7)
fit(C, EXTREMES, 200, 166)
export const P = proj(C)

/** The factory's size for a viewBox point: only its x, read across fixed bands of the frame (rule 01). */
export const band = (p: Vec2) => clamp(Math.round(NMIN + ((p[0] - 90) / 220) * (NMAX - NMIN)), NMIN, NMAX)

type Machine = { i: number; j: number; x0: number; y0: number; ring: Ring; inner: Ring; el: Solid; dot: SVGEllipseElement; h: Tween; drawn: number }

const mount: FigureMount = ({ stage, svg, read }, value) => {
  const bag = disposer()
  let stag = value
  const front = facing(C)
  const g = mk('g', {}, svg)

  // The floor, the dashed edge of the factory as it is now, and the pillar in the far corner.
  const [fr, fi] = rings(PX0 - 6, -8, E + 8, E + 8, 7, 1.8)
  put(solid(g), prism(P, front, fr, fi, -3, 0))
  const edge = mk('path', { class: 'nf dash' }, g)
  const [pr, pi] = rings(PX0, 0, PX1, 12, 2.5, 1)
  const pil = solid(g)
  pil.sil.classList.add('hi')

  // The machines, diagonal by diagonal from the far corner; each has a dot on its lid.
  const machines: Machine[] = []
  for (let s = 0; s <= 2 * (NMAX - 1); s++) for (let i = 0; i < NMAX; i++) {
    const j = s - i
    if (j < 0 || j >= NMAX) continue
    const x0 = i * CELL + (CELL - MF) / 2, y0 = j * CELL + (CELL - MD) / 2
    const [ring, inner] = rings(x0, y0, x0 + MF, y0 + MD, 1.2, 0.8)
    const el = solid(g), dot = flatDot(el.g, C, 0.8, 'dot off')
    machines.push({ i, j, x0, y0, ring, inner, el, dot, h: tween(Math.max(i, j) < REST_N ? MH : 0), drawn: NaN })
  }
  const size = tween(REST_N), tall = tween(pillar(REST_N))
  let drawnEdge = NaN, drawnTall = NaN

  const B = register(stage, (_dt, now) => {
    let moving = !tdone(size, now) || !tdone(tall, now)
    for (const m of machines) {
      const h = tval(m.h, now)
      if (!tdone(m.h, now)) moving = true
      if (h === m.drawn) continue
      m.drawn = h
      const show = h > 0.25
      m.el.g.style.display = show ? '' : 'none'
      if (show) {
        put(m.el, prism(P, front, m.ring, m.inner, 0, h))
        place(m.dot, P(m.x0 + MF * 0.75, m.y0 + MD / 2, h))
      }
    }
    const n = tval(size, now), t = tval(tall, now)
    if (n !== drawnEdge) { drawnEdge = n; edge.setAttribute('d', poly(ringAt(P, rrect(-2, -2, n * CELL + 2, n * CELL + 2, 4, 4), 0))) }
    if (t !== drawnTall) { drawnTall = t; put(pil, prism(P, front, pr, pi, 0, t)) }
    return moving
  })
  bag.add(B.unregister)

  let shown = -2
  function setSize(a: number) {
    if (a === shown) return
    const now = performance.now(), n = a < 0 ? REST_N : a, from = shown < 0 ? REST_N : shown
    shown = a
    for (const m of machines) {
      const ring = Math.max(m.i, m.j)
      tset(m.h, ring < n ? MH : 0, now, Math.abs(ring - Math.min(from, n)) * stag)
    }
    tset(size, n, now, 0)
    tset(tall, pillar(n), now, 0)
    read.textContent = a < 0 ? 'rest' : `${n}×${n} · ${n * n}`
    B.wake()
  }
  setSize(-1)

  bag.add(pointer(stage, { move: (p) => setSize(band(p)), leave: () => setSize(-1) }))
  bag.add(() => svg.replaceChildren())

  return { set: (v) => { stag = v }, destroy: bag.dispose }
}

export const grow: FigureDef = {
  name: 'grow',
  label: 'A factory floor that grows under the pointer, and in its corner the one number that grows with it.',
  value: STAGGER,
  tour: [[310, 200], [110, 200], [255, 200], null],
  mount,
}
