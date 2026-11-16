import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Text on the site meets WCAG AA: 4.5:1 against what it sits on (3:1 only
// for text 24px and up, which these tests don't lean on). The colours live
// in src/index.css as tokens, light under @theme and dark under .dark, so
// the tests read them from there, check every text colour against every
// page surface, and keep the colours too light for text off text.

const root = fileURLToPath(new URL('..', import.meta.url))
const css = readFileSync(join(root, 'src/index.css'), 'utf8')

function tokens(block: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [, name, value] of block.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[name] = value
  return out
}
const light = tokens(css.slice(css.indexOf('@theme'), css.indexOf('}', css.indexOf('@theme'))))
const dark = { ...light, ...tokens(css.slice(css.indexOf('\n.dark {'), css.indexOf('}', css.indexOf('\n.dark {')))) }

type RGB = [number, number, number]
const rgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB
const mix = (base: RGB, top: RGB, alpha: number): RGB => base.map((v, i) => v * (1 - alpha) + top[i] * alpha) as RGB
function luminance([r, g, b]: RGB) {
  const f = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
export function contrast(a: RGB, b: RGB) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// The colours body text is set in, and the surfaces it is set on: the
// page, the darker panel, white cards, and the sage tints (up to 15%) that
// mark a right answer or a selected row
const TEXT = ['ink', 'ink-light', 'zinc-faded', 'sage-ink']
function surfaces(theme: Record<string, string>): [string, RGB][] {
  const paper = rgb(theme.paper)
  const list: [string, RGB][] = [
    ['paper', paper],
    ['paper-dark', rgb(theme['paper-dark'])],
    ['sage/15 on paper', mix(paper, rgb(theme.sage), 0.15)],
  ]
  if (theme === light) list.push(['white', [255, 255, 255]])
  return list
}

describe('text colours meet WCAG AA', () => {
  for (const [name, theme] of [['light', light], ['dark', dark]] as const) {
    it(`in ${name} mode, every text colour is 4.5:1 or more on every surface`, () => {
      const short: string[] = []
      for (const text of TEXT) {
        expect(theme[text], `--color-${text} in ${name} mode`).toBeDefined()
        for (const [surface, bg] of surfaces(theme)) {
          const ratio = contrast(rgb(theme[text]), bg)
          if (ratio < 4.5) short.push(`${text} on ${surface}: ${ratio.toFixed(2)}`)
        }
      }
      expect(short).toEqual([])
    })

    it(`in ${name} mode, paper text on a sage-ink fill is 4.5:1 or more`, () => {
      expect(contrast(rgb(theme.paper), rgb(theme['sage-ink']))).toBeGreaterThanOrEqual(4.5)
    })
  }
})

function filesUnder(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(join(root, dir))) {
    const path = join(dir, name)
    if (statSync(join(root, path)).isDirectory()) out.push(...filesUnder(path))
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(path)
  }
  return out
}

// zinc-300/400/500, sage and sage-light read at 1.4 to 3.3:1 on paper:
// fine for a line or a shape, too faint for words. A glyph marked
// aria-hidden (a grip handle, a | between links) is decoration and may be
// faint.

describe('colours too faint for text stay off text', () => {
  it('sets no text in zinc-300, zinc-400, zinc-500, sage or sage-light', () => {
    const faint = /(^|[\s"'`:])text-(zinc-[345]00|sage|sage-light)(?![\w-])/
    const hits: string[] = []
    for (const path of filesUnder('src')) {
      readFileSync(join(root, path), 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (faint.test(line) && !line.includes('aria-hidden')) hits.push(`${relative(root, join(root, path))}:${i + 1}: ${line.trim()}`)
        })
    }
    expect(hits).toEqual([])
  })

  it('fills no SVG text in zinc-400 or sage', () => {
    const hits: string[] = []
    for (const path of filesUnder('src')) {
      const source = readFileSync(join(root, path), 'utf8')
      for (const match of source.matchAll(/<(text|tspan)\b[^>]*?\bfill-(zinc-400|sage)(?![\w-])/gs)) {
        const line = source.slice(0, match.index).split('\n').length
        hits.push(`${path}:${line}`)
      }
    }
    expect(hits).toEqual([])
  })
})
