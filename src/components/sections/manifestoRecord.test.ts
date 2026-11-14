import { describe, expect, it } from 'vitest'
import { ARM_MIN_WIDTH, needleAt, recordRadius, wheelRadius } from './manifestoRecord'

const SCREENS = [
  [1100, 760],
  [1280, 720],
  [1280, 800],
  [1440, 900],
  [1536, 864],
  [1920, 1080],
  [2560, 1440],
]

// The widest title, "Relentlessly" in the 8rem serif, is under 720px across
const TITLE_HALF_WIDTH = 360

describe('the Manifesto record', () => {
  it('reaches past the titles on every screen, by at least 160px', () => {
    for (const width of [390, 768, 1024, 1440, 1920]) {
      expect(recordRadius(width) - wheelRadius(width)).toBeGreaterThan(160 - 1e-9)
    }
  })

  it('plays from the rim inward as the section is read', () => {
    const [width, height] = [1440, 900]
    const centre = { x: width / 2, y: height / 2 - wheelRadius(width) }
    const radii = [0, 0.25, 0.5, 0.75, 1].map((p) => {
      const n = needleAt(p, width, height)
      return Math.hypot(n.x - centre.x, n.y - centre.y)
    })
    for (let i = 1; i < radii.length; i++) expect(radii[i]).toBeLessThan(radii[i - 1])
    expect(radii[0]).toBeLessThan(recordRadius(width))
  })

  it('keeps the needle on screen and clear of the titles wherever the arm shows', () => {
    for (const [width, height] of SCREENS) {
      expect(width).toBeGreaterThanOrEqual(ARM_MIN_WIDTH)
      for (const p of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
        const n = needleAt(p, width, height)
        expect(n.x).toBeGreaterThan(width / 2 + TITLE_HALF_WIDTH)
        expect(n.x).toBeLessThan(width)
        expect(n.y).toBeGreaterThan(0)
        expect(n.y).toBeLessThan(height)
      }
    }
  })

  it("keeps the needle one arm's length from the pivot as it swings", () => {
    const [width, height] = [1440, 900]
    const pivot = { x: width + 260, y: height * 0.62 }
    for (const p of [0, 0.5, 1]) {
      const n = needleAt(p, width, height)
      expect(Math.hypot(n.x - pivot.x, n.y - pivot.y)).toBeCloseTo(n.length, 6)
    }
  })
})
