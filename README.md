# lazzzySearch

**The searching app for curious people who want maximum control over web discovery.**

lazzzzySearch converts a natural-language request into a reviewable Firecrawl search plan. The user can choose an AI provider to expand and structure even a very short query, edit the generated plan, and execute it through Firecrawl.

Repository: https://github.com/AravindSAsok/lazzzySearch  
Production: https://lazzzy-search.vercel.app

## Product principles

- User intent comes first. AI should clarify and expand a request, not silently narrow it or impose arbitrary restrictions.
- Preserve explicitly supplied terms, names, URLs, domains, site operators, subreddit names, dates, file types, exclusions, locations, and other filters.
- Freedom mode is optional and OFF by default. When enabled, it bypasses AI planning and sends the user's original query directly to the search-plan stage.
- The generated plan is editable. The user decides when to execute it.
- Never claim a search is exhaustive. Explain assumptions made for vague prompts.

## Current features

- React + TypeScript + Vite single-page app.
- Firecrawl Search API v2 integration.
- AI planning through Gemini, OpenRouter, xAI/Grok, Groq, and SiliconFlow.
- Dynamic model discovery for every supported AI provider, using the user's own API key.
- Multiple keys per provider, enable/disable, delete, connection checks, model selection, and model refresh.
- Fallback across discovered models when a model is unavailable, overloaded, or rate-limited.
- Detailed AI search-strategy prompt for vague, short, misspelled, or incomplete user requests.
- Optional Freedom mode, disabled by default.
- Direct-search planning when no AI key is configured.
- Editable query, result limit, and source selection before execution.
- Model-attempt and actual-model attribution.
- Result previews, raw JSON, copy, and JSON export.
- Recent searches stored locally.
- Help drawer and provider key links.
- Vercel SPA rewrite configuration.

## Providers and endpoints

All provider calls currently run directly in the user's browser.

| Provider | Dynamic model discovery | Chat completion |
|---|---|---|
| Gemini | `GET https://generativelanguage.googleapis.com/v1beta/models?key=...` | Gemini Interactions API: `POST https://generativelanguage.googleapis.com/v1beta/interactions` |
| OpenRouter | `GET https://openrouter.ai/api/v1/models` | `POST https://openrouter.ai/api/v1/chat/completions` |
| xAI / Grok | `GET https://api.x.ai/v1/models` | `POST https://api.x.ai/v1/chat/completions` |
| Groq | `GET https://api.groq.com/openai/v1/models` | `POST https://api.groq.com/openai/v1/chat/completions` |
| SiliconFlow | `GET https://api.siliconflow.com/v1/models` | `POST https://api.siliconflow.com/v1/chat/completions` |
| Firecrawl | N/A | Search: `POST https://api.firecrawl.dev/v2/search` |

For OpenAI-compatible providers, requests use `Authorization: Bearer <API_KEY>`. Model discovery reads the provider's `data` (or `models`) response and extracts model IDs. The UI lets the user choose a model returned for that key.

### Grok / xAI model discovery troubleshooting

The app now reads and displays the provider's response body and HTTP status instead of hiding useful details behind a generic error. A 401 means xAI did not accept the supplied credential; check that it is an active xAI API key with API access, rather than a console/session token, and confirm there are no leading/trailing spaces. A 400 means the provider rejected the model-list request; inspect the returned message and check current xAI API access/documentation. Browser extensions, network filtering, and CORS can also prevent browser requests from completing.

Do not work around an authentication failure by silently substituting a public/static model list and claiming it was dynamically discovered. If xAI changes its endpoint or response schema, update the endpoint/parser based on current official documentation and test with a real key.

### SiliconFlow notes

SiliconFlow is available as an AI provider in the provider selector and Settings. The app discovers model IDs from the account's model-list response and uses the selected ID for chat completions. Availability, free quotas, and model access depend on the user's SiliconFlow account. The UI must not label a model as free unless pricing/availability is confirmed from a trusted current source.

## AI planner behavior

When Freedom mode is OFF and an enabled AI key is selected, the planner receives the original prompt plus a detailed system instruction. It must return JSON in this shape:

```json
{
  "query": "one effective search-engine query",
  "limit": 10,
  "sources": ["web"],
  "intent": "a detailed explanation of the search strategy"
}
```

Planner requirements:

1. Infer likely intent from minimal input without asking unnecessary questions.
2. Expand useful synonyms, alternate spellings, related entities, and likely page types while retaining the original user terms.
3. Preserve every explicit target and filter, including exact phrases, URLs, domains, site operators, subreddits, repositories, dates, file types, exclusions, and locations.
4. Prioritize supplied websites, domains, URLs, social networks, subreddits, and repositories.
5. Translate natural-language requests for latest/current content, jobs, remote roles, pricing, reviews, documentation, code, discussions, comments, and file types into useful search terms/operators where supported.
6. Use a focused query, not an essay. Keep the query within the app's supported length.
7. Select relevant Firecrawl sources. Use web by default; add news for current events and images only when visual references are requested.
8. Choose a reasonable result limit: usually 10 for narrow lookups, 15-25 for broad discovery, and up to 50 for explicitly exhaustive requests.
9. Write 5-10 concise, explicit sentences in `intent`, explaining targets, variants, filters, result types, inclusions, and assumptions.
10. Do not invent facts, people, dates, or domains. Do not moralize or impose arbitrary restrictions on benign requests.

If no AI key is enabled, the app creates a direct-search plan from the original prompt. If Freedom mode is ON, it bypasses the AI planner and keeps the original query.

