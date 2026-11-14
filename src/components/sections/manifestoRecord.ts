// Geometry for the Manifesto's record. The stories sit on the rim of a wheel
// whose centre is above the screen; the record is that wheel drawn as vinyl,
// and a tonearm reaching in from the right plays it from the rim inward as
// the section is read.

// Radius as a share of the viewport width. Titles take up more of a phone's
// width, so the wheel is larger there to keep neighbours clear of the title.
export const WHEEL_RADIUS = 1.15
export const WHEEL_RADIUS_NARROW = 1.3
export const NARROW_WIDTH = 768

// The record reaches past the line the titles sit on, so they lie on the
// grooves rather than on its edge: by this share of the radius, and never by
// less than RIM_MIN pixels, so a phone's subtitle stays clear of the rim
const RIM_PAST_TITLES = 0.17
const RIM_MIN = 160

// The tonearm shows from this width up; narrower, it would cross the titles
export const ARM_MIN_WIDTH = 1100

// The needle starts near the rim and plays this far inward over the section,
// as shares of the record's radius
const NEEDLE_START = 0.975
const NEEDLE_TRAVEL = 0.13

export function wheelRadius(width: number) {
  return width * (width < NARROW_WIDTH ? WHEEL_RADIUS_NARROW : WHEEL_RADIUS)
}

export function recordRadius(width: number) {
  const radius = wheelRadius(width)
  return radius + Math.max(radius * RIM_PAST_TITLES, RIM_MIN)
}

// Radii, in pixels from the record's centre, of the two smooth bands between
// tracks: one between the titles and the rim, one well above the titles
export function recordGaps(width: number) {
  const radius = wheelRadius(width)
  const rim = recordRadius(width)
  return { outer: radius + (rim - radius) * 0.72, inner: radius - 260 }
}

export interface Needle {
  // Where the stylus touches the record, in the stage's pixels
  x: number
  y: number
  // The arm's direction from the stylus toward its pivot, in degrees
  angle: number
  // Length of the arm from the stylus to the pivot
  length: number
}

// The stylus for a stage `width` x `height` at section progress 0-1. The pivot
// is off the right edge of the screen; the arm is as long as it takes to put
// the stylus near the rim at 85% of the width, and swings inward from there.
export function needleAt(progress: number, width: number, height: number): Needle {
  const radius = wheelRadius(width)
  const rim = recordRadius(width)
  const centre = { x: width / 2, y: height / 2 - radius }
  const pivot = { x: width + 260, y: height * 0.62 }

  const startRadius = rim * NEEDLE_START
  const startX = width * 0.85
  const start = { x: startX, y: centre.y + Math.sqrt(startRadius ** 2 - (startX - centre.x) ** 2) }
  const length = Math.hypot(start.x - pivot.x, start.y - pivot.y)

  // Where a circle of the arm's length about the pivot meets the groove the
  // needle is on: the intersection on the screen side
  const groove = rim * (NEEDLE_START - Math.min(1, Math.max(0, progress)) * NEEDLE_TRAVEL)
  const dx = centre.x - pivot.x
  const dy = centre.y - pivot.y
  const d = Math.hypot(dx, dy)
  const a = (length ** 2 - groove ** 2 + d ** 2) / (2 * d)
  const h = Math.sqrt(Math.max(0, length ** 2 - a ** 2))
  const mx = pivot.x + (a * dx) / d
  const my = pivot.y + (a * dy) / d
  const x = mx + (h * dy) / d
  const y = my - (h * dx) / d

  return { x, y, angle: (Math.atan2(pivot.y - y, pivot.x - x) * 180) / Math.PI, length }
}
