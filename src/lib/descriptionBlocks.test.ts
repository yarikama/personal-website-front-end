import { describe, expect, it } from 'vitest'
import { descriptionBlocks } from './descriptionBlocks'

describe('descriptionBlocks', () => {
  it('keeps a description without bullets as one paragraph', () => {
    expect(descriptionBlocks('Built a thing. It works.')).toEqual([
      { kind: 'paragraph', text: 'Built a thing. It works.' },
    ])
  })

  it('joins single line breaks into one paragraph, as the browser did', () => {
    expect(descriptionBlocks('First sentence.\nSecond sentence.')).toEqual([
      { kind: 'paragraph', text: 'First sentence. Second sentence.' },
    ])
  })

  it('splits a summary from the bullets under it', () => {
    expect(descriptionBlocks('Summary line.\n- First point\n- Second point')).toEqual([
      { kind: 'paragraph', text: 'Summary line.' },
      { kind: 'list', items: ['First point', 'Second point'] },
    ])
  })

  it('starts a new paragraph after a blank line or after a list', () => {
    expect(descriptionBlocks('One.\n\nTwo.\n- a\nThree.')).toEqual([
      { kind: 'paragraph', text: 'One.' },
      { kind: 'paragraph', text: 'Two.' },
      { kind: 'list', items: ['a'] },
      { kind: 'paragraph', text: 'Three.' },
    ])
  })

  it('accepts • as a marker but leaves a leading minus sign as prose', () => {
    expect(descriptionBlocks('• dot\n-5% latency')).toEqual([
      { kind: 'list', items: ['dot'] },
      { kind: 'paragraph', text: '-5% latency' },
    ])
  })

  it('ignores Windows line endings and surrounding blank lines', () => {
    expect(descriptionBlocks('\r\nIntro.\r\n- x\r\n\r\n')).toEqual([
      { kind: 'paragraph', text: 'Intro.' },
      { kind: 'list', items: ['x'] },
    ])
  })
})
