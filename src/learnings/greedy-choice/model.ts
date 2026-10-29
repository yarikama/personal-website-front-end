import { seeded } from '../../components/explain/random'

// One request for the room, in hours of the day: 9.5 is 9:30. It holds the
// room from `start` up to `end`, so one that starts as another ends fits.
export interface Meeting {
  start: number
  end: number
}

export const DAY = { from: 9, to: 17 }

// Two meetings clash if they need the room at the same moment
export const clash = (a: Meeting, b: Meeting) => a.start < b.end && b.start < a.end

export type Rule = 'start' | 'shortest' | 'clashes' | 'end'

export const RULES: readonly Rule[] = ['start', 'shortest', 'clashes', 'end']

export const RULE_NAMES: Record<Rule, string> = {
  start: 'Starts first',
  shortest: 'Shortest',
  clashes: 'Fewest clashes',
  end: 'Ends first',
}

// One booking a rule makes: the meeting it takes, and those it turns away
// because they clash with it
export interface Pick {
  take: number
  drop: number[]
}

// What a rule scores a meeting by, among those still waiting: the lowest wins
function score(rule: Rule, day: Meeting[], waiting: number[], i: number): number {
  const m = day[i]
  if (rule === 'start') return m.start
  if (rule === 'end') return m.end
  if (rule === 'shortest') return m.end - m.start
  return waiting.filter((j) => j !== i && clash(m, day[j])).length
}

// The meetings tied for a rule's next pick
export function bestBy(rule: Rule, day: Meeting[], waiting: number[]): number[] {
  const scores = waiting.map((i) => score(rule, day, waiting, i))
  const low = Math.min(...scores)
  return waiting.filter((_, k) => scores[k] === low)
}

// A greedy rule run on a day: book the meeting the rule likes best, turn
// away everything that clashes with it, and repeat until nobody is waiting.
// Ties go to the meeting that ends first, then the one listed first.
export function book(day: Meeting[], rule: Rule): Pick[] {
  let waiting = day.map((_, i) => i)
  const picks: Pick[] = []
  while (waiting.length) {
    const tied = bestBy(rule, day, waiting)
    const take = tied.reduce((a, b) => (day[b].end < day[a].end ? b : a))
    const drop = waiting.filter((j) => j !== take && clash(day[take], day[j]))
    picks.push({ take, drop })
    waiting = waiting.filter((j) => j !== take && !drop.includes(j))
  }
  return picks
}

export const taken = (picks: Pick[]) => picks.map((pick) => pick.take)

// The most meetings that fit, by trying every set of them: slow, but sure,
// and what every rule is measured against. Returns one best set, in order
// of start. For days of up to about 16 meetings.
export function most(day: Meeting[]): number[] {
  const n = day.length
  let best: number[] = []
  for (let mask = 0; mask < 1 << n; mask++) {
    const set = day.map((_, i) => i).filter((i) => mask & (1 << i))
    if (set.length <= best.length) continue
    if (set.every((i, k) => set.slice(k + 1).every((j) => !clash(day[i], day[j])))) best = set
  }
  return best.sort((a, b) => day[a].start - day[b].start)
}

// When each booking of a schedule ends, in order: the k-th of these is the
// time the room is free again after k bookings
export const finishes = (day: Meeting[], set: number[]) => set.map((i) => day[i].end).sort((a, b) => a - b)

// A seeded day of `n` requests on the half hour, each half an hour to three
// hours long, inside the working day
export function randomDay(random: () => number, n: number): Meeting[] {
  const day: Meeting[] = []
  while (day.length < n) {
    const length = (1 + Math.floor(random() * 6)) / 2
    const start = DAY.from + Math.floor(random() * ((DAY.to - DAY.from - length) * 2 + 1)) / 2
    const meeting = { start, end: start + length }
    if (!day.some((m) => m.start === meeting.start && m.end === meeting.end)) day.push(meeting)
  }
  return day
}

