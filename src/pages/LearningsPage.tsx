import { Component, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, List, Loader2, X } from 'lucide-react'
import Graph3D from '../components/learnings/Graph3D'
import NodePanel from '../components/learnings/NodePanel'
import ThemeToggle from '../components/ui/ThemeToggle'
import { usePrefersReducedMotion } from '../hooks'
import { useLearningGraph } from '../hooks/useLearningGraph'
import { findLearningPage } from '../learnings'
import { linksOf, tagCounts } from '../lib/learningGraph'
import type { LearningGraph, LearningNode } from '../types'

const hasPage = (slug: string) => findLearningPage(slug) !== undefined

const overlay =
  'bg-paper/85 backdrop-blur-md border border-zinc-200 dark:border-zinc-200/20 transition-colors duration-300'

function useWindowSize() {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight })
  const [size, setSize] = useState(read)
  useEffect(() => {
    const resize = () => setSize(read())
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  return size
}

// Without WebGL the graph cannot be drawn: the list of topics stands in
class GraphBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function Legend() {
  const item = 'inline-flex items-center gap-2'
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">
      <span className={item}>
        <span className="h-2.5 w-2.5 rounded-full bg-sage" />
        Learning
      </span>
      <span className={item}>
        <span className="h-3.5 w-3.5 rounded-full border-[1.5px] border-ink" />
        Concept
      </span>
      <span className={item}>
        <span className="h-2 w-2 rounded-full bg-zinc-faded" />
        Elsewhere
      </span>
      <span className={item}>
        <span className="h-px w-5 bg-zinc-400" />
        <span aria-hidden>›</span>
        Learn before
      </span>
    </div>
  )
}

// The tags to light up a region of the graph by, most used first
function TagBar({ graph, tag, onTag }: { graph: LearningGraph; tag: string | null; onTag: (tag: string | null) => void }) {
  const tags = useMemo(() => tagCounts(graph), [graph])
  if (tags.length === 0) return null
  return (
    <div className="pointer-events-auto mt-4 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
      {tags.map(({ tag: name, count }) => {
        const active = name === tag
        return (
          <button
            key={name}
            onClick={() => onTag(active ? null : name)}
            aria-pressed={active}
            className={`shrink-0 px-2.5 py-1 font-mono text-[0.8rem] uppercase tracking-widest transition-colors ${
              active
                ? 'border border-sage bg-sage/15 text-sage'
                : `text-zinc-faded hover:text-ink ${overlay}`
            }`}
          >
            {name}
            <span className="ml-1.5 opacity-60">{count}</span>
          </button>
        )
      })}
    </div>
  )
}

// Every node as a list, by the concept it is part of: the graph's text
// version, for screen readers, small screens and browsers without WebGL
function Topics({ graph, onSelect }: { graph: LearningGraph; onSelect: (slug: string) => void }) {
  const groups = useMemo(() => {
    const grouped = new Set<string>()
    const byConcept = graph.nodes
      .filter((node) => node.kind === 'concept')
      .map((concept) => {
        const parts = linksOf(graph, concept.slug).parts
        for (const part of parts) grouped.add(part.slug)
        return { concept, parts }
      })
    const loose = graph.nodes.filter((node) => node.kind !== 'concept' && !grouped.has(node.slug))
    return { byConcept, loose }
  }, [graph])

  const item = (node: LearningNode) => (
    <li key={node.slug}>
      <button onClick={() => onSelect(node.slug)} className="text-left text-sm text-zinc-faded hover:text-ink transition-colors">
        {node.title}
      </button>
    </li>
  )

  return (
    <div className="flex flex-col gap-7">
      {groups.byConcept.map(({ concept, parts }) => (
        <div key={concept.slug}>
          <button onClick={() => onSelect(concept.slug)} className="font-serif text-xl italic mb-2 hover:text-sage transition-colors">
            {concept.title}
          </button>
          <ul className="flex flex-col gap-1">{parts.map(item)}</ul>
        </div>
      ))}
      {groups.loose.length > 0 && (
        <div>
          <p className="font-serif text-xl italic mb-2">Elsewhere</p>
          <ul className="flex flex-col gap-1">{groups.loose.map(item)}</ul>
        </div>
      )}
    </div>
  )
}

