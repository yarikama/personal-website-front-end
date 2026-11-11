import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Section from '../components/layout/Section'
import { PAGES, usePageMeta } from '../lib/pageMeta'

// Any address the site has no page for. A single-page app answers every
// address with 200, so `noindex` is what keeps these out of search.
export default function NotFound() {
  usePageMeta(PAGES.notFound)
  return (
    <div className="pt-24">
      <Section>
        <div className="py-24">
          <span className="font-mono text-sm text-zinc-400 uppercase tracking-widest">404</span>
          <h1 className="font-serif text-5xl md:text-6xl font-light mt-4 tracking-tight">Nothing here</h1>
          <p className="mt-6 text-zinc-faded max-w-xl text-lg">This page does not exist, or it has moved.</p>
          <Link
            to="/"
            className="mt-10 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-sage hover:underline"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Home
          </Link>
        </div>
      </Section>
    </div>
  )
}
