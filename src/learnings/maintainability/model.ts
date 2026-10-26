// How many connections a system of `parts` has, two ways

// Every part talks to every other part directly
export const everyPair = (parts: number) => (parts * (parts - 1)) / 2

// Every part talks only to one shared interface
export const throughOne = (parts: number) => parts

// Where `count` points sit, evenly round a circle of `radius` about (cx, cy),
// the first at the top
export const aroundCircle = (count: number, cx: number, cy: number, radius: number) =>
  Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }
  })
