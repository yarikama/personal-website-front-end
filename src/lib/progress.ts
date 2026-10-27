import { useEffect, useState } from 'react'

// How far a visitor has come with each learning page, kept in their own
// browser. A page read with its checks answered cracks its node on the
// map; read again, spaced out, it cracks further and then opens into a
// sun. Left alone too long, it fades back a stage at a time.

// 1: cracked, 2: light shows through, 3: a sun
export type Stage = 0 | 1 | 2 | 3
export interface Progress {
  stage: 1 | 2 | 3
  // When the reading that reached this stage counted, or, once it has
  // faded, when it last faded
  at: number
}
export type Progresses = Record<string, Progress>

const DAY = 86_400_000
// How long after a reading that counted the next one counts: spaced out,
// recalling it is what makes it stay
export const WAIT: Record<1 | 2, number> = { 1: DAY, 2: 3 * DAY }
// How long each stage holds without a reading before it fades back one
export const HOLD: Record<1 | 2 | 3, number> = { 1: 14 * DAY, 2: 30 * DAY, 3: 90 * DAY }

// Where it stands at `now`, after any fading since: null once faded all
// the way
export function settle(progress: Progress | undefined, now: number): Progress | null {
  if (!progress) return null
  let { stage, at } = progress
  while (now - at > HOLD[stage]) {
    at += HOLD[stage]
    if (stage === 1) return null
    stage = (stage - 1) as 1 | 2
  }
  return { stage, at }
}

export const stageOf = (progress: Progress | undefined, now: number): Stage => settle(progress, now)?.stage ?? 0

// A reading with its checks answered: the first cracks it, and each later
// one, once the wait is over, takes it a stage further. Too soon, it
// changes nothing. A sun read again stays lit for longer.
export function afterReading(progress: Progress | undefined, now: number): Progress {
  const settled = settle(progress, now)
  if (!settled) return { stage: 1, at: now }
  if (settled.stage === 3) return { stage: 3, at: now }
  if (now - settled.at < WAIT[settled.stage]) return settled
  return { stage: (settled.stage + 1) as 2 | 3, at: now }
}

// When the next reading counts, if not already; and when it fades
export const countsFrom = (progress: Progress) => (progress.stage === 3 ? null : progress.at + WAIT[progress.stage])
export const fadesOn = (progress: Progress) => progress.at + HOLD[progress.stage]

const KEY = 'learnings-progress'
// Told when a reading counts, so the map changes as it happens
const CHANGED = 'learnings-progress'

// What is kept, or nothing where there is no storage or it isn't ours
export function readProgress(storage: Pick<Storage, 'getItem'> | null = safeStorage()): Progresses {
  try {
    const kept: unknown = JSON.parse(storage?.getItem(KEY) ?? '{}')
    if (!kept || typeof kept !== 'object') return {}
    const progresses: Progresses = {}
    for (const [slug, value] of Object.entries(kept)) {
      const { stage, at } = (value ?? {}) as Partial<Progress>
      if ((stage === 1 || stage === 2 || stage === 3) && typeof at === 'number') progresses[slug] = { stage, at }
    }
    return progresses
  } catch {
    return {}
  }
}

// Counts a reading of `slug`, and says so
export function recordReading(slug: string, now = Date.now(), storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeStorage()) {
  const progresses = readProgress(storage)
  progresses[slug] = afterReading(progresses[slug], now)
  try {
    storage?.setItem(KEY, JSON.stringify(progresses))
  } catch {
    // Full or blocked: this reading goes uncounted
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGED))
  return progresses[slug]
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

// Where every page stands now, after any fading
export function settleAll(progresses: Progresses, now: number): Progresses {
  const settled: Progresses = {}
  for (const [slug, progress] of Object.entries(progresses)) {
    const at = settle(progress, now)
    if (at) settled[slug] = at
  }
  return settled
}

// Where every page stands, kept up to date as readings count, here or in
// another tab
export function useProgress(): Progresses {
  const [progresses, setProgresses] = useState(() => settleAll(readProgress(), Date.now()))
  useEffect(() => {
    const reread = () => setProgresses(settleAll(readProgress(), Date.now()))
    window.addEventListener(CHANGED, reread)
    window.addEventListener('storage', reread)
    return () => {
      window.removeEventListener(CHANGED, reread)
      window.removeEventListener('storage', reread)
    }
  }, [])
  return progresses
}