## Model discovery and fallback behavior

- Gemini's model list is filtered to text-capable Gemini/Gemma models.
- OpenRouter, xAI, Groq, and SiliconFlow use their model-list endpoints.
- Model discovery is performed with the API key entered by the user. Models are not assumed to be available to every account.
- The selected model is tried first. The app then tries other discovered models (up to 12 total attempts) for retryable failures or model/request errors currently classified as recoverable.
- Successful fallback updates the saved selected model and displays the actual model returned/used.
- Authentication/permission failures should be treated as credential or account configuration problems, not model fallback opportunities.
- Do not expose API keys in logs, UI error messages, URLs (except Gemini's documented key query parameter), or README examples.

## Firecrawl search behavior

The app calls Firecrawl v2 Search with:
- `query`: the reviewed query after normalizing the app's `site:any` wildcard token.
- `limit`: the user's selected result limit.
- `sources`: the selected plan sources.

The app currently displays returned web/news/image results, where provided, and retains the raw JSON response for inspection/export. Search results are indexed result cards; scraping each result is a separate future workflow.

## Run locally

Requirements: a current Node.js LTS release and npm.

```bash
npm install
npm run dev
```

Production build and local preview:

```bash
npm run build
npm run preview
```

## Configure API keys

Open **Settings** in the app.

1. Choose an AI provider: Gemini, OpenRouter, Grok, Groq, or SiliconFlow.
2. Paste the provider API key.
3. Select **Load models** to discover models available to that key.
4. Select the desired model and save the key.
5. Add a Firecrawl API key to execute searches.

Provider key/documentation links:
- Gemini: https://aistudio.google.com/apikey
- OpenRouter: https://openrouter.ai/keys
- xAI: https://console.x.ai/
- Groq: https://console.groq.com/keys
- SiliconFlow: https://cloud.siliconflow.com/account/ak
- Firecrawl: https://www.firecrawl.dev/app/api-keys

Official API documentation:
- Gemini: https://ai.google.dev/gemini-api/docs
- OpenRouter: https://openrouter.ai/docs
- xAI: https://docs.x.ai/
- Groq: https://console.groq.com/docs
- SiliconFlow: https://docs.siliconflow.com/
- Firecrawl: https://docs.firecrawl.dev/

## Deploy to Vercel

Import this repository into Vercel and connect the `main` branch.

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

The included `vercel.json` rewrites app routes to the SPA entry point. A push to `main` should trigger the connected Vercel production deployment.

## Security and privacy: browser-only MVP

There is no login, backend, or database yet.

- API keys and recent searches are stored in this browser's `localStorage`.
- Keys are not encrypted and may be inspected by someone with access to the browser profile.
- Provider requests are made directly from the browser to the AI provider and Firecrawl.
- Use a trusted personal device. Do not enter keys on shared/public devices.
- Rotate a key if it may have been exposed.
- Never commit real API keys, tokens, or personal credentials.

Browser requests can be affected by provider CORS policies, browser extensions, network restrictions, API quotas, billing/account state, and provider availability. A future server-side proxy should use authenticated access, encrypted secret storage, strict per-user authorization, rate limits, and redacted logs.

## Agent handover: rules for future contributors

Before changing code:

1. Read this README completely and inspect the current `src/App.tsx`, `src/styles.css`, `package.json`, and `vercel.json`.
2. Treat the live `main` branch as the source of truth. Fetch current file contents and SHA before every GitHub Contents API update.
3. Preserve existing user settings and localStorage compatibility. Do not rename the storage key without a migration.
4. Keep the product's freedom-first behavior: optional Freedom mode stays OFF by default; AI planning is the normal path when an AI key is enabled.
5. Preserve user-provided query intent and explicit filters. Do not add arbitrary allowlists, blocklists, or silent query rewriting.
6. Keep API keys private. Never print, commit, or send them to logs or third parties beyond the provider the user selected.
7. Dynamic model discovery must query the selected provider with the user's key. Do not claim static fallback lists are dynamically discovered.
8. Parse and surface provider error bodies/status codes safely. A 401/403 is generally an authentication/permission issue; do not wastefully cycle through every model on an auth failure.
9. For new providers, implement all required pieces together: provider type, defaults, provider key URL, model discovery endpoint/parser, chat-completion endpoint, model selector, add-key selector, help text, and README documentation.
10. Keep provider endpoint and response-shape differences explicit. Do not assume every vendor uses identical response schemas or CORS behavior.
11. Keep Firecrawl Search on the documented v2 endpoint and preserve reviewed query, limit, and source selection.
12. Avoid broad refactors for small requests. Make the smallest complete change, then build and verify.
13. After changes, run `npm run build`. If local execution is unavailable, rely on Vercel build logs and clearly state what was not tested.
14. Commit to `main` only when requested/authorized in the conversation. Confirm the exact commit and deployment status; never claim deployment success from a commit alone.
15. Do not use a user's real API key for testing unless the user explicitly authorizes a live request. Never ask them to paste a key into chat; they should enter it directly in the app.

## Roadmap

- Add automated tests for query planning, model discovery parsing, provider error handling, and Firecrawl response normalization.
- Add server-side proxy option to avoid browser CORS issues and protect keys.
- Add provider-aware pricing/capability metadata, with verified source data.
- Add Firecrawl scrape, crawl, and map workflows.
- Add authenticated accounts and encrypted per-user key storage.
- Add search history management and saved searches.
