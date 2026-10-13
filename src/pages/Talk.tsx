import { useEffect } from 'react'
import Deck from '../components/talk/Deck'
import PresenterView from '../components/talk/PresenterView'
import { slides } from '../components/talk/slides'

// The interview talk at /talk, and its presenter window at /talk/presenter.
// Kept out of search results: it is a link to share, not a page to find.
export default function Talk({ presenter = false }: { presenter?: boolean }) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = presenter ? 'Presenter | Henry Hsu' : 'Henry Hsu | Talk'
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex'
    document.head.appendChild(robots)
    return () => {
      document.title = previousTitle
      robots.remove()
    }
  }, [presenter])

  return presenter ? <PresenterView slides={slides} /> : <Deck slides={slides} />
}
