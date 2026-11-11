import { useEffect } from 'react'

// Each public page's title, description, canonical address and link
// preview, for search engines and for LinkedIn, Slack and the like. The
// address is always on the canonical host, without its query, so that
// /learnings?node=ppo counts as /learnings. Google runs the page's script
// and reads the tags as they stand after it.

export const SITE = 'https://www.yarikama.com'
export const NAME = 'Henry Hsu'
export const DEFAULT_TITLE = `${NAME} | Software Engineer, GenAI & Infrastructure`
export const DEFAULT_DESCRIPTION =
  'Henry Hsu builds GenAI systems and the infrastructure behind them. Former Google SWE intern and MaiAgent GenAI team lead, now an M.C.S. student at Rice.'
export const DEFAULT_IMAGE = `${SITE}/og-image.png`

export interface PageMeta {
  // The page's own title, before " | Henry Hsu"; none for the home page.
  title?: string
  description?: string
  // Its path on the site; the browser's own path when left out.
  path?: string
  // An image for its link preview: a full URL or a path on the site.
  image?: string | null
  type?: 'website' | 'article'
  // Kept out of search: drafts, presenter views, pages that do not exist.
  noindex?: boolean
}

export interface Head {
  title: string
  description: string
  canonical: string
  image: string
  type: 'website' | 'article'
  noindex: boolean
}

/** A description of at most `max` characters, cut at a word. */
export function clip(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:–—-]+$/, '')}…`
}

/** A path on the canonical host: no query or hash, no trailing slash. */
export function canonical(path: string): string {
  const bare = path.split(/[?#]/)[0] || '/'
  const trimmed = bare.length > 1 ? bare.replace(/\/+$/, '') : bare
  return `${SITE}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`
}

function absolute(image: string): string {
  return image.startsWith('/') ? `${SITE}${image}` : image
}

export function headFor(meta: PageMeta, path: string): Head {
  return {
    title: meta.title ? `${meta.title} | ${NAME}` : DEFAULT_TITLE,
    description: clip(meta.description || DEFAULT_DESCRIPTION),
    canonical: canonical(meta.path ?? path),
    image: meta.image ? absolute(meta.image) : DEFAULT_IMAGE,
    type: meta.type ?? 'website',
    noindex: Boolean(meta.noindex),
  }
}

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
