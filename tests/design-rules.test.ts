import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// The site's visual rules, as written in .claude/skills/conventions.md. Each
// one is something the owner asked to remove because it read as a template's
// or an AI's default, so a change that brings one back fails here.

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (path: string) => readFileSync(join(root, path), 'utf8')

function filesUnder(dir: string, exts = ['.ts', '.tsx', '.css']): string[] {
  const out: string[] = []
  for (const name of readdirSync(join(root, dir))) {
    const path = join(dir, name)
    if (statSync(join(root, path)).isDirectory()) out.push(...filesUnder(path, exts))
    else if (exts.some((ext) => name.endsWith(ext)) && !/\.test\.tsx?$/.test(name)) out.push(path)
  }
  return out
}

// Where the page's own text lives. Figures, learning pages, project
// write-ups and talk slides are left out: their text is drawn inside a figure
// or slide and scales with it.
const PAGE_TEXT = [
  ...filesUnder('src/components/sections'),
  ...filesUnder('src/components/layout'),
  ...filesUnder('src/components/ui'),
  ...filesUnder('src/pages').filter((path) => !path.includes('/admin/')),
]

// Every match of `pattern` in `files`, as "path:line: text"
function findAll(files: string[], pattern: RegExp) {
  const hits: string[] = []
  for (const path of files) {
    read(path)
      .split('\n')
      .forEach((line, i) => {
        if (pattern.test(line)) hits.push(`${relative(root, join(root, path))}:${i + 1}: ${line.trim()}`)
      })
  }
  return hits
}

describe('the site sets nothing in italics', () => {
  it('has no italic utility or font-style anywhere in src', () => {
    expect(findAll(filesUnder('src'), /(^|[\s"'`:])italic([\s"'`]|$)|font-style:\s*italic/)).toEqual([])
  })
})

describe('the site separates sections with space, not hairline rules', () => {
  it('has no MagazineLine', () => {
    expect(findAll(filesUnder('src'), /MagazineLine/)).toEqual([])
  })

  it('draws no full-width hairline or divider in page text', () => {
    expect(findAll(PAGE_TEXT, /\bh-(px|\[0\.5px\])\b.*\bw-full\b|\bw-full\b.*\bh-(px|\[0\.5px\])\b|\bdivide-[xy]\b|prose-h[1-6]:border-b/)).toEqual([])
  })
})

describe('no text on a page is under 15px', () => {
  it('keeps the two smallest theme sizes at 15px and 16px', () => {
    const css = read('src/index.css')
    expect(css).toMatch(/--text-xs:\s*0\.9375rem;/)
    expect(css).toMatch(/--text-sm:\s*1rem;/)
  })

  it('sets no arbitrary size under 15px in page text', () => {
    const small = /text-\[(\d*\.?\d+)(px|rem)\]/g
    const hits = PAGE_TEXT.flatMap((path) =>
      read(path)
        .split('\n')
        .flatMap((line, i) =>
          [...line.matchAll(small)]
            .filter(([, value, unit]) => (unit === 'px' ? Number(value) : Number(value) * 16) < 15)
            .map(([match]) => `${path}:${i + 1}: ${match}`),
        ),
    )
    expect(hits).toEqual([])
  })
})

describe('the site does not use the default AI-generated faces', () => {
  it('loads none of Inter, Geist, Satoshi, Space Grotesk, DM Sans, Manrope, Plus Jakarta Sans or Poppins', () => {
    const sources = read('index.html') + read('src/index.css')
    for (const face of ['Inter', 'Geist', 'Satoshi', 'Space Grotesk', 'Space+Grotesk', 'DM Sans', 'DM+Sans', 'Manrope', 'Plus Jakarta', 'Plus+Jakarta', 'Poppins']) {
      expect(sources, face).not.toMatch(new RegExp(`(family=|["'])${face.replace('+', '\\+')}(["':&]|\\b)`))
    }
  })
})
