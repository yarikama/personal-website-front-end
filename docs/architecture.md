# Architecture

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

## Tech stack

| Area | Choice |
|---|---|
| Framework | React 19, TypeScript (strict), React Router 7 |
| Build | Vite 8 with SWC |
| Styling | Tailwind CSS v4 with design tokens in [`src/index.css`](../src/index.css), plus the Typography plugin |
| Content | react-markdown, remark-gfm, remark-math, rehype-katex, rehype-highlight |
| Animation | Motion |
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
│   ├── case/             Building blocks for project case studies
│   ├── talk/             The deck engine: stage, presenter view, navigation, slide building blocks
│   ├── learnings/        The 3D graph and the chosen topic's card
│   ├── explain/          Building blocks for learning pages: article layout, figures, sliders, seeded randomness
│   ├── layout/           Header (with dropdown menus), footer, section wrappers
│   ├── ui/               Shared pieces: Markdown renderers, project card, images, theme toggle
│   └── admin/            Admin navigation and the login guard
├── projects/             One folder per project case study, and the registry that lists them
├── talks/                One folder of slides per talk, and the registry that lists them
├── learnings/            One folder per learning page, the registry that lists them, and the sample graph
├── hooks/                Data fetching, the ask stream, autocomplete, draft autosave, scroll spy
├── services/api/         One module per API resource, on a small fetch client
├── lib/                  Pure functions with tests: citations, image variants, theme
├── data/                 Static content: experience and toolkit
└── types/                API and UI types
```
