// npm run check:contrast [-- /path /other/path]
// npm run check:contrast -- --changed origin/main
//
// Opens the site's pages, in light and dark mode, and measures the contrast
// of every piece of text as the browser draws it (scripts/contrast/scan.js).
// Fails when any falls short of WCAG AA. The unit test tests/contrast.test.ts
// checks the colour tokens and the class names it can see; this catches what
// it can't: a colour picked through a variable, text dimmed with opacity,
// text on a filled SVG shape.
//
// Which pages (scripts/contrast/pages.js):
// - the paths given;
// - with --changed <ref>, the pages the files changed since <ref> can touch,
//   which is what a pull request runs; a change to a shared file means all;
// - otherwise all: the live sitemap plus every page in the code, so a page
//   not published yet is checked too.
// It starts the dev server itself, and answers the API's calls with CORS
// allowed, so pages that read the API (the Learnings map among them) render
// as they do on the site. Pages are opened several at a time
// (CONTRAST_WORKERS, default 4, per theme).

import { execFileSync, spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { codePages, inPool, pagesForChanges, slugsIn } from './contrast/pages.js'
import { scan } from './contrast/scan.js'

const PORT = 5199
const BASE = `http://localhost:${PORT}`
const SITEMAP = 'https://www.yarikama.com/sitemap.xml'
const WORKERS = Math.max(1, Number(process.env.CONTRAST_WORKERS) || 4)

const registries = {
  learnings: slugsIn(readFileSync('src/learnings/index.ts', 'utf8')),
  projects: slugsIn(readFileSync('src/projects/index.ts', 'utf8')),
}

async function allPages() {
  const xml = await (await fetch(SITEMAP)).text()
  const live = [...xml.matchAll(/<loc>https:\/\/www\.yarikama\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/')
  return [...new Set([...live, ...codePages(registries)])]
}

async function pages() {
  const args = process.argv.slice(2)
  const at = args.indexOf('--changed')
  if (at === -1) return args.length ? args : allPages()
  const base = args[at + 1]
  const files = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' }).split('\n').filter(Boolean)
  const touched = pagesForChanges(files, registries)
  if (touched.all) {
    console.log(`A shared file changed since ${base}: checking every page`)
    return allPages()
  }
  console.log(`Pages changed since ${base}: ${touched.pages.join(', ') || 'none'}`)
  return touched.pages
}

function startServer() {
  // Its own process group, so stopping it stops vite and not only npx
  const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    // Not inherited: a stray server would hold this script's output open
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })
  return new Promise((resolve, reject) => {
    server.stdout.on('data', (chunk) => {
      if (String(chunk).includes('ready')) resolve(server)
    })
    server.on('exit', (code) => reject(new Error(`vite exited with ${code}`)))
  })
}

// Playwright's own Chromium, or Google Chrome when that build isn't
// installed (npx playwright install chromium fetches it)
async function launch() {
  try {
    return await chromium.launch()
  } catch {
    return await chromium.launch({ channel: 'chrome' })
  }
}

const paths = await pages()
if (!paths.length) {
  console.log('No page to check')
  process.exit(0)
}
const browser = await launch()
const server = await startServer()
let total = 0
let apiFailures = 0
try {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ colorScheme: theme, reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } })
    await context.addInitScript((t) => {
      try {
        localStorage.setItem('theme', t)
      } catch {
        // no storage: the site follows colorScheme
      }
    }, theme)
    // The API allows the site's own origin; let localhost read it too
    // A dropped connection is retried; one that keeps failing fails that
    // request only, as it would in a browser, and the page is checked as it
    // then renders. An error thrown here would end the whole run.
    await context.route('https://api.yarikama.com/**', async (route) => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await route.fetch()
          await route.fulfill({ response, headers: { ...response.headers(), 'access-control-allow-origin': '*' } })
          return
        } catch (error) {
          if (attempt === 3) {
            apiFailures++
            console.warn(`API request failed after 3 tries: ${route.request().url()} (${error.code ?? error.message})`)
            await route.abort('failed').catch(() => {})
            return
          }
          await new Promise((r) => setTimeout(r, 1000 * attempt))
        }
      }
    })
    // Several pages at a time, each in its own tab; printed in order
    const reports = await inPool(paths, WORKERS, async (path) => {
      const page = await context.newPage()
      try {
        await page.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => {})
        // Scroll through so sections that draw on sight are drawn
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 700) {
            window.scrollTo(0, y)
            await new Promise((r) => setTimeout(r, 80))
          }
          window.scrollTo(0, 0)
        })
        // Sections fade in as they come into view; let them finish
        await page.waitForTimeout(1500)
        return await page.evaluate(scan)
      } finally {
        await page.close()
      }
    })
    paths.forEach((path, i) => {
      total += reports[i].length
      for (const f of reports[i]) {
        console.log(`${theme} ${path}: ${f.ratio}:1 (needs ${f.need}) ${f.fg} on ${f.bg}, ${f.size}px "${f.text}" [${f.className}]`)
      }
    })
    await context.close()
  }
} finally {
  await browser.close()
  try {
    process.kill(-server.pid)
  } catch {
    // already gone
  }
}
console.log(total ? `\n${total} pieces of text below WCAG AA across ${paths.length} pages` : `All text meets WCAG AA on ${paths.length} pages, light and dark`)
if (apiFailures) console.warn(`${apiFailures} API requests failed; pages that read them were checked without that data`)
process.exit(total ? 1 : 0)
