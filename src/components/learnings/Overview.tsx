import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { destination, hasOverview, linksOf, paragraphs, places } from '../../lib/learningGraph'
import type { Stage } from '../../lib/progress'
import type { LearningGraph, LearningNode } from '../../types'
import { Checks } from './NodePanel'

const LEVEL = { 1: 'Field', 2: 'Topic', 3: 'Idea' } as const

interface OverviewProps {
  graph: LearningGraph
  node: LearningNode
  stages: Map<string, Stage>
  hasPage: (slug: string) => boolean
  // Opens a node inside it, as the map's panel does; without it, a link
  onOpen?: (slug: string) => void
}

// A field or topic's page: what it is about, why it matters and the way
// through, then what is inside it in the order to read it. Written in the
// graph, not in code, so it changes as nodes join.
export default function Overview({ graph, node, stages, hasPage, onOpen }: OverviewProps) {
  const links = linksOf(graph, node.slug)
  const place = places(graph).get(node.slug)
  const kicker = [links.home?.title, place ? LEVEL[place.level] : null].filter(Boolean).join(' · ')
  const elsewhere = links.related.filter((other) => other.kind === 'external')

  const open = (other: LearningNode, children: ReactNode) => {
    const className = 'text-left hover:text-sage transition-colors'
    if (onOpen) {
      return (
        <button onClick={() => onOpen(other.slug)} className={className}>
          {children}
        </button>
      )
    }
    const to = destination(other, hasPage)
    const path = to.kind === 'page' ? to.to : hasOverview(other) ? `/learnings/${other.slug}` : `/learnings?node=${other.slug}`
    return (
      <Link to={path} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <article>
      <header className="mb-12">
        <span className="font-mono text-sm text-zinc-400 uppercase tracking-widest">{kicker}</span>
        <h1 className="font-serif text-4xl md:text-5xl font-light tracking-tight mt-4 mb-8">{node.title}</h1>
        <p className="font-serif text-2xl font-light leading-snug text-zinc-faded">{node.summary}</p>
      </header>

      <div className="flex flex-col gap-5 text-lg leading-relaxed text-zinc-faded">
        {paragraphs(node.overview).map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      {links.parts.length > 0 && (
        <section className="mt-16">
          <h2 className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-400 mb-6">Inside, in reading order</h2>
          <ol className="flex flex-col gap-6">
            {links.parts.map((part, i) => (
              <li key={part.slug} className="flex gap-4">
                <span className="w-6 shrink-0 pt-1 font-mono text-sm text-sage">{i + 1}</span>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    {open(part, <span className="font-serif text-xl font-light">{part.title}</span>)}
                    <Checks stage={stages.get(part.slug)} />
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-faded">{part.summary}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {elsewhere.length > 0 && (
        <footer className="mt-16">
          <h2 className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-400 mb-4">Read more</h2>
          <ul className="flex flex-col gap-3">
            {elsewhere.map((other) => (
              <li key={other.slug} className="text-sm leading-relaxed text-zinc-faded">
                <a href={other.ref ?? undefined} target="_blank" rel="noopener noreferrer" className="italic text-ink hover:text-sage">
                  {other.title}
                </a>
                , {other.summary}
              </li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  )
}
