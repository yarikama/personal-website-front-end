import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// @ts-expect-error: a plain JS module the contrast script shares
import { codePages, inPool, pagesForChanges, slugsIn } from '../scripts/contrast/pages.js'

const registries = {
  learnings: slugsIn(readFileSync('src/learnings/index.ts', 'utf8')),
  projects: slugsIn(readFileSync('src/projects/index.ts', 'utf8')),
}

describe('the pages the contrast check opens', () => {
  it('reads every registered page from the code', () => {
    expect(registries.learnings).toContain('tail-latency-amplification')
    expect(registries.learnings).toContain('two-phase-locking')
    expect(registries.projects).toContain('homelab-self-hosted-llm-platform')
    const pages = codePages(registries)
    expect(pages).toContain('/learnings/b-plus-trees')
    expect(pages).toContain('/works/homelab-self-hosted-llm-platform')
    expect(pages.length).toBe(registries.learnings.length + registries.projects.length)
  })

  it('checks only the pages whose own folders changed', () => {
    const touched = pagesForChanges(
      [
        'src/learnings/b-plus-trees/TreeLab.tsx',
        'src/learnings/b-plus-trees/model.ts',
        'src/learnings/sql-nulls/TruthTables.tsx',
        'src/projects/homelab-self-hosted-llm-platform/GpuMemory.tsx',
      ],
      registries,
    )
    expect(touched).toEqual({
      all: false,
      pages: ['/learnings/b-plus-trees', '/learnings/sql-nulls', '/works/homelab-self-hosted-llm-platform'],
    })
  })

  it('counts a new page through its folder, not its registry line', () => {
    const touched = pagesForChanges(['src/learnings/index.ts', 'src/learnings/join-order/index.tsx'], registries)
    expect(touched).toEqual({ all: false, pages: ['/learnings/join-order'] })
  })

  it('checks nothing for files that draw no page', () => {
    const touched = pagesForChanges(
      [
        'manim/scenes/ppo.py',
        'docs/notes.md',
        '.github/workflows/ci.yml',
        'tests/vercel.test.ts',
        'src/learnings/ppo/model.test.ts',
        'README.md',
      ],
      registries,
    )
    expect(touched).toEqual({ all: false, pages: [] })
  })

  it('checks every page when a shared file changed', () => {
    for (const shared of [
      'src/components/explain/Code.tsx',
      'src/index.css',
      'src/pages/LearningPage.tsx',
      'src/learnings/useLearningPage.ts',
      'src/projects/figures.ts',
      'scripts/contrast/scan.js',
      'package.json',
      'public/og.png',
    ]) {
      expect(pagesForChanges(['src/learnings/ppo/index.tsx', shared], registries), shared).toEqual({ all: true })
    }
  })

  it('treats a folder that is not a registered page as shared', () => {
    expect(pagesForChanges(['src/learnings/not-a-page/thing.ts'], registries)).toEqual({ all: true })
  })
})

describe('the pool', () => {
  it('keeps the order and never runs more than its limit at once', async () => {
    let running = 0
    let most = 0
    const out = await inPool([5, 1, 4, 2, 3, 0], 3, async (n: number) => {
      running++
      most = Math.max(most, running)
      await new Promise((r) => setTimeout(r, n * 3))
      running--
      return n * 10
    })
    expect(out).toEqual([50, 10, 40, 20, 30, 0])
    expect(most).toBe(3)
  })

  it('handles fewer items than its limit, and none', async () => {
    expect(await inPool([1], 4, async (n: number) => n)).toEqual([1])
    expect(await inPool([], 4, async (n: number) => n)).toEqual([])
  })
})
