// The Ask owls, drawn on a 16 x 16 grid. Each frame is 16 rows of 16
// characters; every character other than '.' is a pixel of the colour the
// palette gives it. The owls are named for the home server that answers the
// questions (lovelyowlhome).

export const OWL_GRID = 16

export type OwlPalette = Record<string, string>

const SHARED = {
  o: 'var(--color-ink)', // outline
  w: '#f8f7f4', // eye whites, light in both themes
  p: '#1a1a1a', // pupils
  y: '#d9a441', // beak and feet
}

export const OWL_PALETTES = {
  // The one that answers, in the site's accent
  sage: { ...SHARED, b: 'var(--color-sage)', l: 'var(--color-sage-light)' },
  // Its companion
  brown: { ...SHARED, b: '#8b6a4f', l: '#c9a882' },
} satisfies Record<string, OwlPalette>

export type OwlColour = keyof typeof OWL_PALETTES

const HEAD = [
  '................',
  '...o........o...',
  '...oo......oo...',
  '...obboooobbo...',
  '..obbbbbbbbbbo..',
]

const BODY = [
  '.obbllllllllbbo.',
  '.obbllbllbllbbo.',
  '.obbllllllllbbo.',
  '..obbllllllbbo..',
  '...obbbbbbbbo...',
  '....oooooooo....',
]

// Rows 5 to 8: the eyes and beak
const EYES_AHEAD = [
  '..obwwwbbwwwbo..',
  '..obwpwbbwpwbo..',
  '..obwwwyywwwbo..',
  '..obbbbyybbbbo..',
]

const EYES_SHUT = [
  '..obbbbbbbbbbo..',
  '..obooobbooobo..',
  '..obbbbyybbbbo..',
  '..obbbbyybbbbo..',
]

const EYES_DOWN = [
  '..obwwwbbwwwbo..',
  '..obwwwbbwwwbo..',
  '..obwpwyywpwbo..',
  '..obbbbyybbbbo..',
]

const EYES_UP = [
  '..obpwwbbpwwbo..',
  '..obwwwbbwwwbo..',
  '..obwwwyywwwbo..',
  '..obbbbyybbbbo..',
]

// Looking right, at the companion talking beside it
const EYES_RIGHT = [
  '..obwwwbbwwwbo..',
  '..obwwpbbwwpbo..',
  '..obwwwyywwwbo..',
  '..obbbbyybbbbo..',
]

// In profile, facing left, with the near wing raised: the companion talking.
// Rows 7 and 8 hold the beak, closed in one frame and open in the other.
const side = (beakTop: string, beakBottom: string) => [
  '................',
  '..........o.....',
  '.........oo.....',
  '....oooooobo....',
  '...obbbbbbbbo...',
  '..obwwwbbbbbboo.',
  '..obpwwbbbbbobbo',
  beakTop,
  beakBottom,
  '...ollbbbbobbo..',
  '...ollbbbbbbbo..',
  '...olllbbbbbbo..',
  '....ollbbbbbo...',
  '.....obbbbbbo...',
  '......oooooo....',
  '.......yy.......',
]

// In flight, feet tucked: wings raised, then wings down
const FLY_UP = [
  '................',
  '...o........o...',
  'b..oo......oo..b',
  'bb.obboooobbo.bb',
  '.bobbbbbbbbbbob.',
  ...EYES_AHEAD,
  '.obbllllllllbbo.',
  '.obbllbllbllbbo.',
  '.obbllllllllbbo.',
  '..obbllllllbbo..',
  '...obbbbbbbbo...',
  '....oooooooo....',
  '......y..y......',
]

const FLY_DOWN = [
  '................',
  '...o........o...',
  '...oo......oo...',
  '...obboooobbo...',
  '..obbbbbbbbbbo..',
  ...EYES_AHEAD,
  'bobbllllllllbbob',
  'bobbllbllbllbbob',
  'bobbllllllllbbob',
  'b.obbllllllbbo.b',
  '...obbbbbbbbo...',
  '....oooooooo....',
  '......y..y......',
]

const FEET_STILL = '.....yy..yy.....'
const FEET_WIDE = '....yy....yy....'
const FEET_TOGETHER = '......yyyy......'

const owl = (eyes: string[], feet: string) => [...HEAD, ...eyes, ...BODY, feet]

export const OWL_FRAMES = {
  stand: owl(EYES_AHEAD, FEET_STILL),
  blink: owl(EYES_SHUT, FEET_STILL),
  stepA: owl(EYES_AHEAD, FEET_WIDE),
  stepB: owl(EYES_AHEAD, FEET_TOGETHER),
  look: owl(EYES_DOWN, FEET_STILL),
  think: owl(EYES_UP, FEET_STILL),
  sleep: owl(EYES_SHUT, FEET_STILL),
  listen: owl(EYES_RIGHT, FEET_STILL),
  talk: side('.yyowwwbbbbobbbo', '..yobbbbbbobbbo.'),
  talkOpen: side('.yyowwwbbbbobbbo', '.y.obbbbbbobbbo.'),
  flyUp: FLY_UP,
  flyDown: FLY_DOWN,
}

export type OwlPose = keyof typeof OWL_FRAMES

export interface OwlRun {
  x: number
  y: number
  width: number
  colour: string
}

// One rectangle per run of same-coloured pixels in a row, so a frame is a few
// dozen rectangles rather than a few hundred.
export function frameRuns(rows: string[], palette: OwlPalette): OwlRun[] {
  const runs: OwlRun[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const key = row[x]
      let end = x + 1
      while (end < row.length && row[end] === key) end++
      if (key !== '.') runs.push({ x, y, width: end - x, colour: palette[key] })
      x = end
    }
  })
  return runs
}
