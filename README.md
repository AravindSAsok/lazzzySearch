# lazzzySearch

**The searching app for lazzzy peeps, with a pinch of AI.**

A flexible, AI-assisted web search workspace. The user describes what they want in plain language; AI turns that request into a structured search plan; Firecrawl searches the requested website or web scope; lazzzySearch presents the returned material with as little transformation as possible.

The product principle is simple: **the user's search intent is the priority.**

## Product experience

The home screen should feel like a simple search box, not a complicated search configuration form.

Example user request:

> Search for "kaboom" on this website and give me the data, URLs, or anything useful.

The app should infer the likely website, search terms, desired information, and useful Firecrawl operations. If the user supplied a URL, treat it as the target. If the request is genuinely ambiguous, make the best transparent interpretation and let the user edit the generated plan before running it.

### Main flow

1. User enters a natural-language search request.
2. The AI planner extracts:
   - Target website, domain, URL, or broader search scope
   - Search terms and relevant filters
   - What the user wants returned
   - Suggested Firecrawl search, scrape, crawl, or map operations
3. The user can inspect or edit the plan, or run it directly.
4. The backend calls Firecrawl with the generated parameters.
5. The app displays the results in their returned form, preserving useful metadata and links.
6. The user can open, copy, or export results.

Possible result types include ordinary page URLs, page text, structured data, images, video links, documents, and other URLs or resources exposed by the search provider. The UI should not assume every result is an article.

## Core features

### 1. Natural-language search

- One primary prompt box.
- Support plain-language requests rather than requiring users to know Firecrawl parameters.
- AI extracts target, intent, terms, filters, and output preferences.
- Show the generated search plan so users can understand and edit what will run.
- Support follow-up refinement of a search.

### 2. AI provider and API-key manager

Users can add multiple API keys, including multiple keys for the same provider.

Initial provider targets:
- Google Gemini
- OpenRouter
- xAI Grok
- Firecrawl

Requirements:
- Users can add, label, validate, enable, disable, and delete keys.
- A user may add one key or many keys.
- Validate a key when it is added and show a clear success or failure state.
- For AI providers, retrieve the models available to that key where the provider API supports it.
- Clearly distinguish free models from paid models when reliable provider pricing metadata is available. Do not guess that a model is free.
- Let the user choose a preferred model or configure a fallback order.
- Show key status, provider, label, last validation time, and available model information without revealing the secret again.
- Never send one user's keys to another user's session.

**Credential security is a core requirement.** Encrypt API keys at rest using authenticated encryption and a server-side key-management secret; never store plaintext API keys, return them to the browser after saving, write them to logs, or expose them in analytics. Use HTTPS, strict user-level authorization, and careful secret redaction. Provide key deletion and rotation. Do not put provider secrets in frontend environment variables or browser local storage.

### 3. Firecrawl search engine

Use Firecrawl as the web extraction and discovery layer. Keep the integration behind a backend service so the provider can be changed or extended later.

Potential operations, selected according to the user's intent:
- Search
- Scrape a URL
- Crawl a site within a user-defined scope
- Map/discover URLs
- Extract structured data where supported

Do not silently turn a single-page search into an unbounded crawl. Make scope and operation visible, apply reasonable request/time limits, and let the user expand the scope intentionally.

### 4. Results workspace

- Present raw provider results faithfully, with readable formatting.
- Preserve source URLs, titles, snippets, metadata, and structured payloads returned by Firecrawl.
- Support mixed result types rather than assuming every result is a webpage.
- Provide copy-link, open-source, copy-result, and export actions where applicable.
- Clearly label unavailable, partial, or failed results.
- Do not fabricate missing fields or rewrite source content as if it were original evidence.

### 5. Hidden help guide

A help button opens a guide or drawer. Keep it hidden until requested so the search screen stays simple.

The guide should explain:
- How lazzzySearch turns a natural-language request into a search plan.
- How AI providers are used and how users select a model.
- How Firecrawl search, scrape, crawl, and map work.
- How to obtain API keys, with official provider links.
- How to add and validate keys in the app.
- Which operations consume provider credits and where to check usage.
- Common errors, limits, privacy, and key-management guidance.

Official documentation and key links to include and verify during implementation:

