import { describe, expect, it } from 'vitest'
import { EXTREMES, NAMES, P, onebox, pick } from './onebox'
import { figureOf } from '../../projects/figures'

describe('onebox, the Homelab cover', () => {
  it('keeps every pose inside the 400 × 320 frame, the lid and a fully lifted module included', () => {
    for (const [x, y, z] of EXTREMES) {
      const [sx, sy] = P(x, y, z)
      expect(sx).toBeGreaterThanOrEqual(8)
      expect(sx).toBeLessThanOrEqual(392)
      expect(sy).toBeGreaterThanOrEqual(8)
      expect(sy).toBeLessThanOrEqual(312)
    }
  })

  it('walks a lap of three different modules, then returns to rest', () => {
    const stops = onebox.tour.filter((s) => s !== null)
    const picked = stops.map((s) => NAMES[pick(s)])
    expect(picked).toEqual(['llm 2', 'api', 'db'])
    expect(onebox.tour.at(-1)).toBeNull()
  })

  it('picks nothing over the trackpad, the lid or the empty frame', () => {
    expect(pick([200, 290])).toBe(-1)
    expect(pick([250, 70])).toBe(-1)
    expect(pick([20, 20])).toBe(-1)
  })

  it('is the cover of the Homelab project only', () => {
    expect(figureOf('homelab-self-hosted-llm-platform')).toBe(onebox)
    expect(figureOf('prompt-aware-image-token-pruning')).toBeUndefined()
    expect(figureOf(undefined)).toBeUndefined()
  })
})
