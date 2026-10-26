import { useEffect, useState, type ComponentType } from 'react'
import { findLearningPage } from '.'

// A learning page's component, loaded on first use so that one page's
// figures never weigh on the rest of the site. `entry` is undefined for a
// slug with no page; `failed` if loading it did.
export function useLearningPage(slug: string | undefined) {
  const entry = findLearningPage(slug)
  const [loaded, setLoaded] = useState<{ slug: string; Page: ComponentType } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!entry) return
    let live = true
    setFailed(false)
    entry
      .load()
      .then(({ default: Page }) => live && setLoaded({ slug: entry.slug, Page }))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [entry])

  // Never the page of the slug before, while the new one loads
  const Page = loaded && loaded.slug === entry?.slug ? loaded.Page : null
  return { entry, Page, failed }
}
