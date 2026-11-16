import {
  Cam, facing, fillet, fit, poly, proj, prism, rings, ringAt, rrect, seg, unproj,
  tween, tset, tval, tdone, disposer, flatDot, mk, place, pointer, put, register, solid,
  type FigureMount, type Ring, type Solid, type Tween, type Vec2, type Vec3,
} from '../../lib/hairline'
import type { FigureDef } from './types'

/**
 * Onebox, the Homelab project's cover: an open laptop whose deck is a tray of
 * four modules, the site's API, its database, and two LLMs that share one
 * plate (the GPU). The module under the pointer lifts out of its slot and the
 * others settle, staggered out from it. At rest the second LLM is half out and
 * carries the bright edge. Drawn to Hairline's ten rules.
 */

const DX = 132, DY = 84, DH = 5, LH = 62, LT = 12, LK = 2.2
const MW = 22, MD = 24, MY = 14, PLATE = 2.4, LIFT = 22, GAP = 1.4
const XS = [10, 38, 70, 98], HT = [8, 12, 16, 16], REST = [0, 2, 4, 12]
const NAME = ['api', 'db', 'llm 1', 'llm 2']
const KIND = ['api', 'db', 'llm', 'llm'] as const
const base = (i: number) => DH + (KIND[i] === 'llm' ? PLATE : 0)

type Module = {
  x: number; i: number; kind: (typeof KIND)[number]; parts: Solid[]
  vent: SVGPathElement | null; chips: SVGEllipseElement[]; ring: Ring; inner: Ring; z: Tween; drawn: number
}

// The camera, fitted with the lid and a module at full lift, so no pose leaves the 400 × 320 frame.
// Its far points, every pose's extremes, are exported for the test that holds it to that.
export const EXTREMES: Vec3[] = [
  [0, 0, 0], [DX, DY, 0], [DX, 0, 0], [0, DY, 0], [0, -LT - LK, DH + LH], [DX, -LT - LK, DH + LH],
  ...XS.flatMap((x, i): Vec3[] => [[x, MY, base(i) + LIFT + HT[i]], [x + MW, MY + MD, base(i) + LIFT + HT[i]]]),
]
const C = Cam(45, 0.5, 1.85)
fit(C, EXTREMES, 200, 166)
export const P = proj(C)

// The module under a viewBox point, or -1. Tested against what never moves (Hairline's rule 01): the
// deck's plane says whether the point is over the tray, then the module whose RESTING centre is nearest
// on screen takes it, so a module lifting out from under the pointer cannot change the choice.
const centres = XS.map((x, i) => P(x + MW / 2, MY + MD / 2, base(i))[0])
export function pick(p: Vec2): number {
  const [x, y] = unproj(C, p[0], p[1], DH)
  if (x < -55 || x > DX + 10 || y < -40 || y > DY - 24) return -1
  let best = -1, bd = Infinity
  centres.forEach((c, i) => { const d = Math.abs(c - p[0]); if (d < bd) { bd = d; best = i } })
  return best
}

