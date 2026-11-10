// Busking with four songs. The setlist says how often to play each (a
// softmax over four preferences, the policy). Each weekend you play and note
// every tip; on weekdays you rework the setlist from those notes, by the
// policy gradient, as many times as you like. Notes taken under the old
// setlist are weighted by how much more often the new one plays the song
// (the importance ratio). PPO adds one rule: once a song's ratio is past
// 1 ± ε in the way its note pushes, that note stops pushing.

import { seeded } from '../../components/explain/random'

// ---------------------------------------------------------------------------
// The songs, and their tips

export const SONGS = ['ballad', 'cover', 'jig', 'waltz'] as const
export type Song = (typeof SONGS)[number]
export const BEST = 3 // the waltz

// A play's tip, in dollars: the song's going rate give or take $1.50, and
// now and then a stranger who drops $20
export const TIP = {
  rate: [1.5, 3, 3.5, 5],
  wobble: 1.5,
  luck: 0.05,
  windfall: 20,
}

// What a play of each song is worth on average
export const meanTip = (song: number) => TIP.rate[song] + TIP.luck * TIP.windfall

export function tip(song: number, random: () => number) {
  const wobble = (2 * random() - 1) * TIP.wobble
  return TIP.rate[song] + wobble + (random() < TIP.luck ? TIP.windfall : 0)
}

// ---------------------------------------------------------------------------
// The setlist: a preference for each song, turned into shares by softmax

export type Prefs = number[]
export const EVEN: Prefs = [0, 0, 0, 0]

export function shares(prefs: Prefs) {
  const top = Math.max(...prefs)
  const e = prefs.map((p) => Math.exp(p - top))
  const total = e.reduce((sum, x) => sum + x, 0)
  return e.map((x) => x / total)
}

// What a setlist earns a play, on average
export const worth = (prefs: Prefs) => shares(prefs).reduce((sum, s, song) => sum + s * meanTip(song), 0)

// ---------------------------------------------------------------------------
// A weekend's notes

export interface Note {
  song: number
  tip: number
  // The song's share when it was played: the old policy's chance, π_old
  share: number
  // How much better than the weekend's usual tip this one was: the advantage
  surprise: number
}

export const PLAYS = 16

// Play a weekend from the setlist and note it; the usual is the weekend's
// average tip
export function weekend(prefs: Prefs, random: () => number, plays = PLAYS): Note[] {
  const s = shares(prefs)
  const notes: Omit<Note, 'surprise'>[] = []
  for (let i = 0; i < plays; i++) {
    let u = random()
    let song = 0
    while (song < SONGS.length - 1 && u > s[song]) {
      u -= s[song]
      song++
    }
    notes.push({ song, tip: tip(song, random), share: s[song] })
  }
  return withSurprise(notes)
}

export const usualOf = (notes: { tip: number }[]) => notes.reduce((sum, n) => sum + n.tip, 0) / notes.length

function withSurprise(notes: Omit<Note, 'surprise'>[]): Note[] {
  const usual = usualOf(notes)
  return notes.map((n) => ({ ...n, surprise: n.tip - usual }))
}

// ---------------------------------------------------------------------------
// A rework: the policy gradient on the weekend's notes, each weighted by its
// ratio, the song's share now over its share then

export const ALPHA = 0.1
// PPO's ε: a note stops pushing once its song is a fifth past where it was
export const EPSILON = 0.2

export const ratio = (prefs: Prefs, note: Note) => shares(prefs)[note.song] / note.share

// Whether a note has stopped pushing: it would push its song further past
// 1 ± ε. A note pushing its song back toward where it was never stops.
export function stopped(r: number, surprise: number, limit: number | null) {
  if (limit === null) return false
  return (surprise > 0 && r > 1 + limit) || (surprise < 0 && r < 1 - limit)
}

// PPO's objective for one note: the smaller of the weighted surprise and the
// weighted surprise with the ratio held inside 1 ± ε
export function clippedObjective(r: number, surprise: number, limit = EPSILON) {
  const held = Math.min(1 + limit, Math.max(1 - limit, r))
  return Math.min(r * surprise, held * surprise)
}

