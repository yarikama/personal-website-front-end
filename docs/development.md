# Development

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

- **CI.** [GitHub Actions](../.github/workflows/ci.yml) runs lint, tests and the production build on every pull request and every push to `main`.
- **Previews.** Vercel builds a preview deployment for each pull request.
- **Production.** Vercel deploys `main` to production.
- **Vercel settings.** [`vercel.json`](../vercel.json) holds the single-page-app rewrite, a permanent redirect from the old `/archive` path to `/works`, and long-lived caching for the favicon.
