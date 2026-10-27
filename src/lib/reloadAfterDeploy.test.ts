import { describe, expect, it, vi } from 'vitest'
import { reloadOnce } from './reloadAfterDeploy'

const memory = () => {
  const kept = new Map<string, string>()
  return { getItem: (key: string) => kept.get(key) ?? null, setItem: (key: string, value: string) => void kept.set(key, value) }
}

describe('reloading after a deploy', () => {
  it('reloads a stale tab once, and not again moments later', () => {
    const reload = vi.fn()
    const kept = memory()
    expect(reloadOnce(kept, 1_000_000, reload)).toBe(true)
    expect(reloadOnce(kept, 1_003_000, reload)).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads again after a later deploy', () => {
    const reload = vi.fn()
    const kept = memory()
    reloadOnce(kept, 1_000_000, reload)
    expect(reloadOnce(kept, 1_000_000 + 60_000, reload)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it('never reloads when it cannot remember doing so', () => {
    const reload = vi.fn()
    expect(reloadOnce(null, 1_000_000, reload)).toBe(false)
    const full = { getItem: () => null, setItem: () => { throw new Error('quota') } }
    expect(reloadOnce(full, 1_000_000, reload)).toBe(false)
    expect(reload).not.toHaveBeenCalled()
  })
})
