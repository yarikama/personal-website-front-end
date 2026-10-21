// The Ask owl, drawn on a 16 x 16 grid. Each frame is 16 rows of 16
// characters; every character other than '.' is a pixel of the colour the
// palette gives it. The owl is named for the home server that answers the
// questions (lovelyowlhome).

export const OWL_GRID = 16

export const OWL_PALETTE: Record<string, string> = {
  o: 'var(--color-ink)', // outline
  b: 'var(--color-sage)', // body and wings
  l: 'var(--color-sage-light)', // belly
  w: '#f8f7f4', // eye whites, light in both themes
  p: '#1a1a1a', // pupils
  y: '#d9a441', // beak and feet
}

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
export function frameRuns(rows: string[]): OwlRun[] {
  const runs: OwlRun[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const key = row[x]
      let end = x + 1
      while (end < row.length && row[end] === key) end++
      if (key !== '.') runs.push({ x, y, width: end - x, colour: OWL_PALETTE[key] })
      x = end
    }
  })
  return runs
}
