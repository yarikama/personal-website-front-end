import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Reading } from '../components/explain/Reading'
import Overview from '../components/learnings/Overview'
import ReadOn from '../components/learnings/ReadOn'
import Section from '../components/layout/Section'
import { useLearningGraph } from '../hooks/useLearningGraph'
import { hasOverview, linksOf, stagesOf } from '../lib/learningGraph'
import { useProgress } from '../lib/progress'
import { findLearningPage } from '../learnings'
import { useLearningPage } from '../learnings/useLearningPage'

const hasPage = (slug: string) => findLearningPage(slug) !== undefined

// A learning at /learnings/:slug: its page is code in src/learnings, loaded
// on opening so that one page's figures never weigh on the rest of the site.
// A field or topic's page is its overview, from the graph.
export default function LearningPage() {
  const { slug } = useParams()
  const { entry, Page, failed } = useLearningPage(slug)
  // For the pages before and after this one, and an overview
  const { graph, isLoading } = useLearningGraph()
  const links = graph && slug ? linksOf(graph, slug) : null
  const index = entry ? undefined : graph?.nodes.find((node) => node.slug === slug && hasOverview(node))
  const progress = useProgress()
  const stages = useMemo(() => {
    const read = new Map(Object.entries(progress).map(([page, { stage }]) => [page, stage]))
    return graph ? stagesOf(graph, read, hasPage) : read
  }, [graph, progress])

  // Next and Before open another page here: start it from the top
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  const back = (
    <Link
      to={slug ? `/learnings?node=${slug}` : '/learnings'}
      className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-faded hover:text-ink transition-colors mb-12"
    >
      <ArrowLeft size={14} />
      The map
    </Link>
  )

  if (!entry && index && graph) {
    return (
      <div className="pt-24">
        <Section reading>
          {back}
          <Overview graph={graph} node={index} stages={stages} hasPage={hasPage} />
        </Section>
      </div>
    )
  }

  // A slug with no page of its own may be a field or topic's, once the graph is in
  if (!entry && isLoading) {
    return (
      <div className="pt-24">
        <Section reading>
          {back}
          <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin text-zinc-400" />
        </Section>
      </div>
    )
  }

  if (!entry || failed) {
    return (
      <div className="pt-24">
        <Section reading>
          {back}
          <p className="font-serif text-2xl text-zinc-faded italic">
            {entry ? 'This page did not load. Try reloading it.' : 'This page is not written yet.'}
          </p>
        </Section>
      </div>
    )
  }

  return (
    <div className="pt-24">
      <Section reading>
        {back}
        {Page && slug && (
          <Reading slug={slug}>
            <Page />
          </Reading>
        )}
        {Page && links && (
          <div className="mt-16">
            <ReadOn
              before={links.readBefore}
              next={links.readNext}
              hasPage={hasPage}
            />
          </div>
        )}
      </Section>
    </div>
  )
}
