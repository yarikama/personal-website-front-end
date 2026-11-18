// Where the dial sits in its drawing, shared by the board and the zero-shot
// figure

// Each drawing is this wide: two side by side, or one above the other on a phone
export const WIDTH = 240
export const HEIGHT = 262

// The dial: every arrow from one centre
export const DIAL = { x: 120, y: 128, r: 54 }

const RAD = Math.PI / 180
// The point `r` from the centre at `angle` degrees, counterclockwise from the right
export const toward = (angle: number, r: number, at = DIAL) => ({
  x: at.x + r * Math.cos(angle * RAD),
  y: at.y - r * Math.sin(angle * RAD),
})
