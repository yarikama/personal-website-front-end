import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph3D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-3d'
import {
  CanvasTexture,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  type BufferGeometry,
  type Material,
  type PerspectiveCamera,
  type Texture,
} from 'three'
import SpriteText from 'three-spritetext'
import { areaColours, homes, layers, learnFirst, neighbours, places, type Level } from '../../lib/learningGraph'
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
const SIZE: Record<Level | 'elsewhere', number> = { 1: 18, 2: 13, 3: 8, elsewhere: 5 }
const LABEL: Record<Level | 'elsewhere', number> = { 1: 6, 2: 4.4, 3: 3.4, elsewhere: 3.2 }
// How wide the glow around a tagged node is
const GLOW_SIZE = 40
// How far apart the layers of a road of prerequisites sit, left to right
const LAYER_SPACING = 46

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
// a node to move it, click one to fly to it
export default function Graph3D({
  graph,
  width,
  height,
  selected,
  onSelect,
  tag,
  reducedMotion,
  shift = 0,
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
      const halo = new Sprite(
        new SpriteMaterial({ map: glow(), color: palette.sage, transparent: true, opacity: 0.32, depthWrite: false })
      )
      halo.scale.setScalar(GLOW_SIZE)
      halo.visible = false
      const object = new Group()
      object.add(halo, solid)
      const labelColor = place ? palette.ink : palette.faded
      const label = new SpriteText(node.title, LABEL[level], labelColor)
      const serif = level === 1 || level === 2
      label.fontFace = serif ? 'Cormorant Garamond, serif' : 'Inter, system-ui, sans-serif'
      label.fontWeight = serif ? '500' : '400'
      label.position.y = -(size / 2 + LABEL[level] * 0.9)
      object.add(label)
      made.set(node.slug, { object, materials: [material, halo.material, label.material], label, labelColor, glow: halo })
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
    graph3d.d3Force('layer', layerForce(layers(graph)))
    // Bigger shapes push harder, so fields and topics keep room round them
    // and their labels
    const at = places(graph)
    const PUSH: Record<Level | 'elsewhere', number> = { 1: -260, 2: -170, 3: -90, elsewhere: -60 }
    graph3d.d3Force('charge')?.strength?.((n: GraphNode) => PUSH[at.get(n.id)?.level ?? 'elsewhere'])
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
