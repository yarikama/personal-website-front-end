<div align="center">

<a href="https://www.yarikama.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.svg">
    <img src="docs/logo-light.svg" alt="Henry Hsu's logo: a two-sided H drawn in isometric blocks" width="112">
  </picture>
</a>

# Personal Website Front-End

[![CI](https://github.com/yarikama/personal-website-front-end/actions/workflows/ci.yml/badge.svg)](https://github.com/yarikama/personal-website-front-end/actions/workflows/ci.yml)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fwww.yarikama.com&label=yarikama.com&up_message=online&down_message=down)](https://www.yarikama.com)
[![Deployed on Vercel](https://img.shields.io/badge/deployed%20on-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)
[![Last commit](https://img.shields.io/github/last-commit/yarikama/personal-website-front-end)](https://github.com/yarikama/personal-website-front-end/commits/main)
<br>
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript 6](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite 8](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Tested with Vitest](https://img.shields.io/badge/tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)
[![Node 22](https://img.shields.io/badge/node-22-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org)

</div>

The front end of [yarikama.com](https://www.yarikama.com), Henry Hsu's personal website: projects with their case studies, technical notes, a 3D graph of what I've learned, and a chat that answers questions about all of it, streamed from a language model I host at home.

It is a single-page app built with React 19, TypeScript, Vite and Tailwind CSS v4, and deployed on Vercel. The API, database and models live in [personal-website-back-end](https://github.com/yarikama/personal-website-back-end).

[![The works page of yarikama.com in dark mode: each project with its title, a one-line hook, tags, results and an animated cover drawing](docs/works.webp)](https://www.yarikama.com/works)

## What it does

- **Ask about my work**: answers stream in token by token, in any language, with numbered citations to the project, note or resume behind each claim. Highlight any passage on the site to ask about it.
- **Works**: projects by category, each with an animated cover and its own page, some with a written case study.
- **Notes**: Markdown essays with tables, KaTeX math and syntax highlighting.
- **Learnings**: a 3D knowledge graph to turn and zoom. Picking a topic lights up everything to learn before it, and each topic opens an interactive explainer.
- **Talks**: slide decks on a 16:9 canvas, with a presenter window that stays in step.
- **Admin**: editors for notes, projects and categories, inline autocomplete from a second self-hosted model, and the site's visitors, questions and messages.

The full list is in [Features](docs/features.md).

## Quick start

Requires Node.js 22.

```bash
npm ci
cp .env.example .env
npm run dev                 # http://localhost:5173
```

`VITE_API_BASE_URL` in `.env` picks the API: a local backend by default, or `https://api.yarikama.com/api/v1` for production data. More in [Development](docs/development.md).

## Documentation

| Doc | What's in it |
|---|---|
| [Features](docs/features.md) | Everything visitors can do, and what the author gets behind the login |
| [Architecture](docs/architecture.md) | How it reaches the API and images, tech stack, project layout |
| [Design notes](docs/design.md) | Streaming answers, untrusted model output, autocomplete, performance, accessibility, theme |
| [Development](docs/development.md) | Running locally, commands, CI and deployment |
