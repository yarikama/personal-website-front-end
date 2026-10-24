export interface BlobShape {
  cx: number
  cy: number
  rx: number
  ry: number
  // Degrees
  rotate: number
  // Where (radians) the blob's two and three bulges sit around it, so no two
  // blobs bulge alike
  phase: [number, number]
}

const BLOB_POINTS = 16

// An SVG path for a closed curve around an ellipse whose edge swells and dips
// in two gentle waves, smoothed with Catmull-Rom
export function blobPath({ cx, cy, rx, ry, rotate, phase }: BlobShape) {
  const angle = (rotate * Math.PI) / 180
  const points = Array.from({ length: BLOB_POINTS }, (_, i) => {
    const t = (i / BLOB_POINTS) * Math.PI * 2
    const w = 0.12 * Math.sin(2 * t + phase[0]) + 0.08 * Math.sin(3 * t + phase[1])
    const x = Math.cos(t) * rx * (1 + w)
    const y = Math.sin(t) * ry * (1 + w)
    return [
      cx + x * Math.cos(angle) - y * Math.sin(angle),
      cy + x * Math.sin(angle) + y * Math.cos(angle),
    ]
  })
  const at = (i: number) => points[(i + points.length) % points.length]
  const r = (n: number) => Math.round(n * 10) / 10

  let d = `M${r(at(0)[0])} ${r(at(0)[1])}`
  points.forEach((_, i) => {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${r(c1[0])} ${r(c1[1])} ${r(c2[0])} ${r(c2[1])} ${r(p2[0])} ${r(p2[1])}`
  })
  return `${d}Z`
}
