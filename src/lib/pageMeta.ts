import { useEffect } from 'react'

// Each public page's title, description, canonical address and link
// preview, for search engines and for LinkedIn, Slack and the like. The
// address is always on the canonical host, without its query, so that
// /learnings?node=ppo counts as /learnings. Google runs the page's script
// and reads the tags as they stand after it.

import { headFor, type Head, type PageMeta } from './head'

export { canonical, clip, headFor, DEFAULT_DESCRIPTION, DEFAULT_IMAGE, DEFAULT_TITLE, PAGES, SITE } from './head'
export type { Head, PageMeta } from './head'

function tag(selector: string, create: () => HTMLElement): HTMLElement {
  const found = document.head.querySelector<HTMLElement>(selector)
  if (found) return found
  const made = create()
  document.head.appendChild(made)
  return made
}

function meta(attribute: 'name' | 'property', key: string, content: string) {
  tag(`meta[${attribute}="${key}"]`, () => {
    const made = document.createElement('meta')
    made.setAttribute(attribute, key)
    return made
  }).setAttribute('content', content)
}

export function applyHead(head: Head): void {
  document.title = head.title
  meta('name', 'description', head.description)
  tag('link[rel="canonical"]', () => {
    const made = document.createElement('link')
    made.rel = 'canonical'
    return made
  }).setAttribute('href', head.canonical)
  meta('property', 'og:title', head.title)
  meta('property', 'og:description', head.description)
  meta('property', 'og:url', head.canonical)
  meta('property', 'og:image', head.image)
  meta('property', 'og:type', head.type)
  meta('name', 'twitter:title', head.title)
  meta('name', 'twitter:description', head.description)
  meta('name', 'twitter:image', head.image)
  const robots = document.head.querySelector('meta[name="robots"]')
  if (head.noindex) meta('name', 'robots', 'noindex')
  else robots?.remove()
}

/**
 * Sets the page's head while it is shown; null while its content is still
 * loading, so that the head is not set twice. Every public page calls it,
 * so each one sets the whole head and nothing carries over from the last.
 */
export function usePageMeta(meta: PageMeta | null): void {
  const key = meta ? JSON.stringify(meta) : null
  useEffect(() => {
    if (key === null) return
    applyHead(headFor(JSON.parse(key) as PageMeta, window.location.pathname))
  }, [key])
}
