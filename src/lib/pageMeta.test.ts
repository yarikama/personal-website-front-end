import { describe, expect, it } from 'vitest'
import { DEFAULT_DESCRIPTION, DEFAULT_IMAGE, DEFAULT_TITLE, canonical, clip, headFor } from './pageMeta'

describe('canonical', () => {
  it('is the path on www.yarikama.com, without its query, hash or trailing slash', () => {
    expect(canonical('/')).toBe('https://www.yarikama.com/')
    expect(canonical('/learnings?node=ppo')).toBe('https://www.yarikama.com/learnings')
    expect(canonical('/notes/a-note/')).toBe('https://www.yarikama.com/notes/a-note')
    expect(canonical('/works#top')).toBe('https://www.yarikama.com/works')
    expect(canonical('?x=1')).toBe('https://www.yarikama.com/')
  })
})

describe('clip', () => {
  it('keeps a short description, on one line', () => {
    expect(clip('  Two\\n lines  '.replace('\\n', '\n'))).toBe('Two lines')
  })

  it('cuts a long one at a word, under the limit', () => {
    const long = 'word '.repeat(60)
    const cut = clip(long)
    expect(cut.length).toBeLessThanOrEqual(160)
    expect(cut.endsWith('word…')).toBe(true)
  })
})

describe('headFor', () => {
  it('gives the home page the site’s own title, description and image', () => {
    expect(headFor({}, '/')).toEqual({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonical: 'https://www.yarikama.com/',
      image: DEFAULT_IMAGE,
      type: 'website',
      noindex: false,
    })
  })

  it('names a page after its title, and points the canonical at its own path', () => {
    const head = headFor({ title: 'PPO', description: 'Stay close to the notes.', type: 'article' }, '/learnings/ppo')
    expect(head.title).toBe('PPO | Henry Hsu')
    expect(head.canonical).toBe('https://www.yarikama.com/learnings/ppo')
    expect(head.type).toBe('article')
  })

  it('makes an image on the site a full address', () => {
    expect(headFor({ image: '/hero/a.png' }, '/').image).toBe('https://www.yarikama.com/hero/a.png')
    expect(headFor({ image: 'https://assets.yarikama.com/a.png' }, '/').image).toBe(
      'https://assets.yarikama.com/a.png',
    )
    expect(headFor({ image: null }, '/').image).toBe(DEFAULT_IMAGE)
  })

  it('prefers the path it is given over the browser’s', () => {
    expect(headFor({ path: '/' }, '/?ref=linkedin').canonical).toBe('https://www.yarikama.com/')
  })

  it('keeps pages out of search when asked', () => {
    expect(headFor({ title: 'Page not found', noindex: true }, '/nope').noindex).toBe(true)
  })
})
