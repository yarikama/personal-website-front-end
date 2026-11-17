// Where things sit on the map of points, in the SVG's own units: one unit
// of the data is UNIT pixels, and the origin sits in the middle

export const WIDTH = 600
export const HEIGHT = 360
export const UNIT = 60

export const px = (x1: number) => WIDTH / 2 + UNIT * x1
export const py = (x2: number) => HEIGHT / 2 - UNIT * x2
export const toData = (x: number, y: number): [number, number] => [(x - WIDTH / 2) / UNIT, (HEIGHT / 2 - y) / UNIT]
