import { headFor, renderHead } from './src/lib/head'
import { metaForPath, readsWithoutScripts, type FetchJson } from './src/lib/routeHead'

// Vercel routing middleware: for crawlers and link previews (LinkedIn, Slack,
// iMessage, Google), the page's HTML arrives with its own title,
// description, canonical address and preview image already in it, as the
// page's script would set them. Everyone else, and anything that goes
// wrong here, gets the site exactly as before.

/**
 * Lets the request go on to the site as it would without middleware: the
 * same as next() in @vercel/functions, which is that header on an empty
 * response. Written here so the site does not depend on that package and
 * the dependencies it brings.
 */
export function next(): Response {
  return new Response(null, { headers: { 'x-middleware-next': '1' } })
}

const API = 'https://api.yarikama.com/api/v1'
// Past this, the default head is better than a preview that never comes.
const API_TIMEOUT_MS = 2500

export const config = {
  // Pages only: no file (anything with an extension, index.html included,
  // so the fetch below does not come back here), assets or admin.
  matcher: ['/((?!assets/|admin|api/|.*\\.[A-Za-z0-9]+$).*)'],
}

const fetchJson: FetchJson = async (path) => {
  const response = await fetch(`${API}${path}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`API ${response.status} for ${path}`)
  return response.json()
}

export default async function middleware(request: Request): Promise<Response> {
  if (request.method !== 'GET' || !readsWithoutScripts(request.headers.get('user-agent'))) return next()
  const url = new URL(request.url)
  try {
    const meta = await metaForPath(url.pathname, fetchJson)
    if (!meta) return next()
    const shell = await fetch(new URL('/index.html', url), {
      headers: { accept: 'text/html' },
    })
    if (!shell.ok) return next()
    const html = renderHead(await shell.text(), headFor(meta, url.pathname))
    // The shell's own headers (its security headers and caching), less
    // those that described the body before it changed.
    const headers = new Headers(shell.headers)
    for (const name of ['content-length', 'content-encoding', 'etag', 'last-modified']) headers.delete(name)
    headers.set('content-type', 'text/html; charset=utf-8')
    return new Response(html, { status: 200, headers })
  } catch {
    return next()
  }
}
