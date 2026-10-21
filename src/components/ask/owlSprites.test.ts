import { describe, expect, it } from 'vitest'
import { OWL_FRAMES, OWL_GRID, OWL_PALETTE, frameRuns } from './owlSprites'

describe('owl frames', () => {
  it.each(Object.entries(OWL_FRAMES))('%s fills the grid with known colours', (_, rows) => {
    expect(rows).toHaveLength(OWL_GRID)
    for (const row of rows) {
      expect(row).toHaveLength(OWL_GRID)
      for (const pixel of row) expect(pixel === '.' || pixel in OWL_PALETTE).toBe(true)
    }
  })

  it('is symmetric when facing ahead', () => {
    for (const row of OWL_FRAMES.stand) expect(row).toBe([...row].reverse().join(''))
  })
})

describe('frameRuns', () => {
  it('merges a row into runs and skips the empty ones', () => {
    expect(frameRuns(['..oo.y'])).toEqual([
      { x: 2, y: 0, width: 2, colour: OWL_PALETTE.o },
      { x: 5, y: 0, width: 1, colour: OWL_PALETTE.y },
    ])
  })

  it('covers every painted pixel exactly once', () => {
    const rows = OWL_FRAMES.stand
    const painted = rows.join('').replace(/\./g, '').length
    const covered = frameRuns(rows).reduce((sum, run) => sum + run.width, 0)
    expect(covered).toBe(painted)
  })
})
