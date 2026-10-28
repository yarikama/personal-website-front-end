import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph3D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-3d'
import {
  CanvasTexture,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TetrahedronGeometry,
  type BufferGeometry,
  type Material,
  type PerspectiveCamera,
  type Texture,
} from 'three'
import SpriteText from 'three-spritetext'
import { areaColours, homes, layers, learnFirst, neighbours, places, type Level } from '../../lib/learningGraph'
import { markSeen, readSeen, type Stage } from '../../lib/progress'
import { useIsDark } from '../../lib/theme'
import type { LearningEdgeType, LearningGraph, LearningNode } from '../../types'

type GraphNode = NodeObject<{ id: string; node: LearningNode }>
type GraphLink = LinkObject<GraphNode, { type: LearningEdgeType; home: boolean }>

interface Graph3DProps {
  graph: LearningGraph
  width: number
  height: number
  selected: string | null
  onSelect: (slug: string | null) => void
  // The tag whose nodes to bring forward, each in a glow: close together,
  // the glows run into one region
  tag: string | null
  reducedMotion: boolean
  // Pixels to move the view's centre left, so what is in the middle sits
  // in the middle of what a panel on the right leaves showing
  shift?: number
  // How far the visitor has come with each page: its node cracks, lets
  // light through, and opens into a sun
  stages?: Map<string, Stage>
}

interface Palette {
  paper: string
  ink: string
  sage: string
  faint: string
  faded: string
}

// Each node is a solid, rounder and smaller the deeper it sits: a field is
// an icosahedron (20 faces), a topic the same split once (80 faces), an idea
// a smooth sphere; a link elsewhere a small grey sphere. Faceted ones are
// flat-shaded, so their faces catch the light as the graph turns.
function shapes(): Record<Level | 'elsewhere', BufferGeometry> {
  return {
    1: new IcosahedronGeometry(1, 0),
    2: new IcosahedronGeometry(1, 1),
    3: new SphereGeometry(1, 24, 16),
    elsewhere: new SphereGeometry(1, 16, 12),
  }
}
// How wide each is, across
const SIZE: Record<Level | 'elsewhere', number> = { 1: 28, 2: 14, 3: 6, elsewhere: 4.5 }
const LABEL: Record<Level | 'elsewhere', number> = { 1: 8, 2: 4.8, 3: 3.2, elsewhere: 3 }
// How wide the glow around a tagged node is
const GLOW_SIZE = 40
// How far apart the layers of a road of prerequisites sit, left to right
const LAYER_SPACING = 46
// How hard each node is drawn to the middle, and how far a node's push
// reaches
const GATHER = 0.08
const PUSH_REACH = 110

