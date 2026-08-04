# AGENTS.md

## Project

Website Spell Checker Agent

## Purpose

Build a small, readable MVP that demonstrates how a bounded AI agent works.
The code should favor clarity over abstraction, scale, or production features.

Only implement what this file describes. Keep functions short, name things
clearly, and explain non-obvious decisions with brief comments.

## Product Goal

A user enters a public website URL. The application visits a limited number of
same-hostname pages, extracts visible English text, finds spelling and grammar
issues, optionally asks a local LLM to review ambiguous findings, stores the
results, and displays a basic report.

The application is read-only and must never modify the scanned website.

```text
URL
 -> discover internal pages
 -> fetch HTML
 -> extract visible text
 -> check with LanguageTool
 -> optionally review uncertain findings with Ollama
 -> store results
 -> display report
```

## What Makes This an Agent

The agent is a deterministic TypeScript orchestrator. It owns the workflow and
calls a small set of specialized tools:

```text
discoverPages
fetchPage
extractContent
checkWithLanguageTool
reviewWithOllama (optional)
saveResults
```

LanguageTool detects likely errors. Ollama only reviews findings that need
context. The LLM must not choose URLs, control the crawl, execute code, or call
arbitrary tools.

## MVP Scope

Include:

- One public website per scan
- Same-hostname pages only
- Static HTML pages
- Internal-link discovery
- Configurable page-count limit
- Visible English text extraction
- Spelling, grammar, punctuation, and word-choice findings
- Self-hosted LanguageTool
- Optional local Ollama review
- PostgreSQL persistence with Prisma
- Basic scan progress
- Results grouped by page
- Category and page filters
- CSV export
- Simple failure handling

Do not include:

- Authentication, teams, or billing
- Scheduled scans or notifications
- CMS integrations
- Website editing or automatic corrections
- RAG, embeddings, or vector databases
- Multiple languages
- Playwright or JavaScript-rendered page support
- Sitemap discovery
- Distributed queues or workers
- Multi-agent architecture
- Advanced analytics, SEO, accessibility, or broken-link checks
- Production-scale crawling

## Technology

Use:

- React, TypeScript, and Vite for the frontend
- Express, TypeScript, and Zod for the API
- Prisma and PostgreSQL for persistence
- Cheerio for links and visible text
- LanguageTool through its HTTP API
- Ollama through its HTTP API
- Vitest, React Testing Library, and Supertest for tests
- Docker Compose for PostgreSQL and LanguageTool

Avoid adding libraries when a small built-in solution is easy to understand.

## Suggested Structure

Keep the structure small. Responsibilities may be split further only when a
file becomes difficult to understand.

```text
apps/
  api/
    src/
      app.ts
      server.ts
      scan-agent.ts
      crawler.ts
      extractor.ts
      languagetool.ts
      ollama.ts
      db.ts
      routes/scans.ts
    prisma/schema.prisma
  web/
    src/
      api.ts
      App.tsx
      pages/HomePage.tsx
      pages/ScanPage.tsx
packages/
  shared/
    src/types.ts
docker-compose.yml
.env.example
README.md
```

Do not create repository, service, factory, or dependency-injection layers
unless the current code genuinely needs them.

## Domain Models

Keep statuses intentionally small.

```ts
type ScanStatus = "running" | "completed" | "failed";
type PageStatus = "pending" | "completed" | "failed";

type IssueCategory =
  | "spelling"
  | "grammar"
  | "punctuation"
  | "word_choice";
```

### Scan

```ts
interface Scan {
  id: string;
  startUrl: string;
  hostname: string;
  status: ScanStatus;
  pagesDiscovered: number;
  pagesProcessed: number;
  issuesFound: number;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
}
```

### Page

```ts
interface ScannedPage {
  id: string;
  scanId: string;
  url: string;
  title?: string | null;
  status: PageStatus;
  errorMessage?: string | null;
}
```

### Issue

```ts
interface ContentIssue {
  id: string;
  scanId: string;
  pageId: string;
  pageUrl: string;
  elementType: string;
  originalText: string;
  matchedText: string;
  suggestion?: string | null;
  context: string;
  category: IssueCategory;
  source: "languagetool" | "ollama" | "hybrid";
  ruleId?: string | null;
}
```

The Prisma schema should contain equivalent `Scan`, `Page`, and `Issue` models
with relations and cascade deletion. Do not add scoring fields.

## API

### Start a scan

