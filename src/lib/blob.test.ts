import { describe, expect, it } from 'vitest'
import { blobPath, type BlobShape } from './blob'

const shape: BlobShape = { cx: 100, cy: 50, rx: 40, ry: 20, rotate: 0, phase: [0.4, 2.1] }

// Every coordinate pair in the path, control points included
const coordinates = (d: string) =>
  [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map(Number).reduce<number[][]>((pairs, n, i) => {
    if (i % 2 === 0) pairs.push([n])
    else pairs[pairs.length - 1].push(n)
    return pairs
  }, [])

describe('blobPath', () => {
  it('draws one closed curve through sixteen points', () => {
    const d = blobPath(shape)
    expect(d.startsWith('M')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
    expect(d.match(/C/g)).toHaveLength(16)
  })

  it('draws the same shape every time', () => {
    expect(blobPath(shape)).toBe(blobPath(shape))
  })

  it('stays near its ellipse', () => {
    // The edge swells by at most a fifth; control points can reach a little past
    for (const [x, y] of coordinates(blobPath(shape))) {
      expect(Math.abs(x - shape.cx)).toBeLessThanOrEqual(shape.rx * 1.3)
      expect(Math.abs(y - shape.cy)).toBeLessThanOrEqual(shape.ry * 1.3)
    }
  })

  it('bulges differently with a different phase', () => {
    expect(blobPath({ ...shape, phase: [3, 1] })).not.toBe(blobPath(shape))
  })
})
