import SHELL from '../../index.html?raw'
import { describe, expect, it } from 'vitest'
import { DEFAULT_IMAGE, escapeHtml, headFor, renderHead } from './head'

// SHELL is the site's real index.html, as Vite builds it.
const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0

describe('renderHead', () => {
  const head = headFor(
    {
      title: 'PPO: stay close to the notes',
      description: 'Proximal Policy Optimization (PPO), "clipped".',
      type: 'article',
      image: 'https://assets.yarikama.com/a.png',
    },
    '/learnings/ppo',
  )
  const html = renderHead(SHELL, head)

  it('puts the page’s title, description and canonical in place of the defaults', () => {
    expect(html).toContain('<title>PPO: stay close to the notes | Henry Hsu</title>')
    expect(html).toContain('<link rel="canonical" href="https://www.yarikama.com/learnings/ppo" />')
    expect(html).toContain(
      '<meta name="description" content="Proximal Policy Optimization (PPO), &quot;clipped&quot;." />',
    )
    expect(html).toContain('<meta property="og:url" content="https://www.yarikama.com/learnings/ppo" />')
    expect(html).toContain('<meta property="og:type" content="article" />')
    expect(html).toContain('<meta property="og:image" content="https://assets.yarikama.com/a.png" />')
  })

  it('leaves one of each tag, and drops the default image’s size for another image', () => {
    expect(count(html, /<title>/g)).toBe(1)
    expect(count(html, /name="description"/g)).toBe(1)
    expect(count(html, /property="og:title"/g)).toBe(1)
    expect(count(html, /property="og:description"/g)).toBe(1)
    expect(count(html, /property="og:image"/g)).toBe(1)
    expect(html).not.toContain('og:image:width')
    expect(html).not.toContain('og:image:alt')
  })

  it('keeps the rest of the shell: the theme script, the fonts and the app', () => {
    expect(html).toContain("localStorage.getItem('theme')")
    expect(html).toContain('fonts.googleapis.com')
    expect(html).toContain('<div id="root"></div>')
    expect(html).toContain('<meta property="og:site_name" content="Henry Hsu" />')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />')
  })

  it('keeps the default image’s size with the default image, and marks noindex', () => {
    const missing = renderHead(SHELL, headFor({ title: 'Page not found', noindex: true }, '/notes/gone'))
    expect(missing).toContain(`<meta property="og:image" content="${DEFAULT_IMAGE}" />`)
    expect(missing).toContain('<meta property="og:image:width" content="1200" />')
    expect(missing).toContain('<meta name="robots" content="noindex" />')
  })
})

describe('escapeHtml', () => {
  it('escapes what could close an attribute or a tag', () => {
    expect(escapeHtml(`<a href="x">Tom's & Jerry</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom&#39;s &amp; Jerry&lt;/a&gt;',
    )
  })
})
