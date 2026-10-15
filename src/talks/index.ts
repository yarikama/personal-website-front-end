import type { TalkEntry } from '../components/talk/talk'

// Every talk, newest first. Each one's slides live in its own folder and load
// only when the talk is opened. To add one: make src/talks/<slug>/index.ts
// export its sections and slides, then list it here.
export const talks: TalkEntry[] = [
  {
    slug: 'interview',
    title: 'Interview talk',
    kind: 'talk',
    // Has a phone number on the title slide
    visibility: 'private',
    date: '2026-10-12',
    summary: 'Education and experience, two stories from work and two projects, in twenty minutes.',
    load: () => import('./interview'),
  },
]

export const publicTalks = talks.filter((talk) => talk.visibility === 'public')

export const findTalk = (slug: string | undefined) => talks.find((talk) => talk.slug === slug)

// "2026-10-12" -> "Oct 12, 2026", on the day as written whatever the time zone
export const formatTalkDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
