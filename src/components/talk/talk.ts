import { createContext, useContext, type ReactNode } from 'react'

export type SectionId = 'intro' | 'work' | 'projects' | 'close'

export interface Section {
  id: SectionId
  label: string
  // Time budget; the presenter view compares the clock against it
  minutes: number
}

export interface SlideDef {
  id: string
  // Shown in the presenter view's outline
  title: string
  section: SectionId
  // How many <Reveal at={n}> steps the slide has; 0 or unset shows it all at once
  steps?: number
  // Title and closing slides leave out the footer and progress line
  bare?: boolean
  // Speaker notes, one line each, shown only in the presenter view
  notes?: string[]
  render: () => ReactNode
}

// Twenty minutes in all
export const sections: Section[] = [
  { id: 'intro', label: 'Who I am', minutes: 2 },
  { id: 'work', label: 'Two stories from work', minutes: 7 },
  { id: 'projects', label: 'Projects', minutes: 9 },
  { id: 'close', label: "What I'd bring", minutes: 2 },
]

export const sectionLabel = (id: SectionId) => sections.find((s) => s.id === id)!.label

// How many of the current slide's steps are showing
export const StepContext = createContext(0)

export const useStep = () => useContext(StepContext)
