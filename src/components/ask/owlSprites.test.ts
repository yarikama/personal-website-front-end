import { describe, expect, it } from 'vitest'
import { OWL_FRAMES, OWL_GRID, OWL_PALETTES, frameRuns } from './owlSprites'

describe('owl frames', () => {
  it.each(Object.entries(OWL_FRAMES))('%s fills its grid with colours every palette has', (name, rows) => {
    // Flight frames are wider, for the open wings; the body keeps its 16
    const width = name.startsWith('fly') ? OWL_GRID + 8 : OWL_GRID
    expect(rows).toHaveLength(OWL_GRID)
    for (const row of rows) {
      expect(row).toHaveLength(width)
      for (const pixel of row) {
        if (pixel === '.') continue
        for (const palette of Object.values(OWL_PALETTES)) expect(palette).toHaveProperty(pixel)
      }
    }
  })

  it.each(['stand', 'flyUp', 'flyMid', 'flyDown'] as const)('is symmetric when facing ahead (%s)', (pose) => {
    for (const row of OWL_FRAMES[pose]) expect(row).toBe([...row].reverse().join(''))
  })
})

describe('frameRuns', () => {
  it('merges a row into runs in the palette given and skips the empty ones', () => {
    const { brown } = OWL_PALETTES
    expect(frameRuns(['..bb.y'], brown)).toEqual([
      { x: 2, y: 0, width: 2, colour: brown.b },
      { x: 5, y: 0, width: 1, colour: brown.y },
    ])
  })

  it('covers every painted pixel exactly once', () => {
    const rows = OWL_FRAMES.stand
    const painted = rows.join('').replace(/\./g, '').length
    const covered = frameRuns(rows, OWL_PALETTES.sage).reduce((sum, run) => sum + run.width, 0)
    expect(covered).toBe(painted)
  })
})
