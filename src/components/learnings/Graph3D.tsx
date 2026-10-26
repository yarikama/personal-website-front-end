import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph3D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-3d'
import {
  Group,
  Mesh,
  MeshLambertMaterial,
  OctahedronGeometry,
  SphereGeometry,
  type Material,
} from 'three'
import SpriteText from 'three-spritetext'
import { layers, learnFirst, neighbours } from '../../lib/learningGraph'
import { useIsDark } from '../../lib/theme'
import type { LearningEdgeType, LearningGraph, LearningNode } from '../../types'

type GraphNode = NodeObject<{ id: string; node: LearningNode }>
type GraphLink = LinkObject<GraphNode, { type: LearningEdgeType }>

interface Graph3DProps {
  graph: LearningGraph
  width: number
  height: number
  selected: string | null
  onSelect: (slug: string | null) => void
  hasPage: (slug: string) => boolean
  reducedMotion: boolean
}

interface Palette {
  paper: string
  ink: string
  sage: string
  faint: string
  faded: string
}

const RADIUS = { concept: 9, learning: 4, external: 3 } as const
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

interface Body {
  object: Group
  materials: Material[]
  label: SpriteText
  labelColor: string
}

// Fades the bodies out of focus, and marks the selected one
function paint(bodies: Map<string, Body>, lit: (slug: string) => boolean, selected: string | null, accent: string) {
  for (const [slug, body] of bodies) {
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
export default function Graph3D({ graph, width, height, selected, onSelect, hasPage, reducedMotion }: Graph3DProps) {
  const fg = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined)
  const palette = usePalette()
  const [hovered, setHovered] = useState<string | null>(null)
  const fitted = useRef(false)

  const data = useMemo(
    () => ({
      nodes: graph.nodes.map((node): GraphNode => ({ id: node.slug, node })),
      links: graph.edges.map((edge): GraphLink => ({ source: edge.source, target: edge.target, type: edge.type })),
    }),
    [graph]
  )

  // One body per node, made again only for a new graph or theme; a change
  // of focus only changes their opacity (below). three.js changes them in
  // place, so they live in a ref, and `made` tells the graph to take them up.
  const bodies = useRef(new Map<string, Body>())
  const [made, setMade] = useState(0)
  useEffect(() => {
    const made = new Map<string, Body>()
    for (const node of graph.nodes) {
      const r = RADIUS[node.kind]
      const live = node.kind !== 'learning' || hasPage(node.slug)
      const material = new MeshLambertMaterial({
        color: node.kind === 'concept' ? palette.ink : node.kind === 'external' ? palette.faded : palette.sage,
        transparent: true,
        opacity: node.kind === 'concept' ? 0.18 : 0.95,
        wireframe: node.kind === 'learning' && !live,
      })
      const shape =
        node.kind === 'external' ? new OctahedronGeometry(r) : new SphereGeometry(r, node.kind === 'concept' ? 24 : 16, 12)
      const object = new Group()
      object.add(new Mesh(shape, material))
      const materials: Material[] = [material]
      if (node.kind === 'concept') {
        // A faint shell around a concept, with its edges drawn
        const edge = new MeshLambertMaterial({ color: palette.ink, transparent: true, opacity: 0.25, wireframe: true })
        object.add(new Mesh(new SphereGeometry(r, 12, 8), edge))
        materials.push(edge)
      }
      const labelColor = node.kind === 'external' ? palette.faded : palette.ink
      const label = new SpriteText(node.title, node.kind === 'concept' ? 6 : 4, labelColor)
      label.fontFace = node.kind === 'concept' ? 'Cormorant Garamond, serif' : 'Inter, system-ui, sans-serif'
      label.fontWeight = node.kind === 'concept' ? '500' : '400'
      label.position.y = -(r + (node.kind === 'concept' ? 5 : 4))
      object.add(label)
      materials.push(label.material)
      made.set(node.slug, { object, materials, label, labelColor })
    }
    bodies.current = made
    setMade((count) => count + 1)
    return () => {
      for (const { object } of made.values()) {
        object.traverse((part) => {
          if (part instanceof Mesh) part.geometry.dispose()
        })
      }
    }
  }, [graph, palette, hasPage])
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

  useEffect(() => {
    paint(bodies.current, (slug) => !near || near.has(slug) || path.has(slug), selected, palette.sage)
  }, [made, near, path, selected, palette.sage])

  const ends = (link: GraphLink) => {
    const end = (end: GraphLink['source']) => (typeof end === 'object' ? end.id : String(end))
    return [end(link.source), end(link.target)] as const
  }
  const onPath = useCallback(
    (link: GraphLink) => {
      const [source, target] = ends(link)
      return link.type === 'prerequisite' && path.has(source) && path.has(target)
    },
    [path]
  )
  const linkLit = useCallback(
    (link: GraphLink) => {
      if (!near || onPath(link)) return true
      const [source, target] = ends(link)
      return (source === focus || target === focus) && near.has(source) && near.has(target)
    },
    [near, focus, onPath]
  )

  const linkColor = useCallback(
    (link: GraphLink) => {
      if (onPath(link)) return palette.sage
      const strength = link.type === 'prerequisite' ? 0.75 : link.type === 'part_of' ? 0.35 : 0.5
      return withAlpha(palette.faint, linkLit(link) ? strength : 0.06)
    },
    [palette, onPath, linkLit]
  )

  // Lay the roads out left to right, and spread the rest
  useEffect(() => {
    const graph3d = fg.current
    if (!graph3d) return
    graph3d.d3Force('layer', layerForce(layers(graph)))
    graph3d.d3Force('charge')?.strength?.(-90)
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
      linkWidth={(link: GraphLink) => (onPath(link) ? 1.2 : link.type === 'prerequisite' ? 0.4 : 0)}
      linkOpacity={1}
      linkDirectionalArrowLength={(link: GraphLink) => (link.type === 'prerequisite' ? 3.5 : 0)}
      linkDirectionalArrowRelPos={1}
      linkDirectionalArrowColor={linkColor}
      linkDirectionalParticles={(link: GraphLink) => (onPath(link) && !reducedMotion ? 3 : 0)}
      linkDirectionalParticleWidth={1.6}
      linkDirectionalParticleSpeed={0.006}
      linkDirectionalParticleColor={() => palette.sage}
      warmupTicks={reducedMotion ? 300 : 0}
      cooldownTicks={reducedMotion ? 0 : 200}
      onEngineStop={() => {
        if (fitted.current) return
        fitted.current = true
        if (!flyTo(selected)) fg.current?.zoomToFit(reducedMotion ? 0 : 800, 40)
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
