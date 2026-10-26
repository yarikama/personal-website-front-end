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
export const learningPages: LearningPage[] = []

export const findLearningPage = (slug: string | undefined) => learningPages.find((page) => page.slug === slug)