// The Learnings map, the whole screen: a 3D knowledge graph to turn, zoom
// and pick from, with the chosen topic's card and road beside it
export default function LearningsPage() {
  const { graph, isDemo, isLoading } = useLearningGraph()
  const reducedMotion = usePrefersReducedMotion()
  const { width, height } = useWindowSize()
  const [params, setParams] = useSearchParams()
  const [showTopics, setShowTopics] = useState(false)

  // The selected node and tag are in the address, so a link can open the
  // map on them
  const selectedSlug = params.get('node')
  const selected = graph?.nodes.find((node) => node.slug === selectedSlug) ?? null
  const tag = params.get('tag')
  const change = (key: 'node' | 'tag', value: string | null) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true }
    )
  const select = (slug: string | null) => change('node', slug)
  const highlight = (name: string | null) => change('tag', name)
  const pick = (slug: string) => {
    select(slug)
    setShowTopics(false)
  }

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Learnings | Henry Hsu'
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden bg-paper text-ink">
      {isLoading || !graph ? (
        <div className="flex h-full flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-4" />
          <p className="text-sm text-zinc-400">Loading the map...</p>
        </div>
      ) : (
        <GraphBoundary
          fallback={
            <div className="h-full overflow-y-auto px-6 pt-48 pb-16">
              <Topics graph={graph} onSelect={pick} />
            </div>
          }
        >
          <Graph3D
            graph={graph}
            width={width}
            height={height}
            selected={selected?.slug ?? null}
            onSelect={select}
            tag={tag}
            reducedMotion={reducedMotion}
          />
        </GraphBoundary>
      )}

      {/* Title, top left */}
      <header className="pointer-events-none absolute left-4 top-4 md:left-8 md:top-6 max-w-[calc(100%-7rem)]">
        <Link
          to="/"
          className="pointer-events-auto inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-faded hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} />
          Home
        </Link>
        <h1 className="font-serif text-3xl md:text-4xl font-light tracking-tight mt-3">Learnings</h1>
        <p className="mt-1 text-sm text-zinc-faded max-w-xs">A map of what I learn. Turn it, zoom in, pick a topic.</p>
        {isDemo && (
          <p className={`mt-3 inline-flex items-center gap-2 px-2.5 py-1 font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded ${overlay}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-sage" />
            Sample map
          </p>
        )}
        {graph && <TagBar graph={graph} tag={tag} onTag={highlight} />}
      </header>

      {/* Controls, top right */}
      <div className="absolute right-4 top-4 md:right-8 md:top-6 flex items-center gap-2">
        <button
          onClick={() => setShowTopics((open) => !open)}
          className={`inline-flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-widest text-zinc-faded hover:text-ink ${overlay}`}
          aria-expanded={showTopics}
        >
          {showTopics ? <X size={14} /> : <List size={14} />}
          Topics
        </button>
        <div className={overlay}>
          <ThemeToggle />
        </div>
      </div>

      {/* Every topic, as a list */}
      {showTopics && graph && (
        <nav
          aria-label="Every topic"
          className={`absolute right-4 top-20 md:right-8 bottom-4 w-[min(20rem,calc(100%-2rem))] overflow-y-auto p-6 animate-slide-enter ${overlay}`}
        >
          <Topics graph={graph} onSelect={pick} />
        </nav>
      )}

      {/* The chosen topic: right on a wide screen, a sheet at the bottom on a phone */}
      {selected && graph && !showTopics && (
        <aside
          aria-live="polite"
          className={`absolute inset-x-4 bottom-4 max-h-[45dvh] md:inset-x-auto md:right-8 md:top-20 md:bottom-6 md:max-h-none md:w-80 overflow-y-auto p-6 ${overlay}`}
        >
          <button
            onClick={() => select(null)}
            className="absolute right-3 top-3 p-1 text-zinc-faded hover:text-ink transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
          <NodePanel graph={graph} node={selected} onSelect={select} onTag={highlight} hasPage={hasPage} />
        </aside>
      )}

      {/* Legend and how to move it, bottom left */}
      {!selected && (
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 md:bottom-6 md:left-8 flex flex-col gap-2">
          <Legend />
          <p className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-400">
            Drag to turn · scroll to zoom · drag a node to move it
          </p>
        </div>
      )}
    </div>
  )
}
