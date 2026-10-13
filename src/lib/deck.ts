// Navigation for the talk deck. A position is a slide plus how many of its
// reveal steps are showing; `steps[i]` is how many steps slide i has (0 for a
// slide that shows everything at once).

export interface Position {
  index: number
  step: number
}

export const START: Position = { index: 0, step: 0 }

export function next(pos: Position, steps: number[]): Position {
  if (pos.step < steps[pos.index]) return { index: pos.index, step: pos.step + 1 }
  if (pos.index < steps.length - 1) return { index: pos.index + 1, step: 0 }
  return pos
}

// Going back lands on the previous slide fully revealed, as it was left
export function prev(pos: Position, steps: number[]): Position {
  if (pos.step > 0) return { index: pos.index, step: pos.step - 1 }
  if (pos.index > 0) return { index: pos.index - 1, step: steps[pos.index - 1] }
  return pos
}

export function last(steps: number[]): Position {
  return { index: steps.length - 1, step: steps[steps.length - 1] }
}

export function samePosition(a: Position, b: Position) {
  return a.index === b.index && a.step === b.step
}

// "#7" is slide 7 (1-based); "#7.2" is slide 7 with two steps showing.
// Anything out of range is pulled back into the deck.
export function parseHash(hash: string, steps: number[]): Position {
  const match = /^#?(\d+)(?:\.(\d+))?$/.exec(hash)
  if (!match) return START
  const index = Math.min(Math.max(Number(match[1]) - 1, 0), steps.length - 1)
  const step = Math.min(Number(match[2] ?? 0), steps[index])
  return { index, step }
}

export function formatHash(pos: Position): string {
  return pos.step > 0 ? `#${pos.index + 1}.${pos.step}` : `#${pos.index + 1}`
}

// Where the clock should be on arriving at slide `index`: each section's
// minutes are spread evenly over its slides
export function plannedSeconds(
  index: number,
  slideSections: string[],
  sections: { id: string; minutes: number }[]
): number {
  let seconds = 0
  for (const section of sections) {
    const slides = slideSections.filter((id) => id === section.id).length
    if (section.id === slideSections[index]) {
      const before = slideSections.slice(0, index).filter((id) => id === section.id).length
      return seconds + (section.minutes * 60 * before) / slides
    }
    seconds += section.minutes * 60
  }
  return seconds
}

// 452 -> "7:32", -75 -> "-1:15"
export function formatDuration(seconds: number): string {
  const sign = seconds < 0 ? '-' : ''
  const total = Math.round(Math.abs(seconds))
  return `${sign}${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
