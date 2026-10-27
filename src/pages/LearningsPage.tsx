import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpRight, List, Loader2, RotateCcw, X } from 'lucide-react'
import { motion } from 'motion/react'
import Graph3D from '../components/learnings/Graph3D'
import NodePanel from '../components/learnings/NodePanel'
import ReadOn from '../components/learnings/ReadOn'
import ThemeToggle from '../components/ui/ThemeToggle'
import { usePrefersReducedMotion } from '../hooks'
import { useLearningGraph } from '../hooks/useLearningGraph'
import { findLearningPage } from '../learnings'
import { useLearningPage } from '../learnings/useLearningPage'
import { areaColours, homes, linksOf, places, tagCounts } from '../lib/learningGraph'
import { useIsDark } from '../lib/theme'
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

// A node's shape: a regular polygon of `sides`, or a circle for 0
function Shape({ sides, size, colour }: { sides: number; size: number; colour: string }) {
  const half = size / 2
  const points = Array.from({ length: sides }, (_, i) => {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2 + Math.PI / sides
    return `${half + Math.cos(angle) * half},${half + Math.sin(angle) * half}`
  }).join(' ')
  return (
    <svg width={size} height={size} aria-hidden className="shrink-0">
      {sides ? <polygon points={points} fill={colour} /> : <circle cx={half} cy={half} r={half} fill={colour} />}
    </svg>
  )
}