```http
POST /api/scans
Content-Type: application/json

{
  "startUrl": "https://example.com"
}
```

Validate the request with Zod, create the scan, and start processing
asynchronously in the same Node.js process.

### Get progress

```http
GET /api/scans/:scanId
```

### Get pages

```http
GET /api/scans/:scanId/pages
```

### Get issues

```http
GET /api/scans/:scanId/issues?category=spelling&pageUrl=https://example.com
```

### Export issues

```http
GET /api/scans/:scanId/export.csv
```

### Health check

```http
GET /api/health
```

The health response only needs to confirm that the API is running. Dependency
diagnostics can be added later.

## Scan Workflow

Implement the orchestration as straightforward sequential code:

1. Validate and normalize the start URL.
2. Create a scan with status `running`.
3. Discover internal pages until the queue is empty or the limit is reached.
4. Save the discovered pages.
5. Process one page at a time.
6. Fetch its HTML.
7. Extract structured visible text.
8. Send the text to LanguageTool.
9. Optionally review ambiguous findings with Ollama.
10. Deduplicate and save the findings.
11. Update progress after every page.
12. Mark the scan `completed`.

If one page fails, mark that page `failed` and continue. Mark the entire scan
`failed` only when the workflow cannot continue, such as a database failure or
an invalid starting URL.

No concurrency is needed for the first MVP. Retry a failed page once.

## URL Rules and Safety

Accept only `http` and `https` URLs.

Only crawl URLs that:

- use the starting URL's exact hostname
- return HTML
- do not contain credentials
- are not fragments or duplicate normalized URLs
- are not obvious downloads
- do not match `/logout`, `/signout`, `/cart`, `/checkout`, `/account`, or
  `/admin`

Remove fragments and common tracking parameters such as `utm_*`, `gclid`, and
`fbclid`. Sort remaining query parameters so equivalent URLs deduplicate.

Protect against SSRF. Before every request, reject localhost, loopback,
link-local, private IP ranges, cloud metadata addresses, and internal
hostnames. Revalidate redirect targets and allow no more than three redirects.
Use a request timeout and response-size limit.

Do not submit forms, click buttons, forward credentials, accept user-provided
headers, download files, or access local files based on website input.

## Crawling

Start with the submitted page and discover links from HTML `<a href>` elements.
Normalize, validate, and deduplicate every link before adding it to the queue.

Use:

```env
CRAWL_MAX_PAGES=10
PAGE_TIMEOUT_MS=30000
MAX_RESPONSE_BYTES=5000000
```

The small default makes local testing predictable. The user can increase the
limit when needed. If the limit is reached, complete the scan normally and make
it clear in the UI that only the configured number of pages was scanned.

## Content Extraction

Use Cheerio and return structured blocks from:

- `<title>`
- meta description
- headings
- paragraphs
- list items
- buttons
- links
- labels
- placeholders
- image alt text
- ARIA labels

Each block should contain:

```ts
interface ContentBlock {
  elementType: string;
  text: string;
  context: string;
}
```

Ignore scripts, styles, code, hidden elements, empty strings, URLs, email
addresses, filenames, identifiers, and strings containing only numbers or
symbols. Normalize whitespace but preserve the original capitalization.
Deduplicate identical blocks within the same page.

Do not add selectors until they are needed by the UI.

## LanguageTool

Send extracted text to:

```env
LANGUAGETOOL_URL=http://localhost:8010
LANGUAGETOOL_TIMEOUT_MS=15000
```

Use `POST /v2/check` with `language=en-US`. Preserve the matched text,
suggestion, context, rule ID, and category. Keep a mapping from checked text to
its original content block.

Simple batching is acceptable if required by LanguageTool input limits, but do
not build a general batching framework.

If LanguageTool is unavailable, record a clear scan error. LanguageTool is the
required checker for this MVP.

## Optional Ollama Review

Add Ollama only after the crawler-to-LanguageTool path works end to end.

```env
OLLAMA_ENABLED=false
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
OLLAMA_TIMEOUT_MS=30000
```

The model name must come from the environment. Only send a finding to Ollama
when it may be a contextual word-choice problem or a false positive. Do not send
every content block or every LanguageTool result.

Require this JSON response:

```ts
const LLMReviewSchema = z.object({
  isLikelyIssue: z.boolean(),
  suggestion: z.string().nullable(),
  explanation: z.string(),
  category: z.enum([
    "spelling",
    "grammar",
    "punctuation",
    "word_choice"
  ])
});
```

