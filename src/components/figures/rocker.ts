import {
  Cam, circ, clamp, facing, fit, hull, open, poly, proj, prism, rad, rings, run, seg,
  spring, stepS, disposer, mk, place, pointer, put, register, solid,
  type FigureMount, type Ring, type Solid, type Vec2, type Vec3,
} from '../../lib/hairline'
import type { FigureDef } from './types'

/**
 * Rocker, the cover of defending LLM agents against tool schema poisoning: a
 * board balanced on a fulcrum, a cup at each end, and a ball between them.
 * The near cup has no floor: what rolls into it falls through to a drain. At
 * rest the board leans toward that cup and the ball is on its way, the moment
 * the agent decides. The pointer presses a side of the board down, and the
 * ball rolls back. Drawn to Hairline's ten rules.
 */

const L = 64, BW = 22, BT = 3, ZP = 24, CR = 10, CH = 9, BR = 4.2, FW = 16
const CX = L - CR - 2, SMAX = CX - CR - BR - 1, REST_T = -5, REST_S = 0.4, TILT = 10, TMAX = 14

const lift = Math.sin(rad(TMAX)) * L + BT + CH
export const EXTREMES: Vec3[] = [
  [-L - FW, -BW / 2 - FW, -3], [L + FW, BW / 2 + FW, -3], [L + FW, -BW / 2 - FW, -3], [-L - FW, BW / 2 + FW, -3],
  [-CX, 0, ZP + lift], [CX, 0, ZP + lift],
]
const C = Cam(45, 0.5, 1.72)
fit(C, EXTREMES, 200, 166)
export const P = proj(C)

// The pointer's x against the fulcrum's fixed place on screen (rule 01): left of it presses the left end down.
const fulcrum = P(0, 0, ZP)[0]
/** How hard the pointer presses, from -1 (the right end, toward the leak) to 1 (the left, toward the closed cup). */
export const aim = (p: Vec2) => clamp((fulcrum - p[0]) / 95, -1, 1)
/** Where a tilt sends the ball. */
export const heading = (tilt: number) => (tilt > 1 ? '→ kept' : tilt < -1 ? '→ leak' : 'level')

const mount: FigureMount = ({ stage, svg, read }, value) => {
  const bag = disposer()
  let tmax = value, pressing: number | null = null
  const front = facing(C)
  const g = mk('g', {}, svg)

  // The floor, the drain under the leaking cup, the drop guide, the fulcrum.
  const [fr, fi] = rings(-L - FW, -BW / 2 - FW, L + FW, BW / 2 + FW, 7, 1.8)
  put(solid(g), prism(P, front, fr, fi, -3, 0))
  mk('path', { d: poly(circ(4.5, 32).map((q) => P(CX + q.u, q.v, 0))), class: 'nf' }, g)
  const drop = mk('path', { class: 'nf dash' }, g)
  const [pr, pi] = rings(-6, -BW / 2 + 3, 6, BW / 2 - 3, 3, 1)
  put(solid(g), prism(P, front, pr, pi, 0, ZP))

  // Everything on the board turns with it, about the fulcrum's top edge.
  const T = (x: number, y: number, z: number, th: number): Vec2 => {
    const c = Math.cos(rad(th)), s = Math.sin(rad(th)), dz = z - ZP
    return P(x * c - dz * s, y, ZP + x * s + dz * c)
  }
  const tilted = (el: Solid, ring: Ring, inner: Ring | null, cx: number, z0: number, z1: number, th: number) => {
    const at = (z: number) => ring.map((q) => T(q.u + cx, q.v, z, th))
    el.sil.setAttribute('d', poly(hull(at(z0).concat(at(z1)))))
    el.cr.setAttribute('d', inner ? open(run(inner, front).map((q) => T(q.u + cx, q.v, z1, th))) : '')
  }

  // Far to near: the board, the closed cup, the ball, the leaking cup.
  const [br, bi] = rings(-L, -BW / 2, L, BW / 2, 4, 1.4)
  const board = solid(g)
  const cupRing = circ(CR, 40), rimRing = circ(CR - 1.6, 40)
  const cupL = solid(g), rimL = mk('path', { class: 'nf' }, g)
  const ball = mk('ellipse', { rx: (BR * C.S).toFixed(2), ry: (BR * C.S).toFixed(2), class: 'hi' }, g)
  const cupR = solid(g), rimR = mk('path', { class: 'nf' }, g)

  const th = spring(REST_T), sp = spring(REST_S * SMAX, { k: 40, c: 11 })
  let drawn = ''

  function draw() {
    const key = `${th.x.toFixed(3)},${sp.x.toFixed(3)}`
    if (key === drawn) return
    drawn = key
    const a = th.x, zb = ZP + BT
    tilted(board, br, bi, 0, ZP, zb, a)
    tilted(cupL, cupRing, null, -CX, zb, zb + CH, a)
    rimL.setAttribute('d', poly(rimRing.map((q) => T(q.u - CX, q.v, zb + CH, a))))
    tilted(cupR, cupRing, null, CX, zb, zb + CH, a)
    rimR.setAttribute('d', poly(rimRing.map((q) => T(q.u + CX, q.v, zb + CH, a))))
    place(ball, T(sp.x, 0, zb + BR, a))
    drop.setAttribute('d', seg(T(CX, 0, zb, a), P(CX, 0, 0)))
  }

  const B = register(stage, (dt) => {
    const a = stepS(th, dt)
    // The ball runs downhill: a board tipped up on the right sends it left, toward the closed cup.
    if (pressing !== null) sp.t = -SMAX * clamp(th.x / 4, -1, 1)
    const b = stepS(sp, dt)
    draw()
    return a || b
  })
  bag.add(B.unregister)

  function press(p: Vec2 | null) {
    pressing = p ? aim(p) : null
    th.t = pressing === null ? REST_T : pressing * tmax
    if (pressing === null) sp.t = REST_S * SMAX
    read.textContent = pressing === null ? 'rest' : heading(th.t)
    B.wake()
  }
  press(null)

  bag.add(pointer(stage, { move: (p) => press(p), leave: () => press(null) }))
  bag.add(() => svg.replaceChildren())

  return { set: (v) => { tmax = Math.min(v, TMAX); if (pressing !== null) { th.t = pressing * tmax; B.wake() } }, destroy: bag.dispose }
}

export const rocker: FigureDef = {
  name: 'rocker',
  label: 'A ball on a balanced board between a closed cup and one that leaks: the pointer tips the board and steers the ball back.',
  value: TILT,
  tour: [[130, 150], [270, 170], [205, 150], null],
  mount,
}
