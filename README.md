# lazzzySearch

**The searching app for lazzzy peeps, with a pinch of AI.**

A search-first React app: describe what you want in plain English, let an AI provider shape a Firecrawl query, review the plan, and explore the results.

## Current MVP

- React + TypeScript + Vite
- Natural-language search planner using Gemini, OpenRouter, or xAI/Grok
- Direct-search fallback when no AI key is configured
- Firecrawl Search API integration
- Editable query and result limit before execution
- Result previews, raw JSON view, copy, and JSON export
- Multiple API keys per provider, enable/disable, delete, and connection checks
- Browser-local settings and recent searches
- Built-in help drawer with provider key links
- Vercel SPA rewrite configuration

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Configure keys

Open **Settings** in the app and add:
- An AI key for Gemini, OpenRouter, or Grok (optional; without one, a basic search plan is created from your prompt).
- A Firecrawl key to execute searches.

The AI model ID is editable when adding a key. Use a model ID available to your provider account.

## Deploy to Vercel

Import this GitHub repository into Vercel. The default Vite settings should work:
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

The included `vercel.json` rewrites app routes to the SPA entry point.

## Important: browser-only MVP

There is no login, backend, or database yet. API keys and recent searches are stored in the current browser's `localStorage`. Keys are not encrypted and can be inspected by someone with access to the browser profile. Provider requests are made directly from the browser to Gemini/OpenRouter/xAI and Firecrawl. Use this only on a trusted personal device; do not use shared/public devices. A future backend should replace browser key storage with authenticated, encrypted server-side secret storage.

Browser-to-provider requests may also be affected by provider CORS policies, browser extensions, network restrictions, API quotas, and provider availability.

## Next

1. Verify provider CORS behavior and add a small server-side proxy if required.
2. Add model discovery and reliable free/paid pricing labels.
3. Add Firecrawl scrape, crawl, and map operations.
4. Add database-backed user accounts and encrypted per-user key storage.
5. Add robust validation, retries, and automated tests.