// How often each rule books as many meetings as fit, over `count` random
// days of `n` requests
export function hitRates(seed: number, count: number, n: number): Record<Rule, number> {
  const random = seeded(seed)
  const hits: Record<Rule, number> = { start: 0, shortest: 0, clashes: 0, end: 0 }
  for (let d = 0; d < count; d++) {
    const day = randomDay(random, n)
    const fit = most(day).length
    for (const rule of RULES) if (book(day, rule).length === fit) hits[rule]++
  }
  return hits
}

// The random days the rules are tried on: how many, of how many requests
export const TRIALS = { days: 1000, requests: 8, seed: 7 }

// Each rule's hits on those days: worked out once, the first time it is asked
let trials: Record<Rule, number> | null = null
export const trialHits = () => (trials ??= hitRates(TRIALS.seed, TRIALS.days, TRIALS.requests))

const at = (start: number, end: number): Meeting => ({ start, end })

// The story's days. An all-day offsite starts first and blocks three short
// meetings.
export const OFFSITE: Meeting[] = [at(9, 17), at(10, 11), at(12, 13.5), at(14.5, 16)]

// An hour-long sync is the shortest, and sits across the change-over between
// two long meetings.
export const SYNC: Meeting[] = [at(9.5, 12.5), at(12, 13), at(12.5, 15.5)]

// A busy day built to fool "fewest clashes": four two-hour meetings fit end
// to end, but the 12:30 talk across the middle clashes with only two, while
// everything else clashes with three or four, so the rule takes the talk
// and loses both meetings it straddles.
export const BUSY: Meeting[] = [
  at(9, 11),
  at(10, 11.5),
  at(10.5, 12),
  at(10.5, 11.5),
  at(11, 13),
  at(12.5, 13.5),
  at(13, 15),
  at(14, 15.5),
  at(14.5, 15.5),
  at(14.5, 16),
  at(15, 17),
]

export const BUSY_TALK = 5

// The day the template is run on, in the order the requests came in. Two
// of the picks start the moment the last one ends.
export const WEDNESDAY: Meeting[] = [
  at(11, 13.5),
  at(9, 10.5),
  at(12.5, 14.5),
  at(10.5, 12),
  at(13.5, 15),
  at(9.5, 11),
  at(12, 13),
]

// The template, as the page shows it: sort by end, then one pass
export const TEMPLATE = `
def max_non_overlapping(intervals):
    intervals = sorted(intervals, key=lambda iv: iv[1])  # by end
    picked, last_end = [], float("-inf")
    for start, end in intervals:
        if start >= last_end:  # free again by then?
            picked.append((start, end))
            last_end = end
    return picked
`

// One moment of the template running: the line being run (from 1), whether
// the list has been sorted yet, the meeting the loop is on (by its place in
// the sorted list), what has been picked and passed over, and last_end
export interface ScanStep {
  line: number
  sorted: boolean
  at: number | null
  picked: number[]
  skipped: number[]
  lastEnd: number
  // The comparison on line 5, once it has been made
  fits: boolean | null
}

// The order the template visits the meetings in: by end (a stable sort,
// like Python's)
export const byEnd = (day: Meeting[]) =>
  day
    .map((_, i) => i)
    .sort((a, b) => day[a].end - day[b].end || a - b)

// Every line the template runs on `day`, in order
export function scan(day: Meeting[]): ScanStep[] {
  const order = byEnd(day)
  const steps: ScanStep[] = []
  let picked: number[] = []
  let skipped: number[] = []
  let lastEnd = -Infinity
  const push = (line: number, at: number | null, fits: boolean | null = null, sorted = true) =>
    steps.push({ line, sorted, at, picked, skipped, lastEnd, fits })
  push(1, null, null, false)
  push(2, null)
  push(3, null)
  order.forEach((i, k) => {
    push(4, k)
    const fits = day[i].start >= lastEnd
    push(5, k, fits)
    if (fits) {
      picked = [...picked, k]
      push(6, k, fits)
      lastEnd = day[i].end
      push(7, k, fits)
    } else {
      skipped = [...skipped, k]
    }
  })
  push(8, null)
  return steps
}

// "9:30" for 9.5, "1:00" for 13: a booking sheet's times
export function clock(hours: number): string {
  if (!Number.isFinite(hours)) return '–∞'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`
}
