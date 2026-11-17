// Where things sit in the bike charts: age along the bottom, price up the
// side, in the SVG's own units

export const WIDTH = 560
export const HEIGHT = 330
export const LEFT = 56
export const RIGHT = 544
export const TOP = 18
export const BOTTOM = 286
export const AGES: [number, number] = [0, 8]

export interface Scale {
  low: number
  high: number
}

// The story's prices; the lab has room for more
export const STORY_SCALE: Scale = { low: 100, high: 600 }
export const LAB_SCALE: Scale = { low: 0, high: 800 }

export const ageX = (age: number) => LEFT + ((age - AGES[0]) / (AGES[1] - AGES[0])) * (RIGHT - LEFT)
export const priceY = (price: number, scale: Scale) =>
  BOTTOM - ((price - scale.low) / (scale.high - scale.low)) * (BOTTOM - TOP)
// Pixels per dollar, so a square's sides match its gap
export const perDollar = (scale: Scale) => (BOTTOM - TOP) / (scale.high - scale.low)
