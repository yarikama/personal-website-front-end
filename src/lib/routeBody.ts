import { DEFAULT_DESCRIPTION, NAME, escapeHtml, type PageMeta } from './head'
import type { FetchJson } from './routeHead'

// What a crawler finds in the page's body before any script runs. The site
// is a single-page app, so its HTML body is an empty <div id="root">: a
// crawler that reads the HTML as it arrives sees no words and no links,
// and Google, which finds the pages only through the sitemap, leaves most
// of them "discovered, not indexed". The routing middleware fills the root
// with the page's own words and its links, from the same API the page
// reads. The app replaces all of it when its script runs, so people never
// see it. No React or DOM here.

interface Note {
  slug: string
  title: string
  excerpt: string
  content?: string
  date?: string
}
interface Project {
  slug: string
  title: string
  description: string
  metrics?: string
}
interface Node {
  slug: string
  kind: 'learning' | 'concept' | 'external'
  title: string
  summary: string
  overview?: string | null
  ref?: string | null
}
interface Edge {
  source: string
  target: string
  type: 'part_of' | 'prerequisite' | 'next' | 'related'
}
interface Graph {
  nodes: Node[]
  edges: Edge[]
}

const esc = escapeHtml

function data<T>(body: unknown): T | null {
  return body && typeof body === 'object' && 'data' in body ? ((body as { data: T }).data ?? null) : null
}

// The API's answer, or null when it has none or cannot be reached: a body
// with fewer links is still better than none, and the head is already set
async function get<T>(fetchJson: FetchJson, path: string): Promise<T | null> {
  try {
    return data<T>(await fetchJson(path))
  } catch {
    return null
  }
}

const NAV: [string, string][] = [
  ['/', NAME],
  ['/works', 'Works'],
  ['/notes', 'Lab Notes'],
  ['/learnings', 'Learnings'],
  ['/talks', 'Talks'],
]

const link = (href: string, text: string) => `<a href="${esc(href)}">${esc(text)}</a>`

function list(items: { href: string; title: string; text?: string }[]): string {
  if (items.length === 0) return ''
  return `<ul>${items
    .map((item) => `<li>${link(item.href, item.title)}${item.text ? ` <p>${esc(item.text)}</p>` : ''}</li>`)
    .join('')}</ul>`
}

const section = (heading: string, inner: string) => (inner ? `<section><h2>${esc(heading)}</h2>${inner}</section>` : '')

const notesList = (notes: Note[]) =>
  list(notes.map((note) => ({ href: `/notes/${note.slug}`, title: note.title, text: note.excerpt })))
const projectsList = (projects: Project[]) =>
  list(projects.map((project) => ({ href: `/works/${project.slug}`, title: project.title, text: project.description })))

/**
 * A note's Markdown as plain HTML: headings, paragraphs, list items and code,
 * every character escaped. Links keep their words and images are left out;
 * enough for a crawler to read what the note says.
 */
