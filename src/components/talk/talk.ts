import { createContext, useContext, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface Section {
  id: string
  label: string
  // Time budget; the presenter view compares the clock against it
  minutes: number
  // Marks the part on outline slides
  icon?: LucideIcon
}

export interface SlideDef {
  id: string
  // Shown in the presenter view's outline
  title: string
  // The id of one of the talk's sections
  section: string
  // How many <Reveal at={n}> steps the slide has; 0 or unset shows it all at once
  steps?: number
  // Title and closing slides leave out the footer and progress line
  bare?: boolean
  // Speaker notes, one line each, shown only in the presenter view
  notes?: string[]
  render: () => ReactNode
}

// What the listings show, kept apart from the slides so that a listing does
// not download every talk
export interface TalkMeta {
  // The talk lives at /talks/<slug>
  slug: string
  title: string
  // A talk is given to an audience; a lesson teaches something step by step
  kind: 'talk' | 'lesson'
  // Public talks are listed on /talks and open to search engines. Private
  // ones are left out of both, but anyone with the link can open them, and
  // their slides ship in the site's bundle like the rest: nothing secret
  // goes in a talk.
  visibility: 'public' | 'private'
  // ISO date it was, or will be, given
  date: string
  venue?: string
  summary: string
}

export interface TalkContent {
  sections: Section[]
  slides: SlideDef[]
}

export interface TalkEntry extends TalkMeta {
  load: () => Promise<{ default: TalkContent }>
}

export type Talk = TalkMeta & TalkContent

// The talk on screen, for the stage and for slides that show its parts
export const TalkContext = createContext<Talk | null>(null)

export function useTalk(): Talk {
  const talk = useContext(TalkContext)
  if (!talk) throw new Error('useTalk is only for slides inside a TalkContext')
  return talk
}

export const sectionLabel = (sections: Section[], id: string) => sections.find((s) => s.id === id)?.label ?? id

// How many of the current slide's steps are showing
export const StepContext = createContext(0)

export const useStep = () => useContext(StepContext)
