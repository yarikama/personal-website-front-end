import { useEffect, useState, type ComponentType } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Section from '../components/layout/Section'
import { findLearningPage } from '../learnings'

// A learning at /learnings/:slug: its page is code in src/learnings, loaded
// on opening so that one page's figures never weigh on the rest of the site
export default function LearningPage() {
  const { slug } = useParams()
  const entry = findLearningPage(slug)
  const [Page, setPage] = useState<ComponentType | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!entry) return
    let live = true
    entry
      .load()
      .then(({ default: loaded }) => live && setPage(() => loaded))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [entry])

  const back = (
    <Link
      to={slug ? `/learnings?node=${slug}` : '/learnings'}
      className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-zinc-faded hover:text-ink transition-colors mb-12"
    >
      <ArrowLeft size={14} />
      The map
    </Link>
  )

  if (!entry || failed) {
    return (
      <div className="pt-24">
        <Section narrow>
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
      <Section narrow>
        {back}
        {Page && <Page />}
      </Section>
    </div>
  )
}
