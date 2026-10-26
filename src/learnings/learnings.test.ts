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

  it('gives each kind of node the ref it may have', () => {
    for (const node of demoGraph.nodes) {
      if (node.kind === 'learning') expect(node.ref).toBe(`/learnings/${node.slug}`)
      if (node.kind === 'external') expect(node.ref).toMatch(/^https:\/\//)
      if (node.kind === 'concept') expect(node.ref).toBeNull()
    }
  })
})
