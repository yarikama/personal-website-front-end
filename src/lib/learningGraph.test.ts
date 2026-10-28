import { describe, expect, it } from 'vitest'
import type { LearningEdgeType, LearningGraph, LearningNode } from '../types'
import { areaColours, destination, homes, inReadingOrder, layers, learnFirst, linksOf, neighbours, places, search, stagesOf, tagCounts } from './learningGraph'

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
    expect(slugs(linksOf(g, 'c').leadsTo)).toEqual(['d'])
    expect(slugs(linksOf(g, 'hub').parts)).toEqual(['d'])
    expect(slugs(linksOf(g, 'e').related)).toEqual(['d'])
  })

  it('has the pages before and after it in the reading order, apart from prerequisites', () => {
    const read = graph(['one', 'two', 'three'], [
      ['one', 'next', 'two'],
      ['two', 'next', 'three'],
    ])
    expect(linksOf(read, 'two').readBefore?.slug).toBe('one')
    expect(linksOf(read, 'two').readNext?.slug).toBe('three')
    expect(linksOf(read, 'one').readBefore).toBeNull()
    expect(linksOf(read, 'two').prerequisites).toEqual([])
    expect(learnFirst(read, 'three')).toEqual([])
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

describe('the order to read what is inside a node', () => {
  it('follows the reading order, then the road of prerequisites, then the title', () => {
    // Read zebra, then apple; mango is not in the reading order but is
    // learned after zebra; kiwi is neither
    const g = graph(
      ['topic', 'apple', 'zebra', 'mango', 'kiwi'],
      [
        ['zebra', 'next', 'apple'],
        ['zebra', 'prerequisite', 'mango'],
        ['apple', 'part_of', 'topic'],
        ['zebra', 'part_of', 'topic'],
        ['mango', 'part_of', 'topic'],
        ['kiwi', 'part_of', 'topic'],
      ]
    )
    expect(slugs(linksOf(g, 'topic').parts)).toEqual(['zebra', 'apple', 'mango', 'kiwi'])
  })

  it('puts a topic where its first page is read', () => {
    // `sooner` holds the first page, `later` the next one, `loose` none
    const g = graph(
      ['field', 'later', 'sooner', 'loose', 'one', 'two'],
      [
        ['one', 'next', 'two'],
        ['one', 'part_of', 'sooner'],
        ['two', 'part_of', 'later'],
        ['later', 'part_of', 'field'],
        ['loose', 'part_of', 'field'],
        ['sooner', 'part_of', 'field'],
      ]
    )
    expect(slugs(linksOf(g, 'field').parts)).toEqual(['sooner', 'later', 'loose'])
  })

  it('is a comparator that leaves ties to the title', () => {
    const plain = graph(['b', 'a'], [])
    expect(slugs([...plain.nodes].sort(inReadingOrder(plain)))).toEqual(['a', 'b'])
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

describe('searching the graph', () => {
  const g: LearningGraph = {
    nodes: [
      node('ucb', { title: 'The benefit of the doubt', tags: ['rl', 'decisions'] }),
      node('values', { title: 'Values', summary: 'What a state is worth' }),
      node('td', { title: 'Learning from every move', tags: ['rl', 'values'] }),
      node('load', { title: 'Describing load', tags: ['ddia'] }),
    ],
    edges: [],
  }
  const found = (typed: string) => slugs(search(g, typed).nodes)

  it('finds every tag and no node when nothing is typed', () => {
    expect(search(g, '  ')).toEqual({ tags: tagCounts(g), nodes: [] })
  })

  it('ranks a title that starts with it, then a word, then a tag, then the summary', () => {
    expect(found('val')).toEqual(['values', 'td'])
    expect(found('doubt')).toEqual(['ucb'])
    expect(found('worth')).toEqual(['values'])
    expect(found('Describ')).toEqual(['load'])
  })

  it('finds tags with it in them, those starting with it first', () => {
    expect(search(g, 'd').tags.map(({ tag }) => tag)).toEqual(['ddia', 'decisions'])
    expect(search(g, 'is').tags.map(({ tag }) => tag)).toEqual(['decisions'])
  })

  it('looks for tags alone after a #', () => {
    expect(search(g, '#rl')).toEqual({ tags: [{ tag: 'rl', count: 2 }], nodes: [] })
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

describe('how far along a node is', () => {
  // A field of two topics: one gathers two pages, the other a page and a
  // draft not on the site yet
  const map = graph(
    ['field', 'topic', 'other', 'a', 'b', 'c', 'draft'],
    [
      ['topic', 'part_of', 'field'],
      ['other', 'part_of', 'field'],
      ['a', 'part_of', 'topic'],
      ['b', 'part_of', 'topic'],
      ['c', 'part_of', 'other'],
      ['draft', 'part_of', 'other'],
    ]
  )
  const hasPage = (slug: string) => ['a', 'b', 'c'].includes(slug)

  it('is, for a page, how far it has been read', () => {
    const stages = stagesOf(map, new Map([['a', 2]]), hasPage)
    expect(stages.get('a')).toBe(2)
    expect(stages.get('b')).toBe(0)
  })

  it('is, for a node that only gathers others, the least read inside it', () => {
    const stages = stagesOf(map, new Map([['a', 3], ['b', 2], ['c', 1]]), hasPage)
    expect(stages.get('topic')).toBe(2)
    expect(stages.get('other')).toBe(1)
    expect(stages.get('field')).toBe(1)
  })

  it('leaves out what has nothing to read', () => {
    const stages = stagesOf(map, new Map([['c', 3]]), hasPage)
    expect(stages.get('other')).toBe(3)
    expect(stages.has('draft')).toBe(false)
  })

  it('survives a loop of part_of edges', () => {
    const loop = graph(['x', 'y', 'a'], [['x', 'part_of', 'y'], ['y', 'part_of', 'x'], ['a', 'part_of', 'x']])
    expect(stagesOf(loop, new Map([['a', 2]]), hasPage).get('x')).toBe(2)
  })
})