export function rework(prefs: Prefs, notes: Note[], limit: number | null, alpha = ALPHA): Prefs {
  const s = shares(prefs)
  const push = prefs.map(() => 0)
  for (const note of notes) {
    const r = s[note.song] / note.share
    if (stopped(r, note.surprise, limit)) continue
    // r × surprise × the slope of log π(song): +1 for the song, − its share for every song
    for (let song = 0; song < prefs.length; song++) {
      push[song] += (r * note.surprise * ((song === note.song ? 1 : 0) - s[song])) / notes.length
    }
  }
  return prefs.map((p, song) => p + alpha * push[song])
}

// The setlist after each of `times` reworks on the same notes, the first
// entry before any
export function reworks(prefs: Prefs, notes: Note[], times: number, limit: number | null): Prefs[] {
  const out = [prefs]
  for (let k = 0; k < times; k++) out.push(rework(out[k], notes, limit))
  return out
}

// ---------------------------------------------------------------------------
// The story: one weekend at an even setlist, four plays of each song, and
// a stranger's $20 on the cover. Then thirty reworks, without and with the
// limit.

export const STORY_TIPS = [
  [1, 2, 1, 2],
  [2, 1, 20, 2],
  [3, 4, 2, 3],
  [5, 4, 6, 5],
]
export const REWORKS = 30

export const STORY_NOTES: Note[] = withSurprise(
  STORY_TIPS.flatMap((tips, song) => tips.map((t) => ({ song, tip: t, share: shares(EVEN)[song] })))
)
export const STORY_USUAL = usualOf(STORY_NOTES)

export const story = (limit: number | null) => reworks(EVEN, STORY_NOTES, REWORKS, limit)

// Each song's average tip in the story's notes
export const storyAverages = () => STORY_TIPS.map((tips) => tips.reduce((sum, t) => sum + t, 0) / tips.length)

// ---------------------------------------------------------------------------
// Many weekends: busk, rework `times` times, repeat. Over many runs.

export const WEEKENDS = 20
export const RUNS = 200
export const SHOWN_RUNS = 40

export interface Busking {
  // The setlist after each weekend's reworks, the first entry before any
  setlists: Prefs[]
}

export function busk(seed: number, times: number, limit: number | null, weekends = WEEKENDS): Busking {
  const random = seeded(seed)
  const setlists = [EVEN]
  for (let w = 0; w < weekends; w++) {
    const notes = weekend(setlists[w], random)
    setlists.push(reworks(setlists[w], notes, times, limit).at(-1)!)
  }
  return { setlists }
}

export interface Summary {
  runs: Busking[]
  // The waltz's average share, weekend by weekend
  waltz: number[]
  // At the last weekend: the share of runs mostly on the waltz, mostly on
  // another song, and the average a play earns
  onWaltz: number
  onOther: number
  earns: number
}

export function summarise(times: number, limit: number | null, runs = RUNS, weekends = WEEKENDS): Summary {
  const all = Array.from({ length: runs }, (_, i) => busk(i + 1, times, limit, weekends))
  const waltz = Array.from({ length: weekends + 1 }, (_, w) => all.reduce((sum, run) => sum + shares(run.setlists[w])[BEST], 0) / runs)
  const last = all.map((run) => shares(run.setlists[weekends]))
  return {
    runs: all,
    waltz,
    onWaltz: last.filter((s) => s[BEST] > 0.5).length / runs,
    onOther: last.filter((s) => s.some((x, song) => song !== BEST && x > 0.5)).length / runs,
    earns: all.reduce((sum, run) => sum + worth(run.setlists[weekends]), 0) / runs,
  }
}

// The lab's settings
export const TIMES = [1, REWORKS] as const
export const LIMITS = { None: null, '±20%': EPSILON } as const
export type Limit = keyof typeof LIMITS

// ---------------------------------------------------------------------------
// The worked notes for the one line of math: a surprise and a ratio each

export const WORKED = [
  { surprise: 2, ratio: 1.1 },
  { surprise: 2, ratio: 1.3 },
  { surprise: -2, ratio: 1.3 },
]
