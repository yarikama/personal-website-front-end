import { describe, expect, it } from 'vitest'
import type { LearningEdgeType, LearningGraph, LearningNode } from '../types'
import { areaColours, destination, homes, layers, learnFirst, linksOf, neighbours, places, tagCounts } from './learningGraph'

const node = (slug: string, overrides: Partial<LearningNode> = {}): LearningNode => ({
  slug,
  kind: 'learning',
  title: slug.toUpperCase(),
  summary: '',
  ref: `/learnings/${slug}`,
  tags: [],
  previewImage: null,
  published: true,
  ...overrides,
})

const graph = (slugs: string[], edges: [string, LearningEdgeType, string][]): LearningGraph => ({
  nodes: slugs.map((slug) => node(slug)),
  edges: edges.map(([source, type, target]) => ({ source, target, type })),
})

const slugs = (nodes: LearningNode[]) => nodes.map((n) => n.slug)

describe('a node in the learning graph', () => {
  // a and b come before c, c before d; d is part of hub and related to e
  const g = graph(
    ['a', 'b', 'c', 'd', 'e', 'hub'],
    [
      ['a', 'prerequisite', 'c'],
      ['b', 'prerequisite', 'c'],
      ['c', 'prerequisite', 'd'],
      ['d', 'part_of', 'hub'],
      ['e', 'related', 'd'],
    ]
  )

  it('has its links read from both ends', () => {
    const d = linksOf(g, 'd')
    expect(slugs(d.prerequisites)).toEqual(['c'])
    expect(slugs(d.partOf)).toEqual(['hub'])
    expect(slugs(d.related)).toEqual(['e'])
    expect(slugs(linksOf(g, 'c').next)).toEqual(['d'])
    expect(slugs(linksOf(g, 'hub').parts)).toEqual(['d'])
    expect(slugs(linksOf(g, 'e').related)).toEqual(['d'])
  })

  it('has every node one edge away as a neighbour', () => {
    expect([...neighbours(g, 'd')].sort()).toEqual(['c', 'd', 'e', 'hub'])
    expect([...neighbours(g, 'a')].sort()).toEqual(['a', 'c'])
  })

  it('is reached through every prerequisite, each after its own', () => {
    expect(slugs(learnFirst(g, 'd'))).toEqual(['a', 'b', 'c'])
    expect(learnFirst(g, 'a')).toEqual([])
  })

  it('lists a prerequisite reached two ways once', () => {
    const diamond = graph(
      ['root', 'left', 'right', 'top'],
      [
        ['root', 'prerequisite', 'left'],
        ['root', 'prerequisite', 'right'],
        ['left', 'prerequisite', 'top'],
        ['right', 'prerequisite', 'top'],
      ]
    )
    expect(slugs(learnFirst(diamond, 'top'))).toEqual(['root', 'left', 'right'])
  })
})

describe('the layers of the graph', () => {
  it('put each node one past its furthest prerequisite, and leave out nodes off every road', () => {
    const g = graph(
      ['a', 'b', 'c', 'd', 'hub'],
      [
        ['a', 'prerequisite', 'b'],
        ['b', 'prerequisite', 'd'],
        ['c', 'prerequisite', 'd'],
        ['d', 'part_of', 'hub'],
      ]
    )
    expect(Object.fromEntries(layers(g))).toEqual({ a: 0, b: 1, c: 0, d: 2 })
  })

  it('end even on a cycle', () => {
    const loop = graph(['a', 'b'], [['a', 'prerequisite', 'b'], ['b', 'prerequisite', 'a']])
    expect([...layers(loop).keys()].sort()).toEqual(['a', 'b'])
  })
})

describe('homes and places', () => {
  // A field with two topics; an idea in both topics, at home in the second
  const g: LearningGraph = {
    nodes: [node('field'), node('one'), node('two'), node('idea'), node('paper', { kind: 'external' })],
    edges: [
      { source: 'one', target: 'field', type: 'part_of' },
      { source: 'two', target: 'field', type: 'part_of' },
      { source: 'idea', target: 'one', type: 'part_of' },
      { source: 'idea', target: 'two', type: 'part_of', home: true },
      { source: 'idea', target: 'paper', type: 'related' },
    ],
  }

  it('give a node the home marked, or else its first parent', () => {
    expect(Object.fromEntries(homes(g))).toEqual({ one: 'field', two: 'field', idea: 'two' })
  })

  it('list a node’s home first among what it is part of', () => {
    const idea = linksOf(g, 'idea')
    expect(idea.home?.slug).toBe('two')
    expect(slugs(idea.partOf)).toEqual(['two', 'one'])
    expect(slugs(linksOf(g, 'one').parts)).toEqual(['idea'])
  })

  it('set each node’s level and area by following homes up', () => {
    const at = places(g)
    expect(at.get('field')).toEqual({ level: 1, area: null })
    expect(at.get('one')).toEqual({ level: 2, area: 'one' })
    expect(at.get('idea')).toEqual({ level: 3, area: 'two' })
    expect(at.has('paper')).toBe(false)
  })

  it('stop at a cycle of homes', () => {
    const loop: LearningGraph = {
      nodes: [node('a'), node('b')],
      edges: [
        { source: 'a', target: 'b', type: 'part_of' },
        { source: 'b', target: 'a', type: 'part_of' },
      ],
    }
    expect(places(loop).get('a')?.level).toBe(2)
  })

  it('give every area its own colour, the same each time', () => {
    const light = areaColours(g, false)
    expect([...light.keys()]).toEqual(['one', 'two'])
    expect(light.get('one')).not.toBe(light.get('two'))
    expect(areaColours(g, false)).toEqual(light)
    expect(areaColours(g, true).get('one')).not.toBe(light.get('one'))
  })
})

describe('the tags of the graph', () => {
  it('are counted, most used first and then by name', () => {
    const g: LearningGraph = {
      nodes: [node('a', { tags: ['math', 'ml'] }), node('b', { tags: ['ml'] }), node('c', { tags: ['llm'] }), node('d')],
      edges: [],
    }
    expect(tagCounts(g)).toEqual([
      { tag: 'ml', count: 2 },
      { tag: 'llm', count: 1 },
      { tag: 'math', count: 1 },
    ])
  })
})

describe('where a node leads', () => {
  const hasPage = (slug: string) => slug === 'live'

  it('is its page once the page is on the site', () => {
    expect(destination(node('live'), hasPage)).toEqual({ kind: 'page', to: '/learnings/live' })
    expect(destination(node('draft'), hasPage)).toEqual({ kind: 'soon' })
    expect(destination(node('moved', { ref: '/notes/moved' }), hasPage)).toEqual({ kind: 'page', to: '/notes/moved' })
  })

  it('is a link for an external node and nowhere for a concept', () => {
    const paper = node('paper', { kind: 'external', ref: 'https://arxiv.org/abs/1706.03762' })
    expect(destination(paper, hasPage)).toEqual({ kind: 'link', href: 'https://arxiv.org/abs/1706.03762' })
    expect(destination(node('hub', { kind: 'concept', ref: null }), hasPage)).toEqual({ kind: 'none' })
  })
})
