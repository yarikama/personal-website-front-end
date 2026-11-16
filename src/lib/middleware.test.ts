import SHELL from '../../index.html?raw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import middleware, { config } from '../../middleware'

const LINKEDIN = 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)'
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15'

function request(path: string, userAgent: string) {
  return new Request(`https://www.yarikama.com${path}`, {
    headers: { 'user-agent': userAgent },
  })
}

// The deployment's index.html, with its security headers, and the API.
function serve(api: (path: string) => Response) {
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : input)
    if (url.pathname === '/index.html') {
      return new Response(SHELL, {
        headers: {
          'content-type': 'text/html',
          'x-frame-options': 'DENY',
          'content-length': String(SHELL.length),
        },
      })
    }
    return api(url.pathname.replace('/api/v1', ''))
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

const passedOn = (response: Response) => response.headers.get('x-middleware-next') === '1'

afterEach(() => vi.unstubAllGlobals())

describe('middleware', () => {
  it('writes a note’s head into the HTML for a link preview, keeping the security headers', async () => {
    serve(() =>
      Response.json({
        data: { title: 'Two LLMs on One GPU', excerpt: 'Splitting 8 GB.' },
      }),
    )

    const response = await middleware(request('/notes/two-llms', LINKEDIN))
    const html = await response.text()

    expect(passedOn(response)).toBe(false)
    expect(html).toContain('<title>Two LLMs on One GPU | Henry Hsu</title>')
    expect(html).toContain('<link rel="canonical" href="https://www.yarikama.com/notes/two-llms" />')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(response.headers.get('content-length')).toBeNull()
  })

  it('puts the note’s words and the site’s links in the body for a crawler', async () => {
    serve(() =>
      Response.json({
        data: { title: 'Two LLMs on One GPU', excerpt: 'Splitting 8 GB.', content: '## The constraint\n\nOne card.' },
      }),
    )
    const html = await (await middleware(request('/notes/two-llms', GOOGLEBOT))).text()
    const root = html.slice(html.indexOf('<div id="root">'))
    expect(root).toContain('<h1>Two LLMs on One GPU</h1>')
    expect(root).toContain('<h2>The constraint</h2><p>One card.</p>')
    expect(root).toContain('<a href="/learnings">Learnings</a>')
  })

  it('answers 404, kept out of search, for a note that does not exist', async () => {
    serve(() => new Response('{"detail":"Not found"}', { status: 404 }))
    const response = await middleware(request('/notes/nope', GOOGLEBOT))
    expect(response.status).toBe(404)
    expect(await response.text()).toContain('<meta name="robots" content="noindex" />')
  })

  it('reads the learnings graph once for a learning page’s head and body', async () => {
    const fetch = serve(() =>
      Response.json({ data: { nodes: [{ slug: 'ppo', kind: 'learning', title: 'PPO', summary: 'Stay close.' }], edges: [] } }),
    )
    const response = await middleware(request('/learnings/ppo', GOOGLEBOT))
    expect(response.status).toBe(200)
    expect(fetch.mock.calls.filter(([input]) => String(input).includes('/learnings/graph'))).toHaveLength(1)
  })

  it('leaves people’s browsers alone, without asking anything', async () => {
    const fetch = serve(() => Response.json({}))
    expect(passedOn(await middleware(request('/notes/two-llms', SAFARI)))).toBe(true)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('leaves the page as it is when the API is down', async () => {
    serve(() => new Response('no available server', { status: 503 }))
    expect(passedOn(await middleware(request('/notes/two-llms', LINKEDIN)))).toBe(true)
  })

  it('leaves talks and redirects alone', async () => {
    serve(() => Response.json({}))
    expect(passedOn(await middleware(request('/talks/interview', LINKEDIN)))).toBe(true)
    expect(passedOn(await middleware(request('/archive', LINKEDIN)))).toBe(true)
  })

  it('matches pages only: not files, index.html, assets or admin', () => {
    const [pattern] = config.matcher
    const matches = (path: string) => new RegExp(`^${pattern}$`).test(path)
    for (const page of ['/', '/notes', '/notes/two-llms', '/learnings/ppo', '/works/homelab']) {
      expect(matches(page)).toBe(true)
    }
    for (const other of [
      '/index.html',
      '/robots.txt',
      '/sitemap.xml',
      '/assets/index-abc.js',
      '/admin',
      '/admin/notes',
      '/og-image.png',
    ]) {
      expect(matches(other)).toBe(false)
    }
  })
})