- Firecrawl: https://www.firecrawl.dev/
- Firecrawl documentation: https://docs.firecrawl.dev/
- Firecrawl API reference: https://docs.firecrawl.dev/api-reference/introduction
- Google AI Studio: https://aistudio.google.com/
- Gemini API key documentation: https://ai.google.dev/gemini-api/docs/api-key
- Gemini API documentation: https://ai.google.dev/gemini-api/docs
- OpenRouter: https://openrouter.ai/
- OpenRouter API documentation: https://openrouter.ai/docs
- OpenRouter models and pricing: https://openrouter.ai/models
- xAI: https://x.ai/
- xAI API documentation: https://docs.x.ai/

Verify these destinations and current provider onboarding steps before shipping the guide; provider URLs and interfaces can change.

## Suggested architecture

Start as a small web application with a clear separation between UI, application services, and provider adapters.

```text
Browser UI
  |
  v
Application API
  |
  +---- Authentication & user settings
  |
  +---- Encrypted API-key vault
  |
  +---- AI provider adapter
  |       +---- Gemini
  |       +---- OpenRouter
  |       +---- xAI / Grok
  |
  +---- Search planner and plan validator
  |
  +---- Firecrawl adapter
  |       +---- Search
  |       +---- Scrape
  |       +---- Crawl
  |       +---- Map
  |
  +---- Search history and result storage
  |
  v
Results UI / exports
```

Keep provider-specific request formats out of the UI. Define internal interfaces for model discovery, key validation, AI completion, and Firecrawl operations.

## Suggested implementation stack

These are starting recommendations, not fixed requirements:

- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + TypeScript (Express or Fastify)
- **Database:** PostgreSQL
- **Data access:** Prisma or Drizzle
- **Validation:** Zod for API inputs and AI-generated plans
- **AI integration:** Provider adapters for Gemini, OpenRouter, and xAI
- **Search/extraction:** Firecrawl API
- **Authentication:** Secure session-based authentication
- **Deployment:** Keep frontend and backend deployable independently if needed

Choose the final stack after inspecting the repository's intended setup and the user's deployment preferences.

## AI planner contract

The model should return structured data, not executable code. A conceptual plan could look like:

```json
{
  "target": {
    "type": "website",
    "value": "https://example.com"
  },
  "intent": "Find pages and information related to kaboom",
  "searchTerms": ["kaboom"],
  "operation": "search",
  "limit": 20,
  "output": ["urls", "page_content", "metadata"]
}
```

The backend validates every field against the supported Firecrawl API schema before making a request. Treat webpage content and search results as untrusted data; never let retrieved content change system instructions, access another user's keys, or trigger unrelated actions.

## Product boundaries

The goal is broad, user-directed search with minimal unnecessary friction. Do not impose arbitrary topic-based judgments or silently narrow a user's query.

At the same time, no application can promise literally unlimited access to every website or resource. Actual results depend on provider capabilities, website availability, authentication, robots/access controls, rate limits, applicable law, and service terms. The app should report those constraints transparently rather than bypassing access controls, authentication, paywalls, or technical protections.

The user can choose what to search; the system must still protect account credentials, user data, and the reliability of the service.

## MVP roadmap

### Phase 1 — Search works end to end
- Create the basic web UI with a single natural-language search box.
- Add backend configuration for one AI provider and Firecrawl.
- Convert a request into a validated search plan.
- Execute a Firecrawl search and render the returned results.
- Add the expandable help guide.

### Phase 2 — Bring your own keys
- Add user accounts and per-user key management.
- Support multiple keys per provider.
- Validate keys on entry.
- Discover and list available models where provider APIs support it.
- Show free/paid model status only from reliable pricing data.
- Encrypt secrets at rest and enforce strict access isolation.

### Phase 3 — More search operations and result types
- Add scrape, crawl, and map flows.
- Add plan preview and editing.
- Improve mixed result rendering, exports, and search history.
- Add clear usage, error, and partial-result reporting.

### Phase 4 — Reliability and release
- Add provider fallback configuration and retry handling.
- Add quotas, timeouts, rate limits, and observability.
- Test key isolation, encryption, authorization, prompt injection resistance, and provider failure cases.
- Review provider terms and website access constraints before public launch.

## Guiding principles

1. The user's search intent is the priority.
2. Keep the interface simple; hide complexity until it is useful.
3. AI interprets and plans; deterministic backend code validates and executes.
4. Support multiple user-owned provider keys without exposing them.
5. Show returned results faithfully; never invent data.
6. Be transparent about provider errors, access limits, and incomplete results.
7. Build a working search loop first, then expand provider and operation support.

## Current status

This repository is the home for lazzzySearch. This README records the initial product brief and implementation direction. The web application itself has not yet been implemented.
