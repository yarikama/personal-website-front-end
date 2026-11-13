import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { travelPhotoSizes, VW_PER_UNIT } from '../src/lib/travelSizes'

describe('travelPhotoSizes', () => {
  it('uses the width on an upright screen, for 2x at most, and the height otherwise', () => {
    expect(travelPhotoSizes(42)).toBe(
      '(max-aspect-ratio: 13/10) and (min-resolution: 3dppx) 36.4vw, (max-aspect-ratio: 13/10) 54.6vw, 42vh',
    )
  })

  it('matches the track unit in index.css', () => {
    const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
    const units = [...css.matchAll(/--u:\s*([^;]+);/g)].map(([, value]) => value.trim())
    expect(units.length).toBeGreaterThan(0)
    for (const unit of units) expect(unit).toBe(`min(1vh, ${VW_PER_UNIT}vw)`)
  })
})
