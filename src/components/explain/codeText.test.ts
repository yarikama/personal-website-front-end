import { describe, expect, it } from 'vitest'
import { codeLines, tokens } from './codeText'

describe('a code sample’s lines', () => {
  it('lose the blank lines around them and the indent they share', () => {
    const code = `
      def f(x):
          return x

    `
    expect(codeLines(code)).toEqual(['def f(x):', '    return x'])
  })

  it('keep blank lines inside, and ignore them when finding the shared indent', () => {
    expect(codeLines('  a = 1\n\n  b = 2')).toEqual(['a = 1', '', 'b = 2'])
  })

  it('read a tab as four spaces', () => {
    expect(codeLines('def f():\n\treturn 1')).toEqual(['def f():', '    return 1'])
  })
})

describe('a line’s tokens', () => {
  it('put the line back together', () => {
    const line = '    if start >= last_end:  # free again by then?'
    expect(
      tokens(line)
        .map((token) => token.text)
        .join('')
    ).toBe(line)
  })

  it('find keywords, but not inside a longer name', () => {
    expect(tokens('for start, end in intervals:')).toEqual([
      { text: 'for', kind: 'keyword' },
      { text: ' start, end ', kind: 'plain' },
      { text: 'in', kind: 'keyword' },
      { text: ' intervals:', kind: 'plain' },
    ])
    expect(tokens('format = information').every((token) => token.kind === 'plain')).toBe(true)
  })

  it('keep a # inside a string out of the comment', () => {
    expect(tokens('x = "a # b"  # note')).toEqual([
      { text: 'x = ', kind: 'plain' },
      { text: '"a # b"', kind: 'string' },
      { text: '  ', kind: 'plain' },
      { text: '# note', kind: 'comment' },
    ])
  })

  it('find numbers, but not the digits in a name', () => {
    expect(tokens('iv[1] + x2')).toEqual([
      { text: 'iv[', kind: 'plain' },
      { text: '1', kind: 'number' },
      { text: '] + x2', kind: 'plain' },
    ])
  })
})
