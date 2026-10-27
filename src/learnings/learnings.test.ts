import { describe, expect, it } from 'vitest'
import { learnFirst } from '../lib/learningGraph'
import { demoGraph } from './demo'
import { findLearningPage, learningPages } from '.'

describe('the learning pages', () => {
  it('each have a unique slug that fits in a URL', () => {
    const slugs = learningPages.map((page) => page.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it.each(learningPages.map((page) => [page.slug, page] as const))('%s loads a page', async (_, page) => {
    const { default: Page } = await page.load()
    expect(typeof Page).toBe('function')
    expect(findLearningPage(page.slug)).toBe(page)
  })

  it('finds nothing for a slug with no page', () => {
    expect(findLearningPage('no-such-page')).toBeUndefined()
    expect(findLearningPage(undefined)).toBeUndefined()
  })
})

// The sample keeps to the rules the API enforces, so it looks like the real thing
describe('the sample graph', () => {
  const slugs = new Set(demoGraph.nodes.map((node) => node.slug))

  it('has unique slugs and edges between its own nodes', () => {
    expect(slugs.size).toBe(demoGraph.nodes.length)
    for (const edge of demoGraph.edges) {
      expect(slugs).toContain(edge.source)
      expect(slugs).toContain(edge.target)
      expect(edge.source).not.toBe(edge.target)
    }
  })

  it('has no cycle of prerequisites', () => {
    for (const node of demoGraph.nodes) {
      expect(learnFirst(demoGraph, node.slug).map((n) => n.slug)).not.toContain(node.slug)
    }
  })

  it('reads in a line: one page next and one before, every one a page, and no way round', () => {
    const next = demoGraph.edges.filter((edge) => edge.type === 'next')
    const after = new Map(next.map((edge) => [edge.source, edge.target]))
    expect(after.size).toBe(next.length)
    expect(new Set(next.map((edge) => edge.target)).size).toBe(next.length)
    for (const edge of next) {
      expect(findLearningPage(edge.source), edge.source).toBeDefined()
      expect(findLearningPage(edge.target), edge.target).toBeDefined()
    }
    for (const start of after.keys()) {
      const seen = new Set<string>()
      for (let at: string | undefined = start; at; at = after.get(at)) {
        expect(seen.has(at), `${start} comes round again`).toBe(false)
        seen.add(at)
      }
    }
  })

  it('has a page on the site for every learning', () => {
    for (const node of demoGraph.nodes.filter((n) => n.kind === 'learning')) {
      expect(findLearningPage(node.slug), node.slug).toBeDefined()
    }
  })

  it('gives each kind of node the ref it may have', () => {
    for (const node of demoGraph.nodes) {
      if (node.kind === 'learning') expect(node.ref).toBe(`/learnings/${node.slug}`)
      if (node.kind === 'external') expect(node.ref).toMatch(/^https:\/\//)
      if (node.kind === 'concept') expect(node.ref).toBeNull()
    }
  })
})