const mount: FigureMount = ({ stage, svg, read }, value) => {
  const bag = disposer()
  let stag = value
  const front = facing(C)
  const g = mk('g', {}, svg)

  // The lid leans back from the deck's far edge: its thickness, its face, the screen's edge, the camera.
  const lid = (k: number) => ([u, v]: Vec2) => P(u, (-LT * v) / LH - k, DH + v)
  const outline = fillet([[3, 0], [DX - 3, 0], [DX - 3, LH], [3, LH]], [1, 1, 6, 6])
  mk('path', { d: poly(outline.map(lid(LK))), class: 'lo' }, g)
  mk('path', { d: poly(outline.map(lid(0))), class: 'sil' }, g)
  const screen = fillet([[11, 8], [DX - 11, 8], [DX - 11, LH - 7], [11, LH - 7]], [3, 3, 3, 3])
  mk('path', { d: poly(screen.map(lid(0))), class: 'nf lo' }, g)
  place(mk('circle', { r: 1, class: 'dot off' }, g), lid(0)([DX / 2, LH - 3.5]))

  // The deck, its trackpad, the GPU plate under both models, and the slots the modules sit in.
  const [dr, di] = rings(0, 0, DX, DY, 7, 1.8)
  put(solid(g), prism(P, front, dr, di, 0, DH))
  mk('path', { d: poly(ringAt(P, rrect(DX / 2 - 20, DY - 21, DX / 2 + 20, DY - 6, 3, 4), DH)), class: 'nf lo' }, g)
  const [gr, gi] = rings(XS[2] - 4, MY - 4, XS[3] + MW + 4, MY + MD + 4, 4, 1.2)
  put(solid(g), prism(P, front, gr, gi, DH, DH + PLATE))
  XS.forEach((x, i) => mk('path', { d: poly(ringAt(P, rrect(x - 1.5, MY - 1.5, x + MW + 1.5, MY + MD + 1.5, 4, 4), base(i))), class: 'nf lo' }, g))

  // The modules, far to near. The database is three platters; the API has vents; each LLM a 2 × 3 of chips.
  const mods: Module[] = XS.map((x, i) => {
    const grp = mk('g', {}, g), kind = KIND[i]
    const parts = Array.from({ length: kind === 'db' ? 3 : 1 }, () => solid(grp))
    const vent = kind === 'api' ? mk('path', { class: 'nf lo' }, grp) : null
    const chips = kind === 'llm' ? Array.from({ length: 6 }, () => flatDot(grp, C, 0.9, 'dot off')) : []
    const [ring, inner] = rings(x, MY, x + MW, MY + MD, 4, 1.2)
    return { x, i, kind, parts, vent, chips, ring, inner, z: tween(REST[i]), drawn: NaN }
  })

  function draw(m: Module, lift: number) {
    if (lift === m.drawn) return
    m.drawn = lift
    const z0 = base(m.i) + lift, h = HT[m.i], top = z0 + h
    if (m.kind === 'db') {
      const t = (h - 2 * GAP) / 3
      m.parts.forEach((s, k) => put(s, prism(P, front, m.ring, m.inner, z0 + k * (t + GAP), z0 + k * (t + GAP) + t)))
    } else put(m.parts[0], prism(P, front, m.ring, m.inner, z0, top))
    m.vent?.setAttribute('d', [0.36, 0.5, 0.64].map((f) => seg(P(m.x + 5, MY + MD * f, top), P(m.x + MW - 5, MY + MD * f, top))).join(''))
    m.chips.forEach((el, k) => place(el, P(m.x + MW / 2 + ((k % 2) - 0.5) * 8, MY + MD / 2 + (Math.floor(k / 2) - 1) * 6.5, top)))
  }

  const B = register(stage, (_dt, now) => {
    let moving = false
    mods.forEach((m) => { draw(m, tval(m.z, now)); if (!tdone(m.z, now)) moving = true })
    return moving
  })
  bag.add(B.unregister)

  let act = -2
  function setActive(a: number) {
    if (a === act) return
    const now = performance.now(), from = a >= 0 ? a : act >= 0 ? act : 3
    act = a
    mods.forEach((m, i) => {
      tset(m.z, a < 0 ? REST[i] : i === a ? LIFT : 0, now, Math.abs(i - from) * stag)
      const on = a < 0 ? i === 3 : i === a
      m.parts.forEach((s) => s.sil.classList.toggle('hi', on))
    })
    read.textContent = a < 0 ? 'rest' : NAME[a]
    B.wake()
  }
  setActive(-1)

  bag.add(pointer(stage, { move: (p) => setActive(pick(p)), leave: () => setActive(-1) }))
  bag.add(() => svg.replaceChildren())

  return { set: (v) => { stag = v }, destroy: bag.dispose }
}

export const NAMES = NAME

export const onebox: FigureDef = {
  name: 'onebox',
  label: 'An open laptop holding four modules: the API, the database, and two LLMs sharing one GPU plate.',
  value: 40,
  tour: [[267, 205], [153, 164], [190, 175], null],
  mount,
}
