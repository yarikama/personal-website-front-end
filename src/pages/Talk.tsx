import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Deck from '../components/talk/Deck'
import PresenterView from '../components/talk/PresenterView'
import { TalkContext, type Talk as TalkData } from '../components/talk/talk'
import { findTalk } from '../talks'
import { usePageMeta } from '../lib/pageMeta'

// A talk at /talks/:slug, and its presenter window at /talks/:slug/presenter.
// Private talks are kept out of search results: links to share, not pages to find.
export default function Talk({ presenter = false }: { presenter?: boolean }) {
  const { slug } = useParams()
  const entry = findTalk(slug)
  const [talk, setTalk] = useState<TalkData | null>(null)
  const [failed, setFailed] = useState(false)

  // Slides load on opening, so a talk's figures never weigh on the rest of the site
  useEffect(() => {
    if (!entry) return
    let live = true
    const { load, ...meta } = entry
    load()
      .then(({ default: content }) => live && setTalk({ ...meta, ...content }))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [entry])

  usePageMeta(
    entry
      ? {
          title: presenter ? `Presenter | ${entry.title}` : entry.title,
          description: entry.summary,
          noindex: entry.visibility === 'private' || presenter,
        }
      : { title: 'Talk not found', noindex: true },
  )

  if (!entry || failed) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-paper text-ink">
        <p className="font-serif text-2xl text-zinc-faded italic">
          {entry ? 'This talk did not load. Try reloading the page.' : 'There is no talk here.'}
        </p>
        <Link to="/talks" className="font-mono text-xs uppercase tracking-widest text-sage hover:underline">
          All talks
        </Link>
      </div>
    )
  }

  if (!talk) return null

  return <TalkContext.Provider value={talk}>{presenter ? <PresenterView /> : <Deck />}</TalkContext.Provider>
}
