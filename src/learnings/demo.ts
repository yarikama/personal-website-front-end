import type { LearningEdge, LearningEdgeType, LearningGraph, LearningNode, LearningNodeKind } from '../types'

// The map shown while the real one has no published nodes yet: chapter 1
// of Designing Data-Intensive Applications, whose pages are on the site.
const node = (
  slug: string,
  kind: LearningNodeKind,
  title: string,
  summary: string,
  ref: string | null = kind === 'learning' ? `/learnings/${slug}` : null
): LearningNode => ({ slug, kind, title, summary, ref, tags: TAGS[slug] ?? [], previewImage: null, published: true })

// Tags cut across the topics: performance runs from load to scaling
const TAGS: Record<string, string[]> = {
  'data-systems': ['ddia', 'architecture'],
  'faults-and-failures': ['ddia', 'operations'],
  'describing-load': ['ddia', 'performance', 'architecture'],
  percentiles: ['ddia', 'performance'],
  'tail-latency-amplification': ['ddia', 'performance'],
  'scaling-up-and-out': ['ddia', 'architecture'],
  maintainability: ['ddia', 'operations', 'architecture'],
  ddia: ['ddia'],
}

const nodes: LearningNode[] = [
  node('reliability', 'concept', 'Reliability', 'Working correctly even when things go wrong.'),
  node('scalability', 'concept', 'Scalability', 'Staying fast as the load grows.'),

  node('data-systems', 'learning', 'Data systems are built from parts', 'Combine a database, a cache and an index, and keeping them in step is your job.'),
  node('faults-and-failures', 'learning', 'Faults and failures', 'Spares stop random faults; bugs and mistakes hit everything at once.'),
  node('describing-load', 'learning', 'Describing load', 'The few numbers that drive your costs, from Twitter’s timelines.'),
  node('percentiles', 'learning', 'Percentiles', 'The average describes nobody; watch the median and the tail.'),
  node('tail-latency-amplification', 'learning', 'Tail latency amplification', 'A page waits on its slowest server, so rare slowness is common.'),
  node('scaling-up-and-out', 'learning', 'Scaling up and out', 'A bigger machine while it’s simple; more machines for what holds no data.'),
  node('maintainability', 'learning', 'Maintainability', 'Easy to run, easy to understand, easy to change.'),

  node('ddia', 'external', 'Designing Data-Intensive Applications', 'Martin Kleppmann, 2017.', 'https://dataintensive.net/'),
  node('tail-at-scale', 'external', 'The Tail at Scale', 'Dean and Barroso, 2013.', 'https://research.google/pubs/the-tail-at-scale/'),
  node('timelines-at-scale', 'external', 'Timelines at Scale', 'Raffi Krikorian, 2012.', 'https://www.infoq.com/presentations/Twitter-Timeline-Scalability/'),
  node('tar-pit', 'external', 'Out of the Tar Pit', 'Moseley and Marks, 2006.', 'https://curtclifton.net/papers/MoseleyMarks06a.pdf'),
]

const edges = (type: LearningEdgeType, pairs: string): LearningEdge[] =>
  pairs
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [source, target] = pair.split('>')
      return { source, target, type }
    })

export const demoGraph: LearningGraph = {
  nodes,
  edges: [
    ...edges(
      'prerequisite',
      `data-systems>faults-and-failures data-systems>describing-load data-systems>maintainability
       describing-load>percentiles percentiles>tail-latency-amplification describing-load>scaling-up-and-out`
    ),
    ...edges(
      'part_of',
      `faults-and-failures>reliability describing-load>scalability percentiles>scalability
       tail-latency-amplification>scalability scaling-up-and-out>scalability`
    ),
    ...edges(
      'related',
      `data-systems>ddia tail-latency-amplification>tail-at-scale describing-load>timelines-at-scale
       maintainability>tar-pit`
    ),
  ],
}
