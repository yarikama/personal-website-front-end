// Which pages the contrast check opens.
//
// A full run takes the live sitemap and adds every page the code has, so a
// page whose node is not published yet (and so not in the sitemap) is still
// checked. A pull request only needs the pages its changes can touch: a file
// inside one learning page's or one case study's folder changes that page
// alone; files that draw nothing (clips, docs, tests, CI) change none; any
// other file (a shared component, the styles, a route) could change every
// page, so it asks for the full run.

const NO_PAGE = [
  /^manim\//,
  /^docs\//,
  /^\.github\//,
  /^\.claude\//,
  /^tests\//,
  /\.test\.tsx?$/,
  /\.md$/,
  /^skills-lock\.json$/,
  // The registries: a page added or moved there changes its own folder too,
  // and that folder brings the page in
  /^src\/learnings\/index\.ts$/,
  /^src\/projects\/index\.ts$/,
]

// The slugs listed in a registry file (src/learnings/index.ts,
// src/projects/index.ts), read from its source
export function slugsIn(source) {
  return [...source.matchAll(/slug:\s*'([a-z0-9-]+)'/g)].map((m) => m[1])
}

// Every page the code can draw, besides the sitemap's
export function codePages({ learnings, projects }) {
  return [...learnings.map((slug) => `/learnings/${slug}`), ...projects.map((slug) => `/works/${slug}`)]
}

// The pages a set of changed files can touch: { all: true } when one of them
// could change any page, otherwise the list (empty when none draws a page)
export function pagesForChanges(files, { learnings, projects }) {
  const pages = new Set()
  for (const file of files) {
    if (NO_PAGE.some((pattern) => pattern.test(file))) continue
    const learning = file.match(/^src\/learnings\/([^/]+)\//)
    if (learning && learnings.includes(learning[1])) {
      pages.add(`/learnings/${learning[1]}`)
      continue
    }
    const project = file.match(/^src\/projects\/([^/]+)\//)
    if (project && projects.includes(project[1])) {
      pages.add(`/works/${project[1]}`)
      continue
    }
    return { all: true }
  }
  return { all: false, pages: [...pages].sort() }
}

// Runs fn over items, at most `limit` at a time, and returns the results in
// the items' order
export async function inPool(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
