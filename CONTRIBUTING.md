# Contributing

## Running locally

```bash
npm install
cp .env.example .env.local  # fill in your Upstash + Resend + SEED_SECRET values
npm run config               # regenerate public/index.html, calendar.html, config.js
vercel dev                   # starts frontend + API functions on http://localhost:3000
```

If you only need to work on frontend templates, `npx serve public` is enough — just note that API calls won't work without `vercel dev`.

## Code style

- ESM throughout (`"type": "module"` in `package.json`); no CommonJS
- API functions live in `api/` as plain Vercel serverless handlers (no framework)
- No build step for JavaScript — the only build artifact is the HTML/config generation via `npm run config`
- Match the style of surrounding code; there is no linter config, so consistency with existing files is the rule

## Making changes to templates

`public/index.template.html` and `public/calendar.template.html` are the canonical sources. The generated `public/index.html`, `public/calendar.html`, and `public/config.js` are outputs — commit them alongside template changes after running `npm run config`.

## Pull requests

1. Fork → branch → PR against `main`
2. Run `npm run config` if you touched any template or config file; commit the regenerated outputs
3. Describe what the change does and why in the PR description
4. Keep PRs focused — one feature or fix per PR
