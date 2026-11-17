import { describe, expect, it } from 'vitest'
import { pickTag } from './pickTag'

// Two rows, as in a wrapped strip: three tags on top, two right-aligned below
const box = (left: number, right: number, top: number) => ({ left, right, top, bottom: top + 34 })
const boxes = [box(0, 100, 0), box(110, 300, 0), box(310, 400, 0), box(200, 290, 42), box(300, 400, 42)]

describe('the tag that opens for the pointer', () => {
  it('is the one across from it, however far above or below the strip', () => {
    expect(pickTag(boxes, 50, -400)).toBe(0)
    expect(pickTag(boxes, 150, -400)).toBe(1)
    expect(pickTag(boxes, 50, 900)).toBe(0)
  })

  it('is the nearest across when the pointer is in a gap or past the ends', () => {
    expect(pickTag(boxes, 104, 17)).toBe(0)
    expect(pickTag(boxes, -80, 17)).toBe(0)
    expect(pickTag(boxes, 500, 17)).toBe(2)
  })

  it('takes the row nearer the pointer only where both rows lie across', () => {
    expect(pickTag(boxes, 250, 10)).toBe(1)
    expect(pickTag(boxes, 250, 60)).toBe(3)
    expect(pickTag(boxes, 350, 200)).toBe(4)
    // Over the empty left of the second row, only the first row lies across
    expect(pickTag(boxes, 50, 60)).toBe(0)
  })
})
