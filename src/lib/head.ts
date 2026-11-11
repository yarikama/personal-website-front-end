// The rules for a page's head: its title, description, canonical address
// and link preview. Shared by the page itself (pageMeta.ts, in the browser)
// and by the routing middleware (middleware.ts, on Vercel), which writes the
// same tags into the HTML for crawlers and link previews that do not run
// scripts. No React or DOM here.

export const SITE = 'https://www.yarikama.com'
export const NAME = 'Henry Hsu'
export const DEFAULT_TITLE = `${NAME} | Software Engineer, GenAI & Infrastructure`
export const DEFAULT_DESCRIPTION =
  'Henry Hsu builds GenAI systems and the infrastructure behind them. Former Google SWE intern and MaiAgent GenAI team lead, now an M.C.S. student at Rice.'
export const DEFAULT_IMAGE = `${SITE}/og-image.png`

export interface PageMeta {
  // The page's own title, before " | Henry Hsu"; none for the home page.
  title?: string
  description?: string
  // Its path on the site; the browser's own path when left out.
  path?: string
  // An image for its link preview: a full URL or a path on the site.
  image?: string | null
  type?: 'website' | 'article'
  // Kept out of search: drafts, presenter views, pages that do not exist.
  noindex?: boolean
}

export interface Head {
  title: string
  description: string
  canonical: string
  image: string
  type: 'website' | 'article'
  noindex: boolean
}

/** A description of at most `max` characters, cut at a word. */
export function clip(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:–—-]+$/, '')}…`
}

/** A path on the canonical host: no query or hash, no trailing slash. */
export function canonical(path: string): string {
  const bare = path.split(/[?#]/)[0] || '/'
  const trimmed = bare.length > 1 ? bare.replace(/\/+$/, '') : bare
  return `${SITE}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`
}

function absolute(image: string): string {
  return image.startsWith('/') ? `${SITE}${image}` : image
}

export function headFor(meta: PageMeta, path: string): Head {
  return {
    title: meta.title ? `${meta.title} | ${NAME}` : DEFAULT_TITLE,
    description: clip(meta.description || DEFAULT_DESCRIPTION),
    canonical: canonical(meta.path ?? path),
    image: meta.image ? absolute(meta.image) : DEFAULT_IMAGE,
    type: meta.type ?? 'website',
    noindex: Boolean(meta.noindex),
  }
}

// The site's own pages, which no API row describes.
export const PAGES = {
  home: { path: '/' },
  works: {
    title: 'Works',
    description:
      'Projects by Henry Hsu across GenAI systems, infrastructure and machine learning: what each built, how, and what it did.',
  },
  notes: {
    title: 'Lab Notes',
    description:
      'Technical writing by Henry Hsu on software engineering, machine learning and building systems that endure.',
  },
  talks: {
    title: 'Talks',
    description: 'Interactive slides from talks Henry Hsu has given and things he has taught.',
  },
  learnings: {
    title: 'Learnings',
    description:
      'A map of what Henry Hsu is learning, from data systems to reinforcement learning, each page taught with interactive figures you can play with.',
  },
  notFound: { title: 'Page not found', noindex: true },
} satisfies Record<string, PageMeta>

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c])
}

// The tags renderHead replaces: everything headFor decides, and the default
// image's size, which is only true of the default image.
const MANAGED = [
  /<title>[\s\S]*?<\/title>\s*/i,
  /<link\b[^>]*\brel="canonical"[^>]*>\s*/gi,
  /<meta\b[^>]*\bname="(?:description|robots|twitter:(?:title|description|image))"[^>]*>\s*/gi,
  /<meta\b[^>]*\bproperty="og:(?:title|description|url|type|image(?::[a-z]+)?)"[^>]*>\s*/gi,
]

/** The site's HTML with `head` in place of its default title and tags. */
export function renderHead(html: string, head: Head): string {
  const stripped = MANAGED.reduce((out, pattern) => out.replace(pattern, ''), html)
  const attr = escapeHtml
  const tags = [
    `<title>${escapeHtml(head.title)}</title>`,
    `<meta name="description" content="${attr(head.description)}" />`,
    `<link rel="canonical" href="${attr(head.canonical)}" />`,
    head.noindex ? '<meta name="robots" content="noindex" />' : '',
    `<meta property="og:type" content="${head.type}" />`,
    `<meta property="og:url" content="${attr(head.canonical)}" />`,
    `<meta property="og:title" content="${attr(head.title)}" />`,
    `<meta property="og:description" content="${attr(head.description)}" />`,
    `<meta property="og:image" content="${attr(head.image)}" />`,
    head.image === DEFAULT_IMAGE
      ? '<meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />'
      : '',
    `<meta name="twitter:title" content="${attr(head.title)}" />`,
    `<meta name="twitter:description" content="${attr(head.description)}" />`,
    `<meta name="twitter:image" content="${attr(head.image)}" />`,
  ].filter(Boolean)
  return stripped.replace(/<\/head>/i, `    ${tags.join('\n    ')}\n  </head>`)
}
