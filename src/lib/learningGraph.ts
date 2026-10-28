import type { LearningGraph, LearningNode } from '../types'
import type { Stage } from './progress'

export interface NodeLinks {
  // Learned right before it, and right after
  prerequisites: LearningNode[]
  leadsTo: LearningNode[]
  // What it is part of, its home first, and what is part of it
  partOf: LearningNode[]
  parts: LearningNode[]
  related: LearningNode[]
  // The one it lives in, if it is part of anything
  home: LearningNode | null
  // In the reading order: the page to read after it, and the one before
  readNext: LearningNode | null
  readBefore: LearningNode | null
}

const byTitle = (a: LearningNode, b: LearningNode) => a.title.localeCompare(b.title)

function nodesBySlug(graph: LearningGraph) {
  return new Map(graph.nodes.map((node) => [node.slug, node]))
}

export function linksOf(graph: LearningGraph, slug: string): NodeLinks {
  const nodes = nodesBySlug(graph)
  const links: NodeLinks = {
    prerequisites: [],
    leadsTo: [],
    partOf: [],
    parts: [],
    related: [],
    home: null,
    readNext: null,
    readBefore: null,
  }
  for (const edge of graph.edges) {
    const out = edge.source === slug
    if (!out && edge.target !== slug) continue
    const other = nodes.get(out ? edge.target : edge.source)
    if (!other) continue
    if (edge.type === 'next') links[out ? 'readNext' : 'readBefore'] = other
    else if (edge.type === 'prerequisite') links[out ? 'leadsTo' : 'prerequisites'].push(other)
    else if (edge.type === 'part_of') links[out ? 'partOf' : 'parts'].push(other)
    else links.related.push(other)
  }
  for (const list of [links.prerequisites, links.leadsTo, links.partOf, links.related]) list.sort(byTitle)
  // What is inside it in the order to read it
  links.parts.sort(inReadingOrder(graph))
  const home = homes(graph).get(slug)
  links.home = home ? (nodes.get(home) ?? null) : null
  if (links.home) links.partOf = [links.home, ...links.partOf.filter((node) => node !== links.home)]
  return links
}

// Sorts nodes in the order to read them. A page goes by its place along
// the reading order (the next edges, chain after chain); a node with no
// page of its own by the earliest of the nodes that live in it, so a topic
// comes where its first page does. What the reading order leaves out goes
// after, by how deep it sits on the road of prerequisites, then by title.
export function inReadingOrder(graph: LearningGraph): (a: LearningNode, b: LearningNode) => number {
  const nodes = nodesBySlug(graph)
  const after = new Map<string, string>()
  const hasBefore = new Set<string>()
  for (const edge of graph.edges) {
    if (edge.type !== 'next') continue
    after.set(edge.source, edge.target)
    hasBefore.add(edge.target)
  }
  const step = new Map<string, number>()
  // The chains in the order their first pages sit on the road, then by title
  const layer = layers(graph)
  const starts = [...after.keys()]
    .filter((slug) => !hasBefore.has(slug))
    .sort((a, b) => (layer.get(a) ?? 0) - (layer.get(b) ?? 0) || (nodes.get(a)?.title ?? a).localeCompare(nodes.get(b)?.title ?? b))
  for (const start of starts) {
    for (let at: string | undefined = start; at !== undefined && !step.has(at); at = after.get(at)) step.set(at, step.size)
  }
  // A node off the reading order takes the earliest place inside it
  const inside = new Map<string, string[]>()
  for (const [child, parent] of homes(graph)) inside.set(parent, [...(inside.get(parent) ?? []), child])
  const visiting = new Set<string>()
  const place = new Map<string, number>()
  const placeOf = (slug: string): number => {
    const known = place.get(slug)
    if (known !== undefined) return known
    if (visiting.has(slug)) return Infinity
    visiting.add(slug)
    const value = step.get(slug) ?? Math.min(Infinity, ...(inside.get(slug) ?? []).map(placeOf))
    visiting.delete(slug)
    place.set(slug, value)
    return value
  }
  const depth = (slug: string) => layer.get(slug) ?? Infinity
  return (a, b) => {
    const [pa, pb] = [placeOf(a.slug), placeOf(b.slug)]
    if (pa !== pb) return pa < pb ? -1 : 1
    const [da, db] = [depth(a.slug), depth(b.slug)]
    if (da !== db) return da < db ? -1 : 1
    return byTitle(a, b)
  }
}

