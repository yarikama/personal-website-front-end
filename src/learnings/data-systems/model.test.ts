import { describe, expect, it } from 'vitest'
import { stale, write } from './model'

const start = { database: 8, cache: 8, index: 8 }
const everything = { updateCache: true, updateIndex: true, crash: false }

describe('writing a new price', () => {
  it('keeps every copy in step when the app updates them all', () => {
    const after = write(start, 9, everything)
    expect(after).toEqual({ database: 9, cache: 9, index: 9 })
    expect(stale(after)).toEqual({ cache: false, index: false })
  })

  it('leaves the copies the app forgot behind', () => {
    const after = write(start, 9, { ...everything, updateCache: false })
    expect(stale(after)).toEqual({ cache: true, index: false })
  })

  it('leaves every copy behind when the app crashes after the database', () => {
    const after = write(start, 9, { ...everything, crash: true })
    expect(after.database).toBe(9)
    expect(stale(after)).toEqual({ cache: true, index: true })
  })
})