export function markdownText(markdown: string): string {
  const out: string[] = []
  const inline = (text: string) =>
    esc(
      text
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/(\*\*|__|\*|_|`)(.+?)\1/g, '$2'),
    )
  const blocks = markdown.replace(/\r\n/g, '\n').split(/\n(?=```)|(?<=```)\n/)
  for (const block of blocks) {
    if (block.startsWith('```')) {
      out.push(`<pre>${esc(block.replace(/^```[^\n]*\n?/, '').replace(/```$/, '').trimEnd())}</pre>`)
      continue
    }
    for (const para of block.split(/\n{2,}/)) {
      const text = para.trim()
      if (!text) continue
      const heading = /^(#{1,6})\s+(.*)$/.exec(text)
      if (heading && !text.includes('\n')) {
        // The page's title is the only h1
        const level = Math.min(Math.max(heading[1].length, 2), 4)
        out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      } else if (/^([-*+]|\d+\.)\s/.test(text)) {
        out.push(`<ul>${text.split('\n').map((line) => `<li>${inline(line.replace(/^\s*([-*+]|\d+\.)\s+/, ''))}</li>`).join('')}</ul>`)
      } else {
        out.push(`<p>${inline(text.replace(/^>\s?/gm, '').replace(/\n/g, ' '))}</p>`)
      }
    }
  }
  return out.join('')
}

function learningHref(node: Node): string | null {
  if (node.kind === 'learning') return `/learnings/${node.slug}`
  if (node.kind === 'external') return node.ref ?? null
  return null
}

function learningLinks(graph: Graph, slugs: string[]) {
  const bySlug = new Map(graph.nodes.map((node) => [node.slug, node]))
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((node): node is Node => Boolean(node && learningHref(node)))
    .map((node) => ({ href: learningHref(node)!, title: node.title, text: node.summary }))
}

// The Learnings map as a reader would go through it: each topic with its
// overview and its pages
function learningsIndex(graph: Graph): string {
  const topics = graph.nodes.filter((node) => node.kind === 'concept')
  const partOf = (slug: string) =>
    graph.edges.filter((edge) => edge.type === 'part_of' && edge.target === slug).map((edge) => edge.source)
  const inTopic = new Set<string>()
  const parts = topics.map((topic) => {
    const pages = partOf(topic.slug).filter((slug) => graph.nodes.find((node) => node.slug === slug)?.kind === 'learning')
    pages.forEach((slug) => inTopic.add(slug))
    const overview = (topic.overview || topic.summary || '').split(/\n{2,}/).map((p) => `<p>${esc(p.trim())}</p>`).join('')
    return section(topic.title, overview + list(learningLinks(graph, pages)))
  })
  const loose = graph.nodes.filter((node) => node.kind === 'learning' && !inTopic.has(node.slug)).map((node) => node.slug)
  return parts.join('') + section('More pages', list(learningLinks(graph, loose)))
}

function learningPage(graph: Graph, slug: string): string {
  const from = (type: Edge['type']) => graph.edges.filter((edge) => edge.type === type && edge.source === slug).map((edge) => edge.target)
  const to = (type: Edge['type']) => graph.edges.filter((edge) => edge.type === type && edge.target === slug).map((edge) => edge.source)
  const topic = graph.nodes.find((node) => node.slug === from('part_of')[0] && node.kind === 'concept')
  return [
    topic ? `<p>Part of ${link('/learnings', topic.title)}.</p>` : '',
    section('Read first', list(learningLinks(graph, to('prerequisite')))),
    section('Read next', list(learningLinks(graph, [...new Set([...from('next'), ...from('prerequisite')])]))),
    section('Related', list(learningLinks(graph, [...from('related'), ...to('related')]))),
  ].join('')
}

/** The main content for the page at `path`, after its title and description. */
async function content(path: string, fetchJson: FetchJson): Promise<string> {
  const [, sec, slug] = path.split('/')
  const notes = () => get<Note[]>(fetchJson, '/lab-notes?limit=100')
  const projects = () => get<Project[]>(fetchJson, '/projects?limit=100')
  const graph = () => get<Graph>(fetchJson, '/learnings/graph')

  if (path === '/') {
    const [allProjects, allNotes] = await Promise.all([projects(), notes()])
    return (
      section('Works', projectsList(allProjects ?? [])) +
      section('Lab Notes', notesList(allNotes ?? [])) +
      section('Learnings', `<p>${link('/learnings', 'A map of what Henry Hsu is learning')}, each page taught with figures to play with.</p>`)
    )
  }
  if (path === '/works') return projectsList((await projects()) ?? [])
  if (path === '/notes') return notesList((await notes()) ?? [])
  if (path === '/learnings') {
    const found = await graph()
    return found ? learningsIndex(found) : ''
  }
  if (sec === 'notes' && slug) {
    const note = await get<Note>(fetchJson, `/lab-notes/${encodeURIComponent(decodeURIComponent(slug))}`)
    if (!note?.content) return ''
    // The note's own first heading repeats its title
    return `<article>${markdownText(note.content.replace(/^#\s+[^\n]*\n+/, ''))}</article>`
  }
  if (sec === 'works' && slug) {
    const project = await get<Project>(fetchJson, `/projects/${encodeURIComponent(decodeURIComponent(slug))}`)
    return project?.metrics ? `<p>${esc(project.metrics)}</p>` : ''
  }
  if (sec === 'learnings' && slug) {
    const found = await graph()
    return found ? learningPage(found, decodeURIComponent(slug)) : ''
  }
  return ''
}

/**
 * The body for a crawler reading `path`, whose head is `meta`: the site's
 * navigation, the page's title and description, and its content and links.
 */
export async function bodyForPath(path: string, meta: PageMeta, fetchJson: FetchJson): Promise<string> {
  const bare = path.length > 1 ? path.replace(/\/+$/, '') : path
  const nav = `<header><nav>${NAV.map(([href, text]) => link(href, text)).join(' ')}</nav></header>`
  const title = meta.title ?? NAME
  const description = meta.description ?? DEFAULT_DESCRIPTION
  const main = meta.noindex ? '' : await content(bare, fetchJson)
  return `${nav}<main><h1>${esc(title)}</h1><p>${esc(description)}</p>${main}</main>`
}

/** The site's HTML with `body` inside its empty root. */
export function renderBody(html: string, body: string): string {
  return html.replace(/<div id="root"><\/div>/, () => `<div id="root">${body}</div>`)
}
