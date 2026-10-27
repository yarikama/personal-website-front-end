import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { LearningNode } from '../../types'

interface ReadOnProps {
  before: LearningNode | null
  next: LearningNode | null
  // On the map: move along it, to the node. Without it, each is a link to
  // the node's page, or to it on the map if it has none.
  onGo?: (slug: string) => void
  hasPage: (slug: string) => boolean
}

// The pages before and after one in the reading order: the next one large,
// the one before small. Nothing when there is neither.
export default function ReadOn({ before, next, onGo, hasPage }: ReadOnProps) {
  if (!before && !next) return null

  const go = (node: LearningNode, className: string, children: ReactNode) =>
    onGo ? (
      <button onClick={() => onGo(node.slug)} className={className}>
        {children}
      </button>
    ) : (
      <Link to={hasPage(node.slug) ? `/learnings/${node.slug}` : `/learnings?node=${node.slug}`} className={className}>
        {children}
      </Link>
    )

  return (
    <nav aria-label="Reading order" className="not-prose flex flex-col gap-4">
      {next &&
        go(
          next,
          'group flex w-full items-center justify-between gap-4 border border-ink px-5 py-4 text-left transition-colors hover:bg-ink hover:text-paper',
          <>
            <span className="flex flex-col gap-1">
              <span className="font-mono text-[0.8rem] uppercase tracking-widest text-sage group-hover:text-paper">
                Next
              </span>
              <span className="font-serif text-2xl font-light leading-tight">{next.title}</span>
            </span>
            <ArrowRight size={18} className="shrink-0" />
          </>
        )}
      {before &&
        go(
          before,
          'inline-flex items-center gap-2 self-start font-mono text-xs uppercase tracking-widest text-zinc-faded transition-colors hover:text-ink',
          <>
            <ArrowLeft size={14} /> Before: {before.title}
          </>
        )}
    </nav>
  )
}
