import type { LearningEdge, LearningEdgeType, LearningGraph, LearningNode, LearningNodeKind } from '../types'

// The map shown while the real one has no published nodes yet: chapter 1
// of Designing Data-Intensive Applications and of Sutton and Barto's
// Reinforcement Learning, whose pages are on the site.
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
  'learning-from-reward': ['rl', 'foundations'],
  'exploration-and-exploitation': ['rl', 'decisions'],
  'reward-and-value': ['rl', 'foundations', 'values'],
  'temporal-difference-learning': ['rl', 'values', 'algorithms'],
  'learning-from-every-move': ['rl', 'values', 'algorithms'],
  'sutton-barto': ['rl'],
}

const nodes: LearningNode[] = [
  node('data-intensive', 'concept', 'Data systems', 'Storing, moving and processing data at scale: the subject of DDIA.'),
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

  node('reinforcement-learning', 'concept', 'Reinforcement learning', 'Learning what to do from reward, by trial and error.'),
  node('rl-problem', 'concept', 'The problem', 'An agent acts, the world answers with a score, and the agent has to find what earns the most.'),
  node('values', 'concept', 'Values', 'How good it is to be somewhere, counting everything likely to follow.'),

  node('learning-from-reward', 'learning', 'Learning from reward', 'Learning from a score, not from answers: try, see how it went, do more of what worked.'),
  node('exploration-and-exploitation', 'learning', 'Explore or exploit', 'Use what you know, or find out more: an agent that only does one does badly.'),
  node('reward-and-value', 'learning', 'Reward versus value', 'Reward is what’s good now; value is all the reward still to come. Choose by value.'),
  node('temporal-difference-learning', 'learning', 'Temporal-difference learning', 'Nudge each guess toward the next one, and learn during the game, not after it.'),
  node('learning-from-every-move', 'learning', 'Learning from every move', 'Scoring each position teaches far faster than keeping the strategies that won.'),

  node('sutton-barto', 'external', 'Reinforcement Learning: An Introduction', 'Sutton and Barto, 2nd edition.', 'https://mitpress.mit.edu/9780262039246/reinforcement-learning/'),
  node('td-gammon', 'external', 'Temporal Difference Learning and TD-Gammon', 'Gerald Tesauro, 1995.', 'https://dl.acm.org/doi/10.1145/203330.203343'),
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
       describing-load>percentiles percentiles>tail-latency-amplification describing-load>scaling-up-and-out
       learning-from-reward>exploration-and-exploitation learning-from-reward>reward-and-value
       reward-and-value>temporal-difference-learning exploration-and-exploitation>temporal-difference-learning
       temporal-difference-learning>learning-from-every-move`
    ),
    // The field, its topics (two of them pages), and the ideas in each topic
    ...edges(
      'part_of',
      `data-systems>data-intensive reliability>data-intensive scalability>data-intensive
       maintainability>data-intensive faults-and-failures>reliability describing-load>scalability
       percentiles>scalability tail-latency-amplification>scalability scaling-up-and-out>scalability
       rl-problem>reinforcement-learning values>reinforcement-learning learning-from-reward>rl-problem
       exploration-and-exploitation>rl-problem reward-and-value>values temporal-difference-learning>values
       learning-from-every-move>values`
    ),
    // The reading order: each chapter's pages, one after another
    ...edges(
      'next',
      `data-systems>faults-and-failures faults-and-failures>describing-load describing-load>percentiles
       percentiles>tail-latency-amplification tail-latency-amplification>scaling-up-and-out
       scaling-up-and-out>maintainability
       learning-from-reward>exploration-and-exploitation exploration-and-exploitation>reward-and-value
       reward-and-value>temporal-difference-learning temporal-difference-learning>learning-from-every-move`
    ),
    ...edges(
      'related',
      `data-systems>ddia tail-latency-amplification>tail-at-scale describing-load>timelines-at-scale
       maintainability>tar-pit learning-from-reward>sutton-barto temporal-difference-learning>td-gammon`
    ),
  ],
}