// Each node's home: the part_of edge marked home, or, where none is (a
// graph from before homes), its first part_of edge
export function homes(graph: LearningGraph): Map<string, string> {
  const home = new Map<string, string>()
  for (const edge of graph.edges) {
    if (edge.type === 'part_of' && edge.home) home.set(edge.source, edge.target)
  }
  for (const edge of graph.edges) {
    if (edge.type === 'part_of' && !home.has(edge.source)) home.set(edge.source, edge.target)
  }
  return home
}

export type Level = 1 | 2 | 3

export interface Place {
  // How deep it sits under its homes: 1 for a field, 2 for a topic in it, 3
  // for an idea in a topic (and anything deeper)
  level: Level
  // The level-2 topic it belongs to, which gives it its colour: itself for
  // a topic, none for a field
  area: string | null
}

// Where each node sits: its level and area, following homes upward. Nodes
// elsewhere (external links) have no place.
export function places(graph: LearningGraph): Map<string, Place> {
  const home = homes(graph)
  const found = new Map<string, Place>()
  for (const node of graph.nodes) {
    if (node.kind === 'external') continue
    // The chain of homes from the node to its field; a cycle (which the API
    // refuses) stops it
    const chain = [node.slug]
    for (let up = home.get(node.slug); up && !chain.includes(up); up = home.get(up)) chain.push(up)
    const depth = chain.length
    found.set(node.slug, {
      level: Math.min(depth, 3) as Level,
      area: depth >= 2 ? chain[depth - 2] : null,
    })
  }
  return found
}

// A colour per area, in a fixed order so an area keeps its colour as the map
// grows. Muted tones that sit beside the site's sage, lighter in the dark.
const AREA_COLOURS = {
  light: ['#6b8f8b', '#b07a5b', '#5b7aa0', '#a8925a', '#8a6b93', '#a8687a', '#5f8a6a', '#7f7a6e'],
  dark: ['#7fa8a3', '#c99577', '#7d9cc2', '#c4ad72', '#a88bb1', '#c48596', '#7fac8b', '#a39e91'],
}

export function areaColours(graph: LearningGraph, dark: boolean): Map<string, string> {
  const areas = [...new Set([...places(graph).values()].flatMap((place) => (place.area ? [place.area] : [])))].sort()
  const colours = AREA_COLOURS[dark ? 'dark' : 'light']
  return new Map(areas.map((area, i) => [area, colours[i % colours.length]]))
}

// The node and every node one edge away, either way
export function neighbours(graph: LearningGraph, slug: string): Set<string> {
  const near = new Set([slug])
  for (const edge of graph.edges) {
    if (edge.source === slug) near.add(edge.target)
    if (edge.target === slug) near.add(edge.source)
  }
  return near
}

// Every prerequisite of the node, direct or not, in an order to learn them:
// each one after its own prerequisites, ties by title
export function learnFirst(graph: LearningGraph, slug: string): LearningNode[] {
  const before = new Map<string, string[]>()
  for (const edge of graph.edges) {
    if (edge.type !== 'prerequisite') continue
    before.set(edge.target, [...(before.get(edge.target) ?? []), edge.source])
  }

  const needed = new Set<string>()
  const stack = [...(before.get(slug) ?? [])]
  while (stack.length > 0) {
    const next = stack.pop()!
    if (next === slug || needed.has(next)) continue
    needed.add(next)
    stack.push(...(before.get(next) ?? []))
  }

  const nodes = nodesBySlug(graph)
  const waitingOn = new Map([...needed].map((s) => [s, (before.get(s) ?? []).filter((p) => needed.has(p)).length]))
  const order: LearningNode[] = []
  const ready = [...needed].filter((s) => waitingOn.get(s) === 0)
  while (ready.length > 0) {
    ready.sort((a, b) => byTitle(nodes.get(a)!, nodes.get(b)!))
    const done = ready.shift()!
    order.push(nodes.get(done)!)
    for (const [s, count] of waitingOn) {
      if ((before.get(s) ?? []).includes(done)) {
        waitingOn.set(s, count - 1)
        if (count === 1) ready.push(s)
      }
    }
  }
  return order
}

