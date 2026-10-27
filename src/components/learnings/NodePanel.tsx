import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { destination, learnFirst, linksOf, places } from '../../lib/learningGraph'
import { countsFrom, fadesOn, type Progress } from '../../lib/progress'
import type { LearningGraph, LearningNode } from '../../types'

interface NodePanelProps {
  graph: LearningGraph
  node: LearningNode
  onSelect: (slug: string) => void
  // Moves along the reading order
  onGo: (slug: string) => void
  // Lights up every node with this tag
  onTag: (tag: string) => void
  hasPage: (slug: string) => boolean
  // How far the visitor has come with its page
  progress?: Progress
  // Opens the node's page in the panel, for a page on the site's map.
  // Without it, as beside the page already open, there is no Expand.
  onExpand?: () => void
}

const LEVEL_LABEL = { 1: 'Field', 2: 'Topic', 3: 'Idea' } as const

const day = (time: number) => new Date(time).toLocaleDateString('en', { month: 'short', day: 'numeric' })

// What reading its page does to the node, and when it fades back
function Growth({ progress }: { progress?: Progress }) {
  if (!progress) {
    return <>Read it and answer its checks, and its node cracks open.</>
  }
  const next = countsFrom(progress)
  const now = {
    1: `Cracked. Read it again from ${day(next ?? 0)}, getting its checks right, and it cracks further.`,
    2: `Light shows through. Once more from ${day(next ?? 0)}, its checks right, and it opens into a sun.`,
    3: 'A sun.',
  }[progress.stage]
  return (
    <>
      {now} Unread, it fades back on {day(fadesOn(progress))}.
    </>
  )
}

function NodeList({ title, nodes, onSelect, ordered = false }: {
  title: string
  nodes: LearningNode[]
  onSelect: (slug: string) => void
  ordered?: boolean
}) {
  if (nodes.length === 0) return null
  const List = ordered ? 'ol' : 'ul'
  return (
    <div>
      <h3 className="font-mono text-[0.8rem] uppercase tracking-widest text-zinc-400 mb-3">{title}</h3>
      <List className="flex flex-col gap-1.5">
        {nodes.map((node, index) => (
          <li key={node.slug}>
            <button
              onClick={() => onSelect(node.slug)}
              className="group flex w-full items-baseline gap-3 text-left text-sm text-zinc-faded hover:text-ink transition-colors"
            >
              {ordered && <span className="font-mono text-[0.8rem] text-sage w-5 shrink-0">{index + 1}</span>}
              <span className="border-b border-transparent group-hover:border-zinc-300">{node.title}</span>
            </button>
          </li>
        ))}
      </List>
    </div>
  )
}

// The selected node's card: what it is, where it leads, what to learn
// before it, and what to read next
export default function NodePanel({ graph, node, onSelect, onGo, onTag, hasPage, progress, onExpand }: NodePanelProps) {
  const links = linksOf(graph, node.slug)
  const place = places(graph).get(node.slug)
  const road = learnFirst(graph, node.slug)
  const to = destination(node, hasPage)

  return (
    <div key={node.slug} className="flex flex-col gap-8 animate-slide-enter">
      <div>
        <span className="font-mono text-[0.8rem] uppercase tracking-widest text-sage">{place ? LEVEL_LABEL[place.level] : 'Elsewhere'}</span>
        <h2 className="font-serif text-3xl font-light tracking-tight mt-2 mb-3">{node.title}</h2>
        <p className="text-sm text-zinc-faded leading-relaxed">{node.summary}</p>
        {node.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {node.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onTag(tag)}
                className="font-mono text-[0.8rem] text-zinc-400 hover:text-sage transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5">
          {to.kind === 'page' && to.to === `/learnings/${node.slug}` && onExpand && (
            <button
              onClick={onExpand}
              className="inline-flex items-center gap-2 border border-ink px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-ink hover:bg-ink hover:text-paper transition-colors"
            >
              <ArrowLeft size={14} /> Expand
            </button>
          )}
          {/* A page elsewhere on the site opens there */}
          {to.kind === 'page' && to.to !== `/learnings/${node.slug}` && (
            <Link
              to={to.to}
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-ink hover:text-sage transition-colors"
            >
              Open <ArrowRight size={14} />
            </Link>
          )}
          {to.kind === 'link' && (
            <a
              href={to.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-ink hover:text-sage transition-colors"
            >
              Read it <ArrowUpRight size={14} />
            </a>
          )}
          {to.kind === 'soon' && (
            <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">Page coming soon</span>
          )}
        </div>
        {to.kind === 'page' && to.to === `/learnings/${node.slug}` && (
          <p className="mt-4 text-xs leading-relaxed text-zinc-400">
            <Growth progress={progress} />
          </p>
        )}
      </div>

      <NodeList title="Learn first" nodes={road} onSelect={onSelect} ordered />
      <NodeList title="Then" nodes={links.leadsTo} onSelect={onSelect} />
      <NodeList title="Lives in" nodes={links.home ? [links.home] : []} onSelect={onSelect} />
      <NodeList title="Also part of" nodes={links.partOf.filter((n) => n !== links.home)} onSelect={onSelect} />
      <NodeList title="Inside" nodes={links.parts} onSelect={onSelect} />
      <NodeList title="Related" nodes={links.related} onSelect={onSelect} />
      {/* Along the reading order, last: the map flies there */}
      <NodeList title="Before" nodes={links.readBefore ? [links.readBefore] : []} onSelect={onGo} />
      <NodeList title="Next" nodes={links.readNext ? [links.readNext] : []} onSelect={onGo} />
    </div>
  )
}
