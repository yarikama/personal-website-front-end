import { describe, expect, it } from 'vitest'
import { OFFSET, SHEET, TILES, screen, seeded } from './risoPrint'

describe('the Lab Notes riso print', () => {
  it('lays twelve squares on the sheet, off register by a few units at most', () => {
    expect(TILES).toHaveLength(12)
    for (const t of TILES) {
      expect(t.x).toBeGreaterThanOrEqual(0)
      expect(t.y).toBeGreaterThanOrEqual(0)
      expect(t.x + t.size + OFFSET.x).toBeLessThanOrEqual(SHEET.w)
      expect(t.y + t.size + OFFSET.y).toBeLessThanOrEqual(SHEET.h)
      expect(t.cover).toBeGreaterThan(0)
      expect(t.cover).toBeLessThanOrEqual(1)
    }
  })

  it('alternates its two inks like a chequerboard', () => {
    const at = (i: number, j: number) => TILES[j * 4 + i].ink
    expect(at(0, 0)).not.toBe(at(1, 0))
    expect(at(0, 0)).not.toBe(at(0, 1))
    expect(at(0, 0)).toBe(at(1, 1))
    expect(TILES.filter((t) => t.ink === 'a')).toHaveLength(6)
  })

  it('screens more coverage into bigger dots, and none where there is no ink', () => {
    const w = 40, h = 40, alpha = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) alpha[(y * w + x) * 4 + 3] = x < 20 ? 255 : x < 30 ? 64 : 0
    const dots = screen(alpha, w, h, 0, 4)
    const full = dots.filter(([x]) => x < 18), light = dots.filter(([x]) => x > 21 && x < 29)
    expect(full.length).toBeGreaterThan(0)
    expect(light.length).toBeGreaterThan(0)
    expect(Math.min(...full.map(([, , r]) => r))).toBeGreaterThan(Math.max(...light.map(([, , r]) => r)))
    expect(dots.some(([x]) => x >= 31)).toBe(false)
  })

  it('draws the same grain every time', () => {
    const a = seeded(7), b = seeded(7)
    const xs = Array.from({ length: 5 }, () => a())
    expect(Array.from({ length: 5 }, () => b())).toEqual(xs)
    expect(xs.every((v) => v >= 0 && v < 1)).toBe(true)
  })
})
