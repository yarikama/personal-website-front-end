import { describe, expect, it } from 'vitest'
import css from './index.css?raw'

// Paragraphs must never end on a lone word, site-wide. The rule lives in
// index.css's base layer, so new paragraphs get it without a class.

describe('line wrapping', () => {
  it('keeps a lone word off the last line of paragraphs and list items', () => {
    const base = css.slice(css.indexOf('@layer base'))
    expect(base).toMatch(/p,\s*li,[^{]*\{\s*text-wrap:\s*pretty;/)
  })

  it('balances headings', () => {
    expect(css).toMatch(/h1,\s*h2,\s*h3,\s*h4\s*\{\s*text-wrap:\s*balance;/)
  })
})
