import { describe, expect, it } from 'vitest'
import { PAGES } from './head'
import { bodyForPath, markdownText, renderBody } from './routeBody'
import type { FetchJson } from './routeHead'

const GRAPH = {
  nodes: [
    { slug: 'values', kind: 'concept', title: 'Values', summary: 'How good it is to be somewhere.', overview: 'First paragraph.\n\nSecond paragraph.' },
    { slug: 'reward-and-value', kind: 'learning', title: 'Reward versus value', summary: 'Choose by value.' },
    { slug: 'td', kind: 'learning', title: 'Temporal-difference learning', summary: 'Nudge each guess.' },
    { slug: 'sarsa', kind: 'learning', title: 'Sarsa', summary: 'Learn the way by walking it.' },
    { slug: 'book', kind: 'external', title: 'Sutton and Barto', summary: 'The book.', ref: 'https://example.com/book' },
  ],
  edges: [
    { source: 'reward-and-value', target: 'values', type: 'part_of' },
    { source: 'td', target: 'values', type: 'part_of' },
    { source: 'reward-and-value', target: 'td', type: 'prerequisite' },
    { source: 'td', target: 'sarsa', type: 'next' },
    { source: 'td', target: 'book', type: 'related' },
  ],
}

const API: Record<string, unknown> = {
  '/learnings/graph': { data: GRAPH },
  '/lab-notes?limit=100': { data: [{ slug: 'two-llms', title: 'Two LLMs <on> one GPU', excerpt: 'Splitting 8 GB.' }] },
  '/projects?limit=100': { data: [{ slug: 'homelab', title: 'Homelab', description: 'A laptop & a cluster.' }] },
  '/lab-notes/two-llms': {
    data: {
      slug: 'two-llms',
      title: 'Two LLMs on one GPU',
      excerpt: 'Splitting 8 GB.',
      content: '# Two LLMs on one GPU\n\n## The constraint\n\nOne **8 GB** card, see [the docs](https://x.y).\n\n- vLLM\n- llama.cpp\n\n```sh\nkubectl get pods <all>\n```\n\n![a chart](/c.png)',
    },
  },
}
const fetchJson: FetchJson = async (path) => API[path] ?? null

describe('bodyForPath', () => {
  it('gives every page the site’s navigation, its title and its description', async () => {
    const body = await bodyForPath('/works', PAGES.works, fetchJson)
    for (const href of ['/', '/works', '/notes', '/learnings', '/talks']) expect(body).toContain(`<a href="${href}">`)
    expect(body).toContain('<h1>Works</h1>')
    expect(body).toContain(`<p>${PAGES.works.description}</p>`)
  })

  it('links the home page to every project and note, escaped', async () => {
    const body = await bodyForPath('/', PAGES.home, fetchJson)
    expect(body).toContain('<a href="/works/homelab">Homelab</a>')
    expect(body).toContain('<p>A laptop &amp; a cluster.</p>')
    expect(body).toContain('<a href="/notes/two-llms">Two LLMs &lt;on&gt; one GPU</a>')
    expect(body).toContain('<a href="/learnings">')
  })

  it('lays out the Learnings map by topic, with each topic’s overview and pages', async () => {
    const body = await bodyForPath('/learnings', PAGES.learnings, fetchJson)
    expect(body).toContain('<h2>Values</h2><p>First paragraph.</p><p>Second paragraph.</p>')
    expect(body).toContain('<a href="/learnings/reward-and-value">Reward versus value</a>')
    expect(body).toContain('<a href="/learnings/td">')
    // A page in no topic still gets a link
    expect(body).toContain('<a href="/learnings/sarsa">Sarsa</a>')
  })

  it('links a learning page to its topic, what to read first, next, and what is related', async () => {
    const meta = { title: 'Temporal-difference learning', description: 'Nudge each guess.' }
    const body = await bodyForPath('/learnings/td', meta, fetchJson)
    expect(body).toContain('Part of <a href="/learnings">Values</a>')
    expect(body).toMatch(/<h2>Read first<\/h2><ul><li><a href="\/learnings\/reward-and-value">/)
    expect(body).toMatch(/<h2>Read next<\/h2><ul><li><a href="\/learnings\/sarsa">/)
    expect(body).toContain('<a href="https://example.com/book">Sutton and Barto</a>')
  })

  it('puts a note’s text in, without repeating its title', async () => {
    const body = await bodyForPath('/notes/two-llms', { title: 'Two LLMs on one GPU', description: 'Splitting 8 GB.' }, fetchJson)
    expect(body.match(/Two LLMs on one GPU/g)).toHaveLength(1)
    expect(body).toContain('<h2>The constraint</h2>')
    expect(body).toContain('<p>One 8 GB card, see the docs.</p>')
    expect(body).toContain('<li>vLLM</li><li>llama.cpp</li>')
    expect(body).toContain('<pre>kubectl get pods &lt;all&gt;</pre>')
    expect(body).not.toContain('c.png')
  })

  it('gives a page that does not exist only the navigation and its title', async () => {
    const body = await bodyForPath('/notes/nope', PAGES.notFound, fetchJson)
    expect(body).toContain('<h1>Page not found</h1>')
    expect(body).not.toContain('<section>')
  })

  it('still answers when the API is down', async () => {
    const down: FetchJson = async () => {
      throw new Error('503')
    }
    const body = await bodyForPath('/', PAGES.home, down)
    expect(body).toContain('<h1>Henry Hsu</h1>')
    expect(body).toContain('<a href="/learnings">')
  })
})

describe('markdownText', () => {
  it('escapes everything, raw HTML included', () => {
    expect(markdownText('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
  })
})

describe('renderBody', () => {
  it('fills the empty root and leaves the rest of the HTML alone', () => {
    const html = '<body>\n    <div id="root"></div>\n    <script src="/main.js"></script>\n  </body>'
    expect(renderBody(html, '<h1>$& $1</h1>')).toBe('<body>\n    <div id="root"><h1>$& $1</h1></div>\n    <script src="/main.js"></script>\n  </body>')
  })
})