// What the shapes and colours mean: a shape per level, a colour per area
function Legend({ graph }: { graph: LearningGraph }) {
  const dark = useIsDark()
  const colours = useMemo(() => areaColours(graph, dark), [graph, dark])
  const titles = useMemo(() => new Map(graph.nodes.map((node) => [node.slug, node.title])), [graph])
  const item = 'inline-flex items-center gap-2'
  const ink = 'var(--color-ink)'
  return (
    <div className="flex flex-col gap-2 font-mono text-[0.8rem] uppercase tracking-widest text-zinc-faded">
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        <span className={item}>
          <Shape sides={6} size={14} colour={ink} />
          Field
        </span>
        <span className={item}>
          <Shape sides={8} size={12} colour={ink} />
          Topic
        </span>
        <span className={item}>
          <Shape sides={0} size={9} colour={ink} />
          Idea
        </span>
        <span className={item}>
          <span className="h-px w-5 bg-zinc-400" />
          <span aria-hidden>›</span>
          Learn before
        </span>
      </div>
      {/* On a phone the graph needs the room; the Topics list shows the areas */}
      {colours.size > 1 && colours.size <= 8 && (
        <div className="hidden md:flex flex-wrap gap-x-5 gap-y-1.5">
          {[...colours].map(([area, colour]) => (
            <span key={area} className={item}>
              <Shape sides={0} size={9} colour={colour} />
              {titles.get(area)}
            </span>
          ))}
        </div>
      )}
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

// Every node as a list: each field, the topics in it and the ideas in each
// topic, an idea listed under every topic it is part of. The graph's text
// version, for screen readers, small screens and browsers without WebGL.
function Topics({ graph, onSelect }: { graph: LearningGraph; onSelect: (slug: string) => void }) {
  const dark = useIsDark()
  const { fields, elsewhere, home, colours } = useMemo(() => {
    const at = places(graph)
    const parts = (slug: string) => linksOf(graph, slug).parts
    return {
      fields: graph.nodes
        .filter((node) => at.get(node.slug)?.level === 1)
        .map((field) => ({ field, topics: parts(field.slug).map((topic) => ({ topic, ideas: parts(topic.slug) })) })),
      elsewhere: graph.nodes.filter((node) => !at.has(node.slug)),
      home: homes(graph),
      colours: areaColours(graph, dark),
    }
  }, [graph, dark])

  const pick = (node: LearningNode, className: string) => (
    <button onClick={() => onSelect(node.slug)} className={`text-left transition-colors ${className}`}>
      {node.title}
    </button>
  )

  return (
    <div className="flex flex-col gap-8">
      {fields.map(({ field, topics }) => (
        <div key={field.slug}>
          {pick(field, 'font-serif text-2xl hover:text-sage')}
          <div className="mt-4 flex flex-col gap-5">
            {topics.map(({ topic, ideas }) => (
              <div key={topic.slug}>
                <div className="flex items-center gap-2">
                  <Shape sides={8} size={10} colour={colours.get(topic.slug) ?? 'var(--color-ink)'} />
                  {pick(topic, 'font-serif text-lg italic hover:text-sage')}
                </div>
                <ul className="mt-1 ml-[18px] flex flex-col gap-1">
                  {ideas.map((idea) => (
                    <li key={idea.slug} className="text-sm">
                      {pick(idea, 'text-zinc-faded hover:text-ink')}
                      {home.get(idea.slug) !== topic.slug && <span className="ml-2 text-xs text-zinc-400">also here</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
      {elsewhere.length > 0 && (
        <div>
          <p className="font-serif text-xl italic mb-2">Elsewhere</p>
          <ul className="flex flex-col gap-1">
            {elsewhere.map((node) => (
              <li key={node.slug} className="text-sm">
                {pick(node, 'text-zinc-faded hover:text-ink')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// A learning page read inside the map's panel: a bar to fold it back into
// the card, open it on its own, or close it, the page under it, and the
// pages before and after it, which `onGo` moves the map to
function Reader({
  graph,
  slug,
  onCollapse,
  onClose,
  onGo,
}: {
  graph: LearningGraph
  slug: string
  onCollapse: () => void
  onClose: () => void
  onGo: (slug: string) => void
}) {
  const { Page, failed } = useLearningPage(slug)
  const links = linksOf(graph, slug)
  // The panel scrolls, not the window: a new page starts at its top
  const top = useRef<HTMLDivElement>(null)
  useEffect(() => {
    top.current?.parentElement?.scrollTo({ top: 0 })
  }, [slug])
  const control = 'inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-faded hover:text-ink transition-colors'
  return (
    <div ref={top}>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-200/20 bg-paper/90 backdrop-blur-md px-6 py-3">
        <button onClick={onCollapse} className={control} aria-label="Collapse into the card">
          <ArrowRight size={14} /> Collapse
        </button>
        <div className="flex items-center gap-5">
          <Link to={`/learnings/${slug}`} className={control}>
            View full page <ArrowUpRight size={14} />
          </Link>
          <button onClick={onClose} className="p-1 text-zinc-faded hover:text-ink transition-colors" aria-label="Close">
            <X size={16} />
          </button>
        </div>
      </div>
      <motion.div
        key={slug}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="px-6 py-8 md:px-10"
      >
        {failed ? (
          <p className="font-serif text-xl text-zinc-faded italic">This page did not load. Try opening it on its own.</p>
        ) : Page ? (
          <>
            <Page />
            <div className="mt-16">
              <ReadOn before={links.readBefore} next={links.readNext} onGo={onGo} hasPage={hasPage} />
            </div>
          </>
        ) : (
          <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin text-zinc-400" />
        )}
      </motion.div>
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
  // Each reset draws the graph afresh: laid out, framed and turning as when
  // the page was opened
  const [drawing, setDrawing] = useState(0)
  const reset = () => {
    setParams({}, { replace: true })
    setShowTopics(false)
    setDrawing((n) => n + 1)
  }

  // The selected node and tag are in the address, so a link can open the
  // map on them
  const selectedSlug = params.get('node')
  const selected = graph?.nodes.find((node) => node.slug === selectedSlug) ?? null
  const tag = params.get('tag')
  // The page being read in the panel: also in the address (read=1)
  const reading = params.get('read') === '1' && selected !== null && hasPage(selected.slug)
  const change = (values: Partial<Record<'node' | 'tag' | 'read', string | null>>) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(values)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true }
    )
  // Choosing another node goes back to its card
  const select = (slug: string | null) => change({ node: slug, read: null })
  const highlight = (name: string | null) => change({ tag: name })
  const expand = () => change({ read: '1' })
  const collapse = () => change({ read: null })
  // Along the reading order: the map flies to the node, and a page being
  // read goes on to the next page
  const readOn = (slug: string) => change({ node: slug, read: reading && hasPage(slug) ? '1' : null })

  // Escape folds the page back into the card
  useEffect(() => {
    if (!reading) return
    const fold = (event: KeyboardEvent) => {
      if (event.key === 'Escape') collapse()
    }
    window.addEventListener('keydown', fold)
    return () => window.removeEventListener('keydown', fold)
    // collapse only writes the address, which this effect doesn't read
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reading])
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
            key={drawing}
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
          onClick={reset}
          className={`inline-flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-widest text-zinc-faded hover:text-ink ${overlay}`}
          aria-label="Reset the map"
        >
          <RotateCcw size={14} />
          <span className="hidden sm:inline">Reset</span>
        </button>
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

      {/* The chosen topic: right on a wide screen, a sheet at the bottom on a
          phone. Expanded, the same panel widens to the left with the page in
          it; on a phone it takes the screen below the title. */}
      {selected && graph && !showTopics && (
        <aside
          aria-live="polite"
          // The overlay's own transition-colors would otherwise win, and the
          // width would jump instead of growing to the left
          style={{ transitionProperty: 'width, background-color, border-color' }}
          className={`absolute inset-x-4 bottom-4 md:inset-x-auto md:right-8 md:top-20 md:bottom-6 md:max-h-none md:max-w-[calc(100vw-4rem)] overflow-y-auto overscroll-contain duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${overlay} ${
            reading ? 'top-20 md:w-[48rem]' : 'max-h-[45dvh] p-6 md:w-80'
          }`}
        >
          {reading ? (
            <Reader
              graph={graph}
              slug={selected.slug}
              onCollapse={collapse}
              onClose={() => select(null)}
              onGo={readOn}
            />
          ) : (
            <>
              <button
                onClick={() => select(null)}
                className="absolute right-3 top-3 p-1 text-zinc-faded hover:text-ink transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
              <NodePanel
                graph={graph}
                node={selected}
                onSelect={select}
                onGo={readOn}
                onTag={highlight}
                hasPage={hasPage}
                onExpand={expand}
              />
            </>
          )}
        </aside>
      )}

      {/* Legend and how to move it, bottom left */}
      {!selected && (
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 md:bottom-6 md:left-8 flex flex-col gap-2">
          {graph && <Legend graph={graph} />}
          <p className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-400">
            Drag to turn · scroll to zoom · drag a node to move it
          </p>
        </div>
      )}
    </div>
  )
}
