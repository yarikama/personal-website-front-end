import type { ComponentType } from 'react'

export interface LearningPage {
  slug: string
  load: () => Promise<{ default: ComponentType }>
}

// Every learning page. The graph and each node's card come from the API;
// a page is code, in its own folder, and loads only when it is opened. To
// add one: make src/learnings/<slug>/index.tsx default-export the page, list
// it here, and once it is live publish its node (kind "learning", ref
// /learnings/<slug>) through the writing MCP server.
export const learningPages: LearningPage[] = [
  { slug: 'data-systems', load: () => import('./data-systems') },
  { slug: 'faults-and-failures', load: () => import('./faults-and-failures') },
  { slug: 'describing-load', load: () => import('./describing-load') },
  { slug: 'percentiles', load: () => import('./percentiles') },
  { slug: 'tail-latency-amplification', load: () => import('./tail-latency-amplification') },
  { slug: 'scaling-up-and-out', load: () => import('./scaling-up-and-out') },
  { slug: 'maintainability', load: () => import('./maintainability') },
  { slug: 'learning-from-reward', load: () => import('./learning-from-reward') },
  { slug: 'exploration-and-exploitation', load: () => import('./exploration-and-exploitation') },
  { slug: 'reward-and-value', load: () => import('./reward-and-value') },
  { slug: 'temporal-difference-learning', load: () => import('./temporal-difference-learning') },
  { slug: 'learning-from-every-move', load: () => import('./learning-from-every-move') },
  { slug: 'tracking-change', load: () => import('./tracking-change') },
  { slug: 'optimistic-initial-values', load: () => import('./optimistic-initial-values') },
  { slug: 'upper-confidence-bound', load: () => import('./upper-confidence-bound') },
  { slug: 'gradient-bandits', load: () => import('./gradient-bandits') },
  { slug: 'contextual-bandits', load: () => import('./contextual-bandits') },
]

export const findLearningPage = (slug: string | undefined) => learningPages.find((page) => page.slug === slug)
