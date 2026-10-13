import { describe, expect, it } from 'vitest'
import { tieEnd } from './text'

const NBSP = ' '

describe('tieEnd', () => {
  it('joins the last three words', () => {
    expect(tieEnd('Picks the skill for that kind of failure')).toBe(`Picks the skill for that kind${NBSP}of${NBSP}failure`)
  })

  it('leaves short text alone', () => {
    expect(tieEnd('Answers questions')).toBe('Answers questions')
  })

  it('joins fewer words when three would be too long', () => {
    expect(tieEnd('Fused with reciprocal rank fusion', 3, 18)).toBe(`Fused with reciprocal rank${NBSP}fusion`)
  })

  it('gives up rather than make an unbreakable run', () => {
    expect(tieEnd('A JSON-schema-defined runtime-generated model', 3, 10)).toBe(
      'A JSON-schema-defined runtime-generated model'
    )
  })
})