// The site's colours, which the dark theme redefines: read again when the
// theme changes
function usePalette(): Palette {
  const dark = useIsDark()
  return useMemo(() => {
    const style = getComputedStyle(document.documentElement)
    const color = (name: string) => style.getPropertyValue(`--color-${name}`).trim()
    return { paper: color('paper'), ink: color('ink'), sage: color('sage'), faint: color('zinc-400'), faded: color('zinc-faded') }
    // Read from the stylesheet, which `dark` switches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark])
}

// "#6b8f8b" at 40% -> "rgba(107,143,139,0.4)", which the graph reads as a
// colour and an opacity
function withAlpha(hex: string, alpha: number) {
  const value = parseInt(hex.replace('#', ''), 16)
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`
}

// Pulls each node on a road of prerequisites to its layer along x, so that
// roads read left to right however the graph is turned
function layerForce(layer: Map<string, number>) {
  const deepest = Math.max(0, ...layer.values())
  let nodes: GraphNode[] = []
  const force = (alpha: number) => {
    for (const n of nodes) {
      const at = layer.get(n.id)
      if (at === undefined) continue
      const goal = (at - deepest / 2) * LAYER_SPACING
      n.vx = (n.vx ?? 0) + (goal - (n.x ?? 0)) * 0.12 * alpha
    }
  }
  force.initialize = (initial: GraphNode[]) => {
    nodes = initial
  }
  return force
}

// Pulls every node gently to the middle, so that fields with nothing
// between them stay in sight of each other instead of drifting apart. The
// layer force places the road's nodes along x; this one leaves them there.
function gatherForce(layer: Map<string, number>) {
  let nodes: GraphNode[] = []
  const force = (alpha: number) => {
    const pull = GATHER * alpha
    for (const n of nodes) {
      if (!layer.has(n.id)) n.vx = (n.vx ?? 0) - (n.x ?? 0) * pull
      n.vy = (n.vy ?? 0) - (n.y ?? 0) * pull
      n.vz = (n.vz ?? 0) - (n.z ?? 0) * pull
    }
  }
  force.initialize = (initial: GraphNode[]) => {
    nodes = initial
  }
  return force
}

// The soft glow behind a tagged node, drawn white once and tinted by its
// sprite's colour
let glowTexture: Texture | null = null
function glow(): Texture {
  if (!glowTexture) {
    const size = 128
    const half = size / 2
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const context = canvas.getContext('2d')!
    const fade = context.createRadialGradient(half, half, 0, half, half, half)
    fade.addColorStop(0, 'rgba(255,255,255,1)')
    fade.addColorStop(0.5, 'rgba(255,255,255,0.45)')
    fade.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = fade
    context.fillRect(0, 0, size, size)
    glowTexture = new CanvasTexture(canvas)
    glowTexture.colorSpace = SRGBColorSpace
  }
  return glowTexture
}

// The sun a node opens into, read through three times
const SUN = '#ffc457'

// Cracks over a node, drawn once for each stage and wrapped round it: the
// shell breaks into plates, like an eggshell, a few large ones at first,
// then smaller ones with the sun's light in the seams. The plates are worked
// out on the sphere, so the seams are as wide at the poles as round the middle.
const crackTextures = new Map<1 | 2, Texture>()
function cracks(stage: 1 | 2): Texture {
  let texture = crackTextures.get(stage)
  if (!texture) {
    const width = 1024
    const height = 512
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')!
    // The same plates each time: their middles spread evenly round it, a
    // little off a regular pattern
    let seed = stage * 9973
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    const count = stage === 1 ? 11 : 26
    const middles = Array.from({ length: count }, (_, i) => {
      const y = 1 - (2 * (i + 0.5)) / count
      const across = Math.sqrt(1 - y * y)
      const around = i * 2.39996 + random() * 0.6
      const point = [Math.cos(around) * across, y, Math.sin(around) * across].map((v) => v + (random() - 0.5) * 0.18)
      const length = Math.hypot(...point)
      return point.map((v) => v / length)
    })
    // A pixel is on a seam when its two nearest middles are about as near
    // as each other; the sun shows in the middle of a seam, once read twice
    const seam = stage === 1 ? 0.016 : 0.022
    const lit = stage === 1 ? 0 : 0.011
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(SUN.slice(i, i + 2), 16))
    const image = context.createImageData(width, height)
    for (let row = 0; row < height; row++) {
      const down = ((row + 0.5) / height) * Math.PI
      for (let column = 0; column < width; column++) {
        // Where the pixel sits on the sphere, as three wraps the texture
        const around = ((column + 0.5) / width) * Math.PI * 2
        const point = [-Math.cos(around) * Math.sin(down), Math.cos(down), Math.sin(around) * Math.sin(down)]
        // Squared, which keeps the order, until the two nearest are known
        let nearest = 9
        let next = 9
        for (const middle of middles) {
          const dx = point[0] - middle[0]
          const dy = point[1] - middle[1]
          const dz = point[2] - middle[2]
          const squared = dx * dx + dy * dy + dz * dz
          if (squared < nearest) [nearest, next] = [squared, nearest]
          else if (squared < next) next = squared
        }
        const edge = Math.sqrt(next) - Math.sqrt(nearest)
        const at = (row * width + column) * 4
        if (edge < lit) {
          image.data.set([r, g, b, 255], at)
        } else if (edge < seam) {
          image.data.set([12, 12, 12, Math.round(235 * Math.min(1, (seam - edge) / 0.004))], at)
        }
      }
    }
    context.putImageData(image, 0, 0)
    if (stage === 2) {
      // The light glows a little past the seams
      context.filter = 'blur(5px)'
      context.globalCompositeOperation = 'lighter'
      context.globalAlpha = 0.55
      context.drawImage(canvas, 0, 0)
    }
    texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    crackTextures.set(stage, texture)
  }
  return texture
}

// A different turn of the same cracks for each node
function turnOf(slug: string) {
  let hash = 0
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return ((hash >>> 0) % 360) * (Math.PI / 180)
}

// The sun's face: white-hot in the middle, gold to its soft edge
let sunTexture: Texture | null = null
function sunFace(): Texture {
  if (!sunTexture) {
    const size = 128
    const half = size / 2
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const context = canvas.getContext('2d')!
    const face = context.createRadialGradient(half, half, 0, half, half, half)
    face.addColorStop(0, '#fffaf0')
    face.addColorStop(0.35, '#ffe2a0')
    face.addColorStop(0.75, SUN)
    face.addColorStop(0.9, 'rgba(255,170,60,0.9)')
    face.addColorStop(1, 'rgba(255,170,60,0)')
    context.fillStyle = face
    context.fillRect(0, 0, size, size)
    sunTexture = new CanvasTexture(canvas)
    sunTexture.colorSpace = SRGBColorSpace
  }
  return sunTexture
}

// The pieces a node breaks into, as it opens into a sun
const shard = new TetrahedronGeometry(1)

// A link's two slugs: before the layout starts its ends are slugs, after it
// they are the nodes themselves
function ends(link: GraphLink) {
  const end = (end: GraphLink['source']) => (typeof end === 'object' ? end.id : String(end))
  return [end(link.source), end(link.target)] as const
}

// Whether a link is one of the other things a node is part of, besides its
// home: drawn faintly, and pulling only a little, so the node sits at home
const alsoPartOf = (link: GraphLink) => link.type === 'part_of' && !link.home
// The reading order: shown only from the selected node, as where Next goes,
// and no pull on the layout
const readOn = (link: GraphLink) => link.type === 'next'

interface Body {
  object: Group
  materials: Material[]
  label: SpriteText
  labelColor: string
  glow: Sprite
  // What each stage shows, over or instead of the solid
  solid: Mesh
  cracked: Mesh[]
  sun: Sprite
  light: Sprite[]
  // The size each of these is at rest, which a change scales from
  rest: Map<Sprite, number>
  // Playing a change, so the sun doesn't also pulse
  busy: boolean
}

// Shows a node at a stage: cracked, light through the cracks, or a sun in
// place of the solid
function look(body: Body, stage: Stage) {
  body.solid.visible = stage < 3
  body.cracked.forEach((mesh, i) => (mesh.visible = stage === i + 1))
  body.light.forEach((sprite, i) => (sprite.visible = stage === i + 2))
  body.sun.visible = stage === 3
}

// Something playing out over time: true while it goes on
type Effect = (now: number) => boolean

const easeOut = (t: number) => 1 - (1 - t) ** 3
// Past its size and back, as the sun bursts out
const easeOutBack = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2

// A node going from one stage up to another, from `startAt()`: it shakes as
// it cracks; going to a sun, it shakes harder, breaks into pieces that fly
// off and fade, and the sun bursts out from inside. The node is looked up
// each frame, as the graph may make its bodies again meanwhile.
function rise(bodyOf: () => Body | undefined, from: Stage, to: Stage, startAt: () => number): Effect {
  const CRACK = 700
  const BURST = 1300
  let pieces: { holder: Group; mesh: Mesh; way: [number, number, number]; spin: [number, number] }[] | null = null
  const sized = (body: Body, sprite: Sprite, share: number) => sprite.scale.setScalar(body.rest.get(sprite)! * share)
  // The solid and its cracks together, so the cracks stay on its surface
  const shake = (body: Body, amount: number) => {
    const [x, y, z] = [0, 0, 0].map(() => (Math.random() - 0.5) * amount)
    for (const mesh of [body.solid, ...body.cracked]) mesh.position.set(x, y, z)
  }

  return (now) => {
    const body = bodyOf()
    if (!body) return false
    body.busy = true
    const radius = body.solid.scale.x
    const [leak, corona] = body.light
    const t = now - startAt()
    // Waiting, it still shows as it was
    if (t < 0) {
      look(body, from)
      return true
    }

    // Cracking: to its own stage, or the most cracked one before a sun
    if (t < CRACK) {
      const cracking = Math.min(to, 2) as Stage
      look(body, cracking)
      const p = t / CRACK
      shake(body, radius * (to === 3 ? 0.06 + 0.12 * p : 0.12 * (1 - p)))
      if (cracking === 2 && from < 2) sized(body, leak, easeOut(p))
      return true
    }
    shake(body, 0)
    if (to < 3) {
      look(body, to)
      sized(body, leak, 1)
      body.busy = false
      return false
    }

    // Opening into a sun
    if (!pieces) {
      look(body, 3)
      const colour = (body.solid.material as MeshStandardMaterial).color
      pieces = Array.from({ length: 16 }, () => {
        const mesh = new Mesh(
          shard,
          new MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.3, flatShading: true, transparent: true })
        )
        // Somewhere on the surface, flying straight out
        const z = Math.random() * 2 - 1
        const around = Math.random() * Math.PI * 2
        const across = Math.sqrt(1 - z * z)
        const way: [number, number, number] = [across * Math.cos(around), across * Math.sin(around), z]
        mesh.scale.setScalar(radius * (0.25 + Math.random() * 0.2))
        mesh.rotation.set(Math.random() * 6, Math.random() * 6, 0)
        body.object.add(mesh)
        return { holder: body.object, mesh, way, spin: [(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8] }
      })
    }
    const p = Math.min(1, (t - CRACK) / BURST)
    const out = easeOut(p)
    for (const { mesh, way, spin } of pieces) {
      const reach = radius * (0.8 + 3.2 * out)
      mesh.position.set(way[0] * reach, way[1] * reach, way[2] * reach)
      mesh.rotation.x += spin[0] * 0.016
      mesh.rotation.y += spin[1] * 0.016
      ;(mesh.material as MeshStandardMaterial).opacity = 1 - p * p
    }
    sized(body, body.sun, easeOutBack(Math.min(1, p * 1.6)))
    // A flash past its size, settling back
    sized(body, corona, 1 + 0.8 * Math.sin(Math.PI * Math.min(1, p * 1.3)) * (1 - p))
    if (p < 1) return true
    for (const { holder, mesh } of pieces) {
      holder.remove(mesh)
      ;(mesh.material as Material).dispose()
    }
    sized(body, body.sun, 1)
    sized(body, corona, 1)
    body.busy = false
    return false
  }
}

// Fades the bodies out of focus, marks the selected one, and lights the
// glows of the tagged ones
function paint(
  bodies: Map<string, Body>,
  lit: (slug: string) => boolean,
  selected: string | null,
  tagged: Set<string> | null,
  accent: string
) {
  for (const [slug, body] of bodies) {
    body.glow.visible = tagged?.has(slug) ?? false
    for (const material of body.materials) {
      material.userData.opacity ??= material.opacity
      material.opacity = material.userData.opacity * (lit(slug) ? 1 : 0.12)
    }
    body.label.color = slug === selected ? accent : body.labelColor
    body.object.scale.setScalar(slug === selected ? 1.5 : 1)
  }
}

// The knowledge graph in 3D: drag to turn it, scroll or pinch to zoom, drag
// a node to move it, click one to fly to it. None of it is spelled out on
// the page: the cursor and the slow turn show it.
export default function Graph3D({
  graph,
  width,
  height,
  selected,
  onSelect,
  tag,
  reducedMotion,
  shift = 0,
  stages,
}: Graph3DProps) {
  const fg = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined)
  const palette = usePalette()
  const dark = useIsDark()
  const placed = useMemo(() => places(graph), [graph])
  const colours = useMemo(() => areaColours(graph, dark), [graph, dark])
  const [hovered, setHovered] = useState<string | null>(null)
  const fitted = useRef(false)

  const data = useMemo(() => {
    const home = homes(graph)
    return {
      nodes: graph.nodes.map((node): GraphNode => ({ id: node.slug, node })),
      links: graph.edges.map(
        (edge): GraphLink => ({
          source: edge.source,
          target: edge.target,
          type: edge.type,
          home: edge.type === 'part_of' && home.get(edge.source) === edge.target,
        })
      ),
    }
  }, [graph])

  // One body per node, made again only for a new graph or theme; a change
  // of focus only changes their opacity (below). three.js changes them in
  // place, so they live in a ref, and `made` tells the graph to take them up.
  const bodies = useRef(new Map<string, Body>())
  const [made, setMade] = useState(0)
  useEffect(() => {
    const made = new Map<string, Body>()
    const geometry = shapes()
    for (const node of graph.nodes) {
      const place = placed.get(node.slug)
      const level = place?.level ?? 'elsewhere'
      const size = SIZE[level]
      // Coloured by its area; a field in ink, a link elsewhere in grey
      const colour = !place ? palette.faded : place.area ? (colours.get(place.area) ?? palette.sage) : palette.ink
      const material = new MeshStandardMaterial({
        color: colour,
        // A little of its own colour, so the light doesn't muddy the
        // palette, while the faces still shade
        emissive: colour,
        emissiveIntensity: 0.22,
        flatShading: level === 1 || level === 2,
        roughness: 0.55,
        metalness: 0.05,
        transparent: true,
        opacity: 1,
      })
      const solid = new Mesh(geometry[level], material)
      solid.scale.setScalar(size / 2)
      // Turned like its cracks below: a field's or topic's faces are flat,
      // and cracks turned apart from them would sink into the solid in
      // places, flickering as the map turns
      solid.rotation.y = turnOf(node.slug)
      const halo = new Sprite(
        new SpriteMaterial({ map: glow(), color: palette.sage, transparent: true, opacity: 0.32, depthWrite: false })
      )
      halo.scale.setScalar(GLOW_SIZE)
      halo.visible = false
      // Cracked once, then more and lit from within; a sun at last
      const cracked = ([1, 2] as const).map((stage) => {
        const mesh = new Mesh(
          geometry[level],
          new MeshBasicMaterial({ map: cracks(stage), transparent: true, opacity: 1, depthWrite: false })
        )
        mesh.scale.setScalar((size / 2) * 1.02)
        mesh.rotation.y = turnOf(node.slug)
        mesh.visible = false
        return mesh
      })
      const sun = new Sprite(new SpriteMaterial({ map: sunFace(), transparent: true, opacity: 1, depthWrite: false }))
      sun.scale.setScalar(size * 1.25)
      sun.visible = false
      const light = [
        { opacity: 0.3, across: 2.6 },
        { opacity: 0.75, across: 5 },
      ].map(({ opacity, across }) => {
        const sprite = new Sprite(
          new SpriteMaterial({ map: glow(), color: SUN, transparent: true, opacity, depthWrite: false })
        )
        sprite.scale.setScalar(size * across)
        sprite.visible = false
        return sprite
      })
      const object = new Group()
      object.add(halo, ...light, solid, ...cracked, sun)
      const labelColor = place ? palette.ink : palette.faded
      const label = new SpriteText(node.title, LABEL[level], labelColor)
      const serif = level === 1 || level === 2
      label.fontFace = serif ? 'Cormorant Garamond, serif' : 'Inter, system-ui, sans-serif'
      label.fontWeight = serif ? '500' : '400'
      label.position.y = -(size / 2 + LABEL[level] * 0.9)
      object.add(label)
      made.set(node.slug, {
        object,
        materials: [
          material,
          halo.material,
          label.material,
          ...cracked.map((mesh) => mesh.material as Material),
          sun.material,
          ...light.map((sprite) => sprite.material),
        ],
        label,
        labelColor,
        glow: halo,
        solid,
        cracked,
        sun,
        light,
        rest: new Map([sun, ...light].map((sprite) => [sprite, sprite.scale.x])),
        busy: false,
      })
    }
    bodies.current = made
    setMade((count) => count + 1)
    return () => {
      for (const { materials, label } of made.values()) {
        label.material.map?.dispose()
        for (const material of materials) material.dispose()
      }
      for (const shape of Object.values(geometry)) shape.dispose()
    }
  }, [graph, palette, placed, colours])
  const nodeObject = useCallback(
    (n: GraphNode) => bodies.current.get(n.id)?.object ?? new Group(),
    // A new function makes the graph ask for every node's body again
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [made]
  )

  // What to bring forward: the hovered or selected node and its neighbours,
  // and the selected node's road of prerequisites
  const path = useMemo(
    () => (selected ? new Set([selected, ...learnFirst(graph, selected).map((n) => n.slug)]) : new Set<string>()),
    [graph, selected]
  )
  const focus = hovered ?? selected
  const near = useMemo(() => (focus ? neighbours(graph, focus) : null), [graph, focus])
  // A chosen node leads; without one, the tag does
  const tagged = useMemo(
    () => (tag ? new Set(graph.nodes.filter((node) => node.tags.includes(tag)).map((node) => node.slug)) : null),
    [graph, tag]
  )
  const lit = useCallback(
    (slug: string) => (near ? near.has(slug) || path.has(slug) : tagged ? tagged.has(slug) : true),
    [near, path, tagged]
  )

  useEffect(() => {
    paint(bodies.current, lit, selected, tagged, palette.sage)
  }, [made, lit, selected, tagged, palette.sage])
  // Ending a node's drag (a click is one too), the graph sends the camera
  // controls a made-up touch pointerup before the real one arrives, and the
  // controls, still holding the mouse, throw on it. The real one does the
  // work, so the made-up one is dropped before it reaches them.
  useEffect(() => {
    const drop = (event: PointerEvent) => {
      if (!event.isTrusted && event.pointerType === 'touch') event.stopImmediatePropagation()
    }
    window.addEventListener('pointerup', drop, { capture: true })
    return () => window.removeEventListener('pointerup', drop, { capture: true })
  }, [])

  // What is playing out, and the suns' slow pulse, every frame
  const effects = useRef<Effect[]>([])
  useEffect(() => {
    let frame = 0
    const tick = (now: number) => {
      effects.current = effects.current.filter((effect) => effect(now))
      if (!reducedMotion) {
        for (const [slug, body] of bodies.current) {
          if (!body.sun.visible || body.busy) continue
          const [, corona] = body.light
          const beat = 1 + 0.06 * Math.sin(now / 900 + turnOf(slug))
          corona.scale.setScalar(body.rest.get(corona)! * beat)
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reducedMotion])

  // Each node at its stage. One that has risen since the map last showed
  // it plays the change: as it happens, or, read elsewhere, once the map
  // has opened, settled and flown to it.
  const settledAt = useRef(Infinity)
  useEffect(() => {
    const now = stages ?? new Map<string, Stage>()
    const seen = readSeen()
    const asked = performance.now()
    const startAt = () => Math.max(asked + 300, settledAt.current + 1400)
    for (const [slug, body] of bodies.current) {
      const stage = now.get(slug) ?? 0
      const before = seen[slug] ?? 0
      if (stage > before && !reducedMotion) effects.current.push(rise(() => bodies.current.get(slug), before, stage, startAt))
      else if (!body.busy) look(body, stage)
    }
    markSeen(now)
  }, [made, stages, reducedMotion])

  const onPath = useCallback(
    (link: GraphLink) => {
      const [source, target] = ends(link)
      return link.type === 'prerequisite' && path.has(source) && path.has(target)
    },
    [path]
  )
  const linkLit = useCallback(
    (link: GraphLink) => {
      const [source, target] = ends(link)
      if (!near) return !tagged || (tagged.has(source) && tagged.has(target))
      if (onPath(link)) return true
      return (source === focus || target === focus) && near.has(source) && near.has(target)
    },
    [near, focus, onPath, tagged]
  )

  const linkColor = useCallback(
    (link: GraphLink) => {
      if (onPath(link)) return palette.sage
      // Apart from the road in sage: a fine line with sage running along it
      if (readOn(link)) return withAlpha(palette.ink, 0.7)
      const strength =
        link.type === 'prerequisite' ? 0.75 : alsoPartOf(link) ? 0.14 : link.type === 'part_of' ? 0.35 : 0.5
      return withAlpha(palette.faint, linkLit(link) ? strength : 0.06)
    },
    [palette, onPath, linkLit]
  )

  // Lay the roads out left to right, and spread the rest
  useEffect(() => {
    const graph3d = fg.current
    if (!graph3d) return
    const layer = layers(graph)
    graph3d.d3Force('layer', layerForce(layer))
    graph3d.d3Force('gather', gatherForce(layer))
    // Bigger shapes push harder, so fields and topics keep room round them
    // and their labels; only near by, so that one field does not push
    // another, with nothing between them, off to the edge of the screen
    const at = places(graph)
    const PUSH: Record<Level | 'elsewhere', number> = { 1: -360, 2: -180, 3: -80, elsewhere: -60 }
    graph3d.d3Force('charge')?.strength?.((n: GraphNode) => PUSH[at.get(n.id)?.level ?? 'elsewhere'])
    graph3d.d3Force('charge')?.distanceMax?.(PUSH_REACH)
    // d3's own strength (one over the busier end's links), except that a
    // node's other parents barely pull it away from its home
    const links = new Map<string, number>()
    for (const edge of graph.edges) {
      if (edge.type === 'next') continue
      for (const end of [edge.source, edge.target]) links.set(end, (links.get(end) ?? 0) + 1)
    }
    graph3d.d3Force('link')?.strength?.((link: GraphLink) => {
      if (readOn(link)) return 0
      if (alsoPartOf(link)) return 0.05
      const [source, target] = ends(link)
      return 1 / Math.min(links.get(source) ?? 1, links.get(target) ?? 1)
    })
    graph3d.d3ReheatSimulation()
  }, [graph])

  // Turn slowly by itself while nothing is chosen
  useEffect(() => {
    const controls = fg.current?.controls() as { autoRotate?: boolean; autoRotateSpeed?: number } | undefined
    if (!controls) return
    controls.autoRotate = !reducedMotion && !selected && !hovered
    controls.autoRotateSpeed = 0.5
  }, [reducedMotion, selected, hovered])

  // Fly to the selected node; one chosen before the layout has placed it
  // (a link with ?node=) is flown to once the layout settles
  const flyTo = useCallback(
    (slug: string | null) => {
      const graph3d = fg.current
      const target = data.nodes.find((n) => n.id === slug)
      if (!graph3d || !target || target.x === undefined) return false
      const { x = 0, y = 0, z = 0 } = target
      // Further back on a tall, narrow screen, which sees less across
      const distance = 90 * Math.max(1, (1.2 * height) / width)
      const ratio = 1 + distance / Math.max(1, Math.hypot(x, y, z))
      graph3d.cameraPosition({ x: x * ratio, y: y * ratio, z: z * ratio }, { x, y, z }, reducedMotion ? 0 : 1200)
      return true
    },
    [data, reducedMotion, width, height]
  )
  useEffect(() => {
    flyTo(selected)
  }, [selected, flyTo])

  // Frame a tag's nodes together: the camera looks at the group's middle,
  // from the side it is on, far enough back to see all of it in what the
  // panel leaves of the screen. A tag of one node is flown to as a chosen
  // one is; one chosen before the layout has placed them is framed once it
  // settles.
  const frame = useCallback(() => {
    const graph3d = fg.current
    const members = data.nodes.filter((n) => tagged?.has(n.id))
    if (!graph3d || members.length === 0 || members[0].x === undefined) return false
    if (members.length === 1) return flyTo(members[0].id)
    const at = (n: GraphNode) => ({ x: n.x ?? 0, y: n.y ?? 0, z: n.z ?? 0 })
    const middle = members.map(at).reduce((sum, p) => ({ x: sum.x + p.x, y: sum.y + p.y, z: sum.z + p.z }))
    const [cx, cy, cz] = [middle.x, middle.y, middle.z].map((v) => v / members.length)
    // Room for the furthest one's body and label
    const radius = 20 + Math.max(...members.map(at).map((p) => Math.hypot(p.x - cx, p.y - cy, p.z - cz)))
    const camera = graph3d.camera() as PerspectiveCamera
    const half = (camera.fov * Math.PI) / 360
    const across = Math.atan(Math.tan(half) * (Math.max(1, width - 2 * shift) / height))
    const distance = radius / Math.sin(Math.min(half, across))
    const { x, y, z } = camera.position
    const away = Math.max(1, Math.hypot(x - cx, y - cy, z - cz))
    graph3d.cameraPosition(
      { x: cx + ((x - cx) / away) * distance, y: cy + ((y - cy) / away) * distance, z: cz + ((z - cz) / away) * distance },
      { x: cx, y: cy, z: cz },
      reducedMotion ? 0 : 1200
    )
    return true
  }, [tagged, data, flyTo, reducedMotion, width, height, shift])
  // Only as the tag is chosen: the camera is the visitor's again after
  useEffect(() => {
    frame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagged])

  // Slide the picture left by `shift`, as the panel widens: the camera's
  // view is offset, so it still turns round the same point. In step with
  // the panel's own half second.
  const shown = useRef(0)
  useEffect(() => {
    const camera = fg.current?.camera() as PerspectiveCamera | undefined
    if (!camera) return
    const from = shown.current
    const start = performance.now()
    const duration = reducedMotion ? 0 : 500
    let frame = 0
    const step = (now: number) => {
      const t = duration ? Math.min(1, (now - start) / duration) : 1
      // The panel's ease: fast, then settling
      const at = from + (shift - from) * (1 - (1 - t) ** 4)
      shown.current = at
      if (Math.abs(at) < 0.5) camera.clearViewOffset()
      else camera.setViewOffset(width, height, at, 0, width, height)
      camera.updateProjectionMatrix()
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [shift, width, height, reducedMotion])

  return (
    <ForceGraph3D<GraphNode, GraphLink>
      ref={fg}
      graphData={data}
      width={width}
      height={height}
      backgroundColor={palette.paper}
      showNavInfo={false}
      controlType="orbit"
      nodeLabel={() => ''}
      nodeThreeObject={nodeObject}
      linkColor={linkColor}
      linkVisibility={(link: GraphLink) => !readOn(link) || ends(link)[0] === selected}
      linkWidth={(link: GraphLink) => (onPath(link) ? 1.2 : readOn(link) ? 0.3 : link.type === 'prerequisite' ? 0.4 : 0)}
      linkOpacity={1}
      linkDirectionalArrowLength={(link: GraphLink) => (link.type === 'prerequisite' ? 3.5 : readOn(link) ? 5 : 0)}
      linkDirectionalArrowRelPos={1}
      linkDirectionalArrowColor={linkColor}
      linkDirectionalParticles={(link: GraphLink) => ((onPath(link) || readOn(link)) && !reducedMotion ? 3 : 0)}
      linkDirectionalParticleWidth={1.6}
      linkDirectionalParticleSpeed={0.006}
      linkDirectionalParticleColor={() => palette.sage}
      warmupTicks={reducedMotion ? 300 : 0}
      cooldownTicks={reducedMotion ? 0 : 200}
      onEngineStop={() => {
        if (fitted.current) return
        fitted.current = true
        if (!flyTo(selected) && !frame()) fg.current?.zoomToFit(reducedMotion ? 0 : 800, 40)
        // What changed since the map last showed it plays once it has
        // flown there
        settledAt.current = performance.now()
      }}
      onNodeHover={(n: GraphNode | null) => setHovered(n?.id ?? null)}
      onNodeClick={(n: GraphNode) => onSelect(n.id === selected ? null : n.id)}
      onBackgroundClick={() => onSelect(null)}
      onNodeDragEnd={(n: GraphNode) => {
        // Stays where it was put
        n.fx = n.x
        n.fy = n.y
        n.fz = n.z
      }}
    />
  )
}
