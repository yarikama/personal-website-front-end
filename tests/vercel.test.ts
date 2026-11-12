import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HERO_LAYERS } from '../src/components/sections/heroLayers'

// The site's Content-Security-Policy allows inline scripts only by hash, so
// editing the theme script in index.html without updating vercel.json would
// stop it from running once the policy is enforced.
const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

interface Header {
  key: string
  value: string
}

function headersFor(source: string): Header[] {
  const config = JSON.parse(read('vercel.json')) as {
    headers: { source: string; headers: Header[] }[]
  }
  return config.headers.find((rule) => rule.source === source)?.headers ?? []
}

function policy(): string {
  const all = headersFor('/(.*)')
  const csp = all.find((h) => h.key.startsWith('Content-Security-Policy'))
  return csp!.value
}

function directive(name: string): string[] {
  const found = policy()
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .find(([key]) => key === name)
  return found ? found.slice(1) : []
}

describe('the Content-Security-Policy in vercel.json', () => {
  it('allows every inline script in index.html by its hash', () => {
    const scripts = [...read('index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)]
    expect(scripts.length).toBeGreaterThan(0)
    for (const [, body] of scripts) {
      const hash = createHash('sha256').update(body).digest('base64')
      expect(directive('script-src')).toContain(`'sha256-${hash}'`)
    }
  })

  it('never allows inline scripts or eval wholesale', () => {
    expect(directive('script-src')).not.toContain("'unsafe-inline'")
    expect(directive('script-src')).not.toContain("'unsafe-eval'")
  })

  it('lets the site reach its API and report violations to it', () => {
    expect(directive('connect-src')).toContain('https://api.yarikama.com')
    expect(directive('report-uri')).toEqual(['https://api.yarikama.com/api/v1/csp-report'])
  })
})

// The hero photo shows once all its layers have arrived. The home page's
// response names them, so they download alongside the script instead of
// after it, and a renamed layer must be renamed there too.
describe('the home page preload in vercel.json', () => {
  it('preloads exactly the hero photo layers, ahead of everything else', () => {
    const link = headersFor('/').find((h) => h.key === 'Link')!.value
    const preloads = link.split(/,\s*/).map((entry) => entry.split(';').map((part) => part.trim()))
    expect(preloads.map(([target]) => target)).toEqual(HERO_LAYERS.map((layer) => `<${layer.src}>`))
    for (const [, ...params] of preloads) {
      expect(params).toEqual(['rel=preload', 'as=image', 'fetchpriority=high'])
    }
  })
})
