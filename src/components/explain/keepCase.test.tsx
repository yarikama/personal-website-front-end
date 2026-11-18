import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Choice, Numbers, Readout, Slider } from './figure'
import { keepCase } from './keepCase'

const kept = (letters: string) => `<span class="normal-case">${letters}</span>`

describe('keepCase', () => {
  it('leaves text without Greek letters alone', () => {
    expect(keepCase('Step size')).toBe('Step size')
  })

  it('wraps each run of Greek letters', () => {
    expect(renderToStaticMarkup(<>{keepCase('KL weight λ')}</>)).toBe(`KL weight ${kept('λ')}`)
    expect(renderToStaticMarkup(<>{keepCase('γ and β, then σ²')}</>)).toBe(`${kept('γ')} and ${kept('β')}, then ${kept('σ')}²`)
  })
})

// Every capitalised label a figure shows must keep its Greek letters
describe('figure labels', () => {
  it('keeps Greek letters in Slider, Choice, Readout and Numbers labels', () => {
    const html = [
      <Slider key="s" label="Momentum β" value={0.9} min={0} max={1} step={0.01} onChange={() => {}} />,
      <Choice key="c" label="Penalty λ" options={[1, 2]} value={1} onChange={() => {}} />,
      <Readout key="r" label="Trees alike, ρ" value={0.5} />,
      <Numbers key="n" items={[{ label: 'σ = 1', value: 1 }]} />,
    ].map((el) => renderToStaticMarkup(el))
    expect(html[0]).toContain(`Momentum ${kept('β')}`)
    expect(html[1]).toContain(`Penalty ${kept('λ')}`)
    expect(html[2]).toContain(`Trees alike, ${kept('ρ')}`)
    expect(html[3]).toContain(`${kept('σ')} = 1`)
  })
})
