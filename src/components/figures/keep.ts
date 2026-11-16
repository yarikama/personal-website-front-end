import {
  Cam, facing, fit, poly, proj, prism, rings, ringAt, rrect, unproj,
  spring, stepS, disposer, mk, pointer, put, register, solid,
  type FigureMount, type Ring, type Solid, type Spring, type Vec2, type Vec3,
} from '../../lib/hairline'
import type { FigureDef } from './types'

/**
 * Keep, the cover of prompt-aware image token pruning: a photo print cut into
 * 48 tiles. Only a quarter of them, twelve, stand up to be read; the rest lie
 * flat and dim. Which twelve depends on what is asked: the pointer is the
 * prompt, and the tiles nearest it rise. At rest the twelve gather on the
 * camera's brand, top right. Drawn to Hairline's ten rules.
 */

export const NX = 8, NY = 6, K = 12
const CELL = 13, FOOT = 11.2, BORDER = 7, PT = 1.6, HMAX = 22, HMIN = 7, REACH = 1.8
const W = NX * CELL, D = NY * CELL
// Where the eye goes before anything is asked: the camera's brand, top right, and a face, lower left.
const SAL = (i: number, j: number) =>
  Math.exp(-((i - 5.8) ** 2 + (j - 1.3) ** 2) / 3) + 0.5 * Math.exp(-((i - 1.6) ** 2 + (j - 3.9) ** 2) / 2.2)

export const EXTREMES: Vec3[] = [
  [-BORDER, -BORDER, 0], [W + BORDER, D + BORDER, 0], [W + BORDER, -BORDER, 0], [-BORDER, D + BORDER, 0],
  [0, 0, PT + HMAX], [W, 0, PT + HMAX],
]
const C = Cam(45, 0.5, 1.95)
fit(C, EXTREMES, 200, 166)
export const P = proj(C)

/** The point on the photo under a viewBox point, on the print's plane, which never moves; null off the image. */
export function over(p: Vec2): Vec2 | null {
  const q = unproj(C, p[0], p[1], PT)
  return q[0] >= 0 && q[0] < W && q[1] >= 0 && q[1] < D ? q : null
}

/** Each tile's height for a prompt at `at` (or none): the twelve best-scoring stand, the better the taller; the rest are 0. */
export function heights(at: Vec2 | null, reach: number): number[] {
  const score: number[] = []
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    score.push(at
      ? Math.exp(-(((i + 0.5) * CELL - at[0]) ** 2 + ((j + 0.5) * CELL - at[1]) ** 2) / (2 * (reach * CELL) ** 2)) + 0.2 * SAL(i, j)
      : SAL(i, j))
  }
  const cut = score.slice().sort((a, b) => b - a)[K - 1], top = Math.max(...score)
  return score.map((s) => (s >= cut ? HMIN + (HMAX - HMIN) * (s / top) : 0))
}

type Tile = { n: number; ring: Ring; inner: Ring; el: Solid; sp: Spring; drawn: number }

const mount: FigureMount = ({ stage, svg, read }, value) => {
  const bag = disposer()
  let reach = value, at: Vec2 | null = null
  const front = facing(C)
  const g = mk('g', {}, svg)

  // The print: a thin plate, and the edge of the image inside its white border.
  const [pr, pi] = rings(-BORDER, -BORDER, W + BORDER, D + BORDER, 3, 1.2)
  put(solid(g), prism(P, front, pr, pi, 0, PT))
  mk('path', { d: poly(ringAt(P, rrect(-1, -1, W + 1, D + 1, 1.5, 3), PT)), class: 'nf lo' }, g)

  // The tiles, diagonal by diagonal from the far corner, so appending is painting back to front.
  const tiles: Tile[] = []
  for (let s = 0; s <= NX + NY - 2; s++) for (let i = 0; i < NX; i++) {
    const j = s - i
    if (j < 0 || j >= NY) continue
    const x0 = i * CELL + (CELL - FOOT) / 2, y0 = j * CELL + (CELL - FOOT) / 2
    const [ring, inner] = rings(x0, y0, x0 + FOOT, y0 + FOOT, 1.6, 0.8)
    tiles.push({ n: j * NX + i, ring, inner, el: solid(g), sp: spring(0, { eps: 0.03 }), drawn: NaN })
  }

  function drawTile(t: Tile) {
    const h = Math.max(0.5, t.sp.x)
    if (h === t.drawn) return
    t.drawn = h
    put(t.el, prism(P, front, t.ring, t.inner, PT, PT + h))
  }

  const B = register(stage, (dt) => {
    let moving = false
    for (const t of tiles) { if (stepS(t.sp, dt)) moving = true; drawTile(t) }
    return moving
  })
  bag.add(B.unregister)

  // The tiles left flat take the dim stroke; the tallest one, the bright.
  function retarget(first: boolean) {
    const h = heights(at, reach), top = Math.max(...h)
    for (const t of tiles) {
      t.sp.t = h[t.n]
      if (first) t.sp.x = t.sp.t
      t.el.sil.classList.toggle('lo', h[t.n] === 0)
      t.el.sil.classList.toggle('hi', h[t.n] === top)
    }
    read.textContent = at ? `tile ${Math.floor(at[0] / CELL)}·${Math.floor(at[1] / CELL)}` : 'rest'
    B.wake()
  }
  retarget(true)

  bag.add(pointer(stage, {
    move: (p) => { at = over(p); retarget(false) },
    leave: () => { at = null; retarget(false) },
  }))
  bag.add(() => svg.replaceChildren())

  return { set: (v) => { reach = v; if (at) retarget(false) }, destroy: bag.dispose }
}

export const keep: FigureDef = {
  name: 'keep',
  label: 'A photo cut into tiles: only a quarter stand up to be read, and which quarter follows what is asked about.',
  value: REACH,
  tour: [[146, 169], [236, 169], [218, 214], null],
  mount,
}
