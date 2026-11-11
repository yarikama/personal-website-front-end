import { describe, expect, it, vi } from 'vitest'
import { PAGES } from './head'
import { metaForPath, readsWithoutScripts, type FetchJson } from './routeHead'

const API: Record<string, unknown> = {
  '/lab-notes/two-llms': {
    data: { title: 'Two LLMs on One GPU', excerpt: 'Splitting 8 GB.' },
  },
  '/projects/homelab': {
    data: {
      title: 'Homelab',
      description: 'One laptop.',
      coverImage: 'https://assets.yarikama.com/c.svg',
    },
  },
  '/learnings/graph': {
    data: {
      nodes: [
        {
          slug: 'ppo',
          title: 'PPO',
          summary: 'Stay close.',
          previewImage: null,
        },
      ],
    },
  },
}

const fetchJson = vi.fn<FetchJson>(async (path) => API[path] ?? null)

describe('metaForPath', () => {
  it('gives the site’s own pages their fixed head, without asking the API', async () => {
    fetchJson.mockClear()
    expect(await metaForPath('/', fetchJson)).toBe(PAGES.home)
    expect(await metaForPath('/works/', fetchJson)).toBe(PAGES.works)
    expect(await metaForPath('/learnings', fetchJson)).toBe(PAGES.learnings)
    expect(fetchJson).not.toHaveBeenCalled()
  })

  it('reads a note, a project and a learning page from the API', async () => {
    expect(await metaForPath('/notes/two-llms', fetchJson)).toEqual({
      title: 'Two LLMs on One GPU',
      description: 'Splitting 8 GB.',
      type: 'article',
    })
    expect(await metaForPath('/works/homelab', fetchJson)).toMatchObject({
      title: 'Homelab',
      image: 'https://assets.yarikama.com/c.svg',
    })
    expect(await metaForPath('/learnings/ppo', fetchJson)).toMatchObject({
      title: 'PPO',
      description: 'Stay close.',
    })
  })

  it('keeps what does not exist out of search', async () => {
    expect(await metaForPath('/notes/gone', fetchJson)).toBe(PAGES.notFound)
    expect(await metaForPath('/learnings/gone', fetchJson)).toBe(PAGES.notFound)
    expect(await metaForPath('/notes/a/b', fetchJson)).toBe(PAGES.notFound)
  })

  it('leaves talks and addresses outside the site’s sections alone', async () => {
    expect(await metaForPath('/talks/interview', fetchJson)).toBeNull()
    expect(await metaForPath('/talk', fetchJson)).toBeNull()
    expect(await metaForPath('/archive', fetchJson)).toBeNull()
  })

  it('lets the API being down reach the caller', async () => {
    const down: FetchJson = async () => {
      throw new Error('API 503')
    }
    await expect(metaForPath('/notes/two-llms', down)).rejects.toThrow('API 503')
  })
})

describe('readsWithoutScripts', () => {
  it('knows crawlers and link previews', () => {
    for (const agent of [
      'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
      'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
      'facebookexternalhit/1.1 Facebot Twitterbot/1.0',
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
      'WhatsApp/2.23.20.0',
    ]) {
      expect(readsWithoutScripts(agent)).toBe(true)
    }
  })

  it('leaves people’s browsers alone', () => {
    expect(
      readsWithoutScripts(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
      ),
    ).toBe(false)
    expect(readsWithoutScripts(null)).toBe(false)
  })
})