// How far along its road each node is: 0 for one with nothing to learn
// first, and one more than its furthest prerequisite otherwise. Only nodes
// on a prerequisite edge have a layer; the layout lays the rest out freely.
export function layers(graph: LearningGraph): Map<string, number> {
  const before = new Map<string, string[]>()
  const onRoad = new Set<string>()
  for (const edge of graph.edges) {
    if (edge.type !== 'prerequisite') continue
    before.set(edge.target, [...(before.get(edge.target) ?? []), edge.source])
    onRoad.add(edge.source)
    onRoad.add(edge.target)
  }
  const layer = new Map<string, number>()
  // Depth first, with the nodes being visited kept apart, so that a cycle
  // (which the API refuses) cannot recurse forever
  const visiting = new Set<string>()
  const depth = (slug: string): number => {
    const known = layer.get(slug)
    if (known !== undefined) return known
    if (visiting.has(slug)) return 0
    visiting.add(slug)
    const value = Math.max(-1, ...(before.get(slug) ?? []).map(depth)) + 1
    visiting.delete(slug)
    layer.set(slug, value)
    return value
  }
  for (const slug of onRoad) depth(slug)
  return layer
}

// Every tag in the graph with how many nodes have it, most used first
export function tagCounts(graph: LearningGraph): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const node of graph.nodes) for (const tag of node.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

// What a search finds: the tags and the nodes it matches, best first. A
// node matches by its title, best where the title starts with the words
// typed, then by a tag, then by its summary. Nothing typed finds every tag
// and no node; a leading # looks for tags alone.
export function search(graph: LearningGraph, typed: string): { tags: { tag: string; count: number }[]; nodes: LearningNode[] } {
  const tagsOnly = typed.trim().startsWith('#')
  const query = typed.trim().replace(/^#/, '').trim().toLowerCase()
  const tags = tagCounts(graph)
  if (!query) return { tags, nodes: [] }
  const rank = (node: LearningNode) => {
    const title = node.title.toLowerCase()
    if (title.startsWith(query)) return 0
    if (title.split(/[^a-z0-9]+/).some((word) => word.startsWith(query))) return 1
    if (title.includes(query)) return 2
    if (node.tags.some((tag) => tag.startsWith(query))) return 3
    if (node.summary.toLowerCase().includes(query)) return 4
    return null
  }
  return {
    // Stable: those starting with it first, each lot most used first
    tags: tags.filter(({ tag }) => tag.includes(query)).sort((a, b) => Number(!a.tag.startsWith(query)) - Number(!b.tag.startsWith(query))),
    nodes: tagsOnly
      ? []
      : graph.nodes
          .flatMap((node) => {
            const at = rank(node)
            return at === null ? [] : [{ node, at }]
          })
          .sort((a, b) => a.at - b.at || byTitle(a.node, b.node))
          .map(({ node }) => node),
  }
}

export type Destination =
  | { kind: 'page'; to: string }
  | { kind: 'link'; href: string }
  // A learning whose page is not on the site yet
  | { kind: 'soon' }
  // A concept, which only gathers others
  | { kind: 'none' }

export function destination(node: LearningNode, hasPage: (slug: string) => boolean): Destination {
  if (node.kind === 'concept' || !node.ref) return { kind: 'none' }
  if (node.kind === 'external') return { kind: 'link', href: node.ref }
  const page = node.ref.match(/^\/learnings\/([a-z0-9-]+)$/)
  if (page && !hasPage(page[1])) return { kind: 'soon' }
  return { kind: 'page', to: node.ref }
}

// How far along each node is. A page is as far as it has been read; a node
// with no page of its own, only what is inside it, is as far as the least
// read of those. One with nothing to read inside it has no stage.
export function stagesOf(graph: LearningGraph, read: Map<string, Stage>, hasPage: (slug: string) => boolean): Map<string, Stage> {
  const parts = new Map<string, string[]>()
  for (const edge of graph.edges) {
    if (edge.type === 'part_of') parts.set(edge.target, [...(parts.get(edge.target) ?? []), edge.source])
  }
  const reached = new Map<string, Stage | null>()
  const inside = new Set<string>()
  const reach = (slug: string): Stage | null => {
    if (reached.has(slug)) return reached.get(slug)!
    // A loop of part_of edges
    if (inside.has(slug)) return null
    let stage: Stage | null = null
    if (hasPage(slug)) stage = read.get(slug) ?? 0
    else {
      inside.add(slug)
      const below = (parts.get(slug) ?? []).map(reach).filter((part) => part !== null)
      inside.delete(slug)
      if (below.length > 0) stage = Math.min(...below) as Stage
    }
    reached.set(slug, stage)
    return stage
  }
  const stages = new Map<string, Stage>()
  for (const node of graph.nodes) {
    const stage = reach(node.slug)
    if (stage !== null) stages.set(node.slug, stage)
  }
  return stages
}
