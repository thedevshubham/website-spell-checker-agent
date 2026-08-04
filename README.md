# Website Spell Checker Agent

A small learning project that crawls public website pages, extracts visible
text, checks it with LanguageTool, and optionally asks a local Ollama model to
review ambiguous findings.

## Current milestone

Milestones 1 and 2 provide URL safety, limited same-hostname crawling,
structured text extraction, LanguageTool checking, PostgreSQL persistence,
scan progress endpoints, issue filters, and CSV export.

## Requirements

- Node.js 20 or newer
- npm
- Docker (needed in later milestones)

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate --workspace @spell-checker/api
docker compose up -d postgres languagetool
npm run prisma:migrate --workspace @spell-checker/api -- --name initial
npm test
```

Run the crawler against a public static website:

```bash
npm run crawl -- https://example.com
```

Run the basic API:

```bash
npm run dev
```

Then open `http://localhost:4000/api/health`.

Start a stored scan:

```bash
curl -X POST http://localhost:4000/api/scans \
  -H 'content-type: application/json' \
  -d '{"startUrl":"https://example.com"}'
```

See `AGENTS.md` for the complete, intentionally limited MVP scope.
