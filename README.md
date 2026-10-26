# Personal Website Front-End

[![CI](https://github.com/yarikama/personal-website-front-end/actions/workflows/ci.yml/badge.svg)](https://github.com/yarikama/personal-website-front-end/actions/workflows/ci.yml)

The front end of [yarikama.com](https://www.yarikama.com), Henry Hsu's personal website: projects, technical notes, and a chat that answers questions about them, streamed from a language model I host at home.

Built with React 19, TypeScript, Vite and Tailwind CSS v4, and deployed on Vercel. The API, database and models live in [personal-website-back-end](https://github.com/yarikama/personal-website-back-end).

## Features

**For visitors**

- **Ask about my work.** Visitors ask a question in any language. The answer streams in token by token, with numbered citations that link to the project card, note or resume behind each claim. Follow-ups work: the model sees the last two questions and answers of the conversation.
- **Select to ask.** Highlighting any passage on the site shows an "Ask AI" button that sends the passage along with the question.
- **Works.** Projects filtered by category. Each card has a stable anchor (`/works#slug`) that citations link to.
- **Notes.** Markdown notes with GitHub-flavored tables, KaTeX math and syntax highlighting, filterable by tag.
- **Contact form**, plus links to email, LinkedIn, GitHub and the resume.
- **Talks.** Interactive slides at `/talks/<slug>`, for talks and lessons, in the site's type and colours, on a 16:9 canvas that scales to any screen. Arrow keys, Space or a clicker move through slides and their reveal steps; the URL keeps the position. `P` opens a presenter window at `/talks/<slug>/presenter` with notes, the next slide, an outline and a clock against each part's time budget; the two windows stay in step. Public talks are listed at `/talks` and in the header. Private ones open only from their link and are marked `noindex`, but their slides ship in the bundle like the rest of the site, so nothing secret goes in a talk. The old `/talk` link goes to the interview talk.
- **Learnings.** A full-screen 3D knowledge graph at `/learnings`, to turn, zoom and drag. Each node is a topic, a concept that gathers others, or a paper elsewhere; arrows run from what to learn first. Picking a topic flies to it and lights up its road: every prerequisite, in an order to learn them. Tags along the top light up every topic that has one, each in a soft glow; where those topics sit close, the glows run into one region. The chosen topic and tag are in the URL (`?node=`, `?tag=`). The graph comes from the API (`GET /learnings/graph`); each topic's page is code in `src/learnings/<slug>`, at `/learnings/<slug>`. Until a node is published, a sample graph stands in. three.js loads only on this page.
- Dark and light themes, with no flash of the wrong one on load.

**For the author** (`/admin`, behind a login)

- Editors for notes, projects and categories, with image upload by drag-and-drop or paste.
- A directory of every talk, public and private, with links to open each deck or its presenter view and to copy its link.
- **Inline autocomplete** in the note editor: gray suggested text from a second self-hosted model. Tab accepts all of it, ⌥→ accepts one word, and Esc dismisses it.
- Unsaved edits autosave to the browser, so a closed tab doesn't lose a draft.

## Architecture

```
Browser ── www.yarikama.com ──▶ Vercel (static build of this repo)
   │
   ├── api.yarikama.com/api/v1 ──▶ Cloudflare Tunnel ──▶ k3s on a home server
   │                                                      ├─ FastAPI ─▶ PostgreSQL
   │                                                      ├─ vLLM: ask chat (Qwen3.5-4B)
   │                                                      └─ vLLM: autocomplete (Qwen3.5-0.8B)
   │
   └── assets.yarikama.com ──▶ Cloudflare R2 (uploaded images and their WebP variants)
```

This repo is a single-page app with no server of its own. Every request for content goes to the API, and Vercel serves `index.html` for every route so that React Router can handle it.

## Implementation notes

**Streaming answers.** The ask endpoint is a `POST`, which `EventSource` can't send. So [`services/api/ask.ts`](src/services/api/ask.ts) reads the server-sent events from a `fetch` body stream: it decodes the bytes, buffers partial events, and handles events and multi-byte characters split across network chunks. The tests feed it the stream in deliberately awkward pieces.

**Model output is untrusted.** [`AnswerMarkdown`](src/components/ui/AnswerMarkdown.tsx) renders answers as Markdown with raw HTML and images dropped and unsafe link protocols stripped. An answer can't make the browser load anything. Citation markers like `[P3]` become numbered links, but only for sources the API confirmed at the end of the stream. Markers the model invented are removed ([`lib/ask.ts`](src/lib/ask.ts)).

**One conversation everywhere.** The home page section, the floating chat button and the select-to-ask button all share one conversation through [`AskProvider`](src/components/ask/AskProvider.tsx), so a question asked in one shows up in the others.

**Autocomplete.** [`useAutocomplete`](src/hooks/useAutocomplete.ts) waits for a 150 ms pause in typing before it asks. A newer keystroke aborts the request in flight. It does nothing while an input method is composing (Chinese, Japanese), and it splits words with `Intl.Segmenter`, so accepting one word also works in Chinese, which has no spaces. The suggestion is drawn by an aligned layer under the `<textarea>`, not by an editor library. Each suggestion's outcome (accepted, typed along, rejected or ignored) goes back to the API as training data.

**Performance.**
- The note page, the Markdown and KaTeX renderer, and every admin page are split into chunks loaded on demand, so the home page doesn't download them.
- The main bundle is about 100 kB gzipped.
- Uploaded images get WebP variants at 640 and 1600 px from a backend worker. [`ResponsiveImage`](src/components/ui/ResponsiveImage.tsx) offers them through `srcset` and falls back to the original if a variant isn't ready yet.

**Accessibility.**
- `prefers-reduced-motion` turns off CSS animation, smooth scrolling and the JavaScript-driven motion.
- Every interactive element has a visible keyboard focus ring.
- Effects that only make sense with a mouse, like the cursor follower, are skipped on touch screens.

**Theme.** An inline script in [`index.html`](index.html) sets the theme before the first paint: dark, unless the visitor chose light. The page never flashes the other theme.

## Tech stack

| Area | Choice |
|---|---|
| Framework | React 19, TypeScript (strict), React Router 7 |
| Build | Vite 7 with SWC |
| Styling | Tailwind CSS v4 with design tokens in [`src/index.css`](src/index.css), plus the Typography plugin |
| Content | react-markdown, remark-gfm, remark-math, rehype-katex, rehype-highlight |
| Graph | react-force-graph-3d (three.js), three-spritetext for labels |
| Icons | lucide-react |
| Quality | ESLint 10 (typescript-eslint, React Hooks), Vitest, GitHub Actions |
| Hosting | Vercel |

## Project structure

```
src/
├── pages/                Routes: Home, Works, Notes, a single note, Talks, a talk, Learnings, a learning, and admin/
├── components/
│   ├── sections/         Home page sections (Hero, Ask, Experience, Toolkit, Contact…)
│   ├── ask/              The chat: provider, chat view, floating widget, select-to-ask
│   ├── talk/             The deck engine: stage, presenter view, navigation, slide building blocks
│   ├── learnings/        The 3D graph and the chosen topic's card
│   ├── layout/           Header (with dropdown menus), footer, section wrappers
│   ├── ui/               Shared pieces: Markdown renderers, project card, images, theme toggle
│   └── admin/            Admin navigation and the login guard
├── talks/                One folder of slides per talk, and the registry that lists them
├── learnings/            One folder per learning page, the registry that lists them, and the sample graph
├── hooks/                Data fetching, the ask stream, autocomplete, draft autosave, scroll spy
├── services/api/         One module per API resource, on a small fetch client
├── lib/                  Pure functions with tests: citations, image variants, theme
├── data/                 Static content: experience and toolkit
└── types/                API and UI types
```

## Development

Requires Node.js 22.

```bash
npm ci
cp .env.example .env
npm run dev                 # http://localhost:5173
```

`VITE_API_BASE_URL` in `.env` chooses the API. It defaults to a local backend at `http://localhost:8080/api/v1`. To work against production data instead, set it to `https://api.yarikama.com/api/v1`. The API only accepts requests from local ports 3000 and 5173, so keep the dev server on one of those.

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run lint` | ESLint, with no warnings allowed |
| `npm test` | Vitest: the answer stream parser, citation links, image variants |
| `npm run build` | Type-check with `tsc`, then build into `dist/` |
| `npm run preview` | Serve the production build locally |

## CI and deployment

- **CI.** [GitHub Actions](.github/workflows/ci.yml) runs lint, tests and the production build on every pull request and every push to `main`.
- **Previews.** Vercel builds a preview deployment for each pull request.
- **Production.** Vercel deploys `main` to production.
- **Vercel settings.** [`vercel.json`](vercel.json) holds the single-page-app rewrite, a permanent redirect from the old `/archive` path to `/works`, and long-lived caching for the favicon.
