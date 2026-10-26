import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Section from '../components/layout/Section'
import { useLearningPage } from '../learnings/useLearningPage'

// A learning at /learnings/:slug: its page is code in src/learnings, loaded
// on opening so that one page's figures never weigh on the rest of the site
export default function LearningPage() {
  const { slug } = useParams()
  const { entry, Page, failed } = useLearningPage(slug)

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
