import type { ComponentType } from 'react'
import type { Project } from '../types'

export interface CaseStudyPage {
  slug: string
  load: () => Promise<{ default: ComponentType<{ project: Project }> }>
}

// The projects told as a story on their own page at /works/<slug>. A
// project's card, title and links come from the API; its story is code, in
// its own folder, loaded only when it is opened. A project not listed here
// still has a page, made from its card. To add one: make
// src/projects/<slug>/index.tsx default-export the page and list it here.
export const caseStudies: CaseStudyPage[] = [
  { slug: 'homelab-self-hosted-llm-platform', load: () => import('./homelab-self-hosted-llm-platform') },
  { slug: 'prompt-aware-image-token-pruning', load: () => import('./prompt-aware-image-token-pruning') },
  {
    slug: 'defending-llm-agents-against-tool-schema-poisoning',
    load: () => import('./defending-llm-agents-against-tool-schema-poisoning'),
  },
  {
    slug: 'cross-size-generalization-gnn-job-shop-scheduling',
    load: () => import('./cross-size-generalization-gnn-job-shop-scheduling'),
  },
]

export const findCaseStudy = (slug: string | undefined) => caseStudies.find((page) => page.slug === slug)
