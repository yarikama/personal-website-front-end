import { PAGES, type PageMeta } from './head'

// What a public address's head is, worked out on the server for the routing
// middleware, by the same rules the pages use once they load: the site's own
// pages from PAGES, a note, project or learning page from the API, and
// noindex for an address the site has no page for. No React or DOM here.

// The API's answer for a path under /api/v1, or null when it has none (404);
// it throws when the API cannot be reached, and the middleware then leaves
// the page as it is.
export type FetchJson = (path: string) => Promise<unknown | null>

interface Note {
  title: string
  excerpt: string
}
interface Project {
  title: string
  description: string
  coverImage?: string | null
}
interface Node {
  slug: string
  title: string
  summary: string
  previewImage: string | null
}

const FIXED: Record<string, PageMeta> = {
  '/': PAGES.home,
  '/works': PAGES.works,
  '/notes': PAGES.notes,
  '/talks': PAGES.talks,
  '/learnings': PAGES.learnings,
}

function data<T>(body: unknown): T | null {
  return body && typeof body === 'object' && 'data' in body ? ((body as { data: T }).data ?? null) : null
}

/**
 * The head of the page at `path`, or null to leave the page as it is: a
 * talk (its slides are code that is not loaded here), whose page sets its
 * own head, and any address outside the site's sections, which may be one
 * of vercel.json's redirects (/archive, /talk) and is left to them.
 */
export async function metaForPath(path: string, fetchJson: FetchJson): Promise<PageMeta | null> {
  const bare = path.length > 1 ? path.replace(/\/+$/, '') : path
  if (FIXED[bare]) return FIXED[bare]

  const [, section, slug, ...rest] = bare.split('/')
  if (!['notes', 'works', 'learnings'].includes(section)) return null
  if (!slug || rest.length > 0) return PAGES.notFound
  const id = encodeURIComponent(decodeURIComponent(slug))

  if (section === 'notes') {
    const note = data<Note>(await fetchJson(`/lab-notes/${id}`))
    return note ? { title: note.title, description: note.excerpt, type: 'article' } : PAGES.notFound
  }
  if (section === 'works') {
    const project = data<Project>(await fetchJson(`/projects/${id}`))
    return project
      ? {
          title: project.title,
          description: project.description,
          image: project.coverImage,
          type: 'article',
        }
      : PAGES.notFound
  }
  if (section === 'learnings') {
    const graph = data<{ nodes: Node[] }>(await fetchJson('/learnings/graph'))
    const node = graph?.nodes.find((found) => found.slug === decodeURIComponent(slug))
    return node
      ? {
          title: node.title,
          description: node.summary,
          image: node.previewImage,
          type: 'article',
        }
      : PAGES.notFound
  }
  return null
}

// Crawlers and link previews: they read the HTML as it arrives and run no
// script, or not reliably. People's browsers get the page untouched and its
// script sets the same head.
const READERS =
  /bot|crawler|spider|crawling|facebookexternalhit|facebookcatalog|embedly|quora link preview|pinterest|slackbot|slack-imgproxy|vkshare|whatsapp|telegram|discord|linkedin|twitter|skypeuripreview|bingpreview|google-inspectiontool|googleother|mastodon|bluesky|iframely|preview/i

export function readsWithoutScripts(userAgent: string | null): boolean {
  return Boolean(userAgent && READERS.test(userAgent))
}