Validate the response with Zod. If Ollama is disabled, unavailable, or returns
invalid JSON, keep the LanguageTool result and continue the scan.

Use this system instruction:

```text
You are reviewing a possible writing issue found on a website.
Judge only the supplied text and context.
Use US English.
Do not rewrite unrelated text.
Return valid JSON matching the supplied schema.
Mark the finding false when the original wording is acceptable.
```

## Deduplication

Store at most one identical issue per page. A simple key is sufficient:

```ts
const key = [
  pageUrl,
  elementType,
  matchedText.trim().toLowerCase(),
  suggestion?.trim().toLowerCase() ?? "",
  ruleId ?? ""
].join("|");
```

## Frontend

Build only two screens.

### Home page: `/`

- Website URL field
- Start scan button
- Visible validation errors

### Scan page: `/scans/:scanId`

- URL and scan status
- Pages discovered and processed
- Total issues
- Simple progress bar
- Page and category filters
- Issue list containing page URL, original text, matched text, suggestion,
  category, and context
- CSV export button
- Empty and error states

Poll every two seconds while the scan status is `running`. Stop polling when it
is `completed` or `failed`.

Use plain, readable UI components. Do not add charts, animation, a design
system, or complex state management.

## Errors and Logging

Return safe error messages to the frontend and never expose stack traces.
Handle these cases:

- invalid or unsafe URL
- DNS or request failure
- timeout or oversized response
- non-HTML response
- no crawlable page
- extraction failure
- LanguageTool failure
- database failure

Use `console.info` and `console.error` with small structured objects containing
the scan ID, page URL, stage, and error. Never log full page content.

## Environment

Create `.env.example` containing:

```env
NODE_ENV=development
API_PORT=4000
WEB_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/website_spell_checker
LANGUAGETOOL_URL=http://localhost:8010
LANGUAGETOOL_TIMEOUT_MS=15000
OLLAMA_ENABLED=false
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b
OLLAMA_TIMEOUT_MS=30000
CRAWL_MAX_PAGES=10
PAGE_TIMEOUT_MS=30000
MAX_RESPONSE_BYTES=5000000
```

Never hardcode infrastructure URLs, model names, or secrets.

## Docker Compose

Include only PostgreSQL and LanguageTool. Run the API and frontend locally.
Assume Ollama runs on the host and connect through `OLLAMA_URL`.

## Tests

Keep the test suite focused.

Unit tests:

- URL normalization and unsafe URL rejection
- same-hostname filtering and page limit
- visible content extraction
- LanguageTool result mapping
- issue deduplication
- Ollama response validation

API tests:

- create and retrieve a scan
- retrieve issues
- export CSV
- continue after one page fails
- continue when optional Ollama is unavailable

Frontend tests:

- validate and submit the URL form
- render and stop polling scan progress
- render and filter issues

Use a small local fixture website with known errors. Automated tests must not
depend on a live third-party website or real LanguageTool/Ollama services.

## Implementation Milestones

Complete one milestone before moving to the next.

### 1. Crawl and extract

- Create the workspace and database
- Validate one URL
- Discover a limited number of internal pages
- Fetch static HTML
- Extract structured visible text

### 2. Check and store

- Connect LanguageTool
- Map findings to content blocks
- Store scans, pages, and issues
- Continue after page failures

### 3. Display and export

- Add the URL form
- Show progress and results
- Add filters and CSV export

### 4. Add optional AI review

- Connect Ollama
- Review only ambiguous findings
- Validate structured output
- Fall back safely to LanguageTool

## Coding Rules

- Use TypeScript strict mode and avoid `any`.
- Use Zod at API and external-service boundaries.
- Prefer small functions and direct control flow.
- Use deterministic code whenever it is sufficient.
- Keep the LLM optional and bounded.
- Do not add abstractions for hypothetical future needs.
- Do not silently swallow errors.
- Do not fail the whole scan because one page fails.
- Update the README when setup or behavior changes.
- Do not add features outside this document unless the user requests them.

## Definition of Done

The MVP is complete when a user can:

1. Enter a safe public URL.
2. Scan up to the configured number of static same-hostname pages.
3. See progress while pages are processed.
4. View stored LanguageTool findings with their page and context.
5. Filter findings and export them as CSV.
6. Optionally enable Ollama to review ambiguous findings without allowing the
   LLM to control the workflow.

The application must start from documented local setup instructions, and its
core behavior must be covered by focused tests.
