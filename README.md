# Website Spell Checker Agent

A small learning project that crawls public website pages, extracts visible
text, checks it with LanguageTool, and optionally asks a local Ollama model to
review ambiguous findings.

## Current milestone

The MVP provides URL safety, limited same-hostname crawling, structured text
extraction, LanguageTool checking, PostgreSQL persistence, a two-screen React
report, CSV export, and optional Ollama review for word-choice findings.

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

In another terminal, run the frontend:

```bash
npm run dev:web
```

Open `http://localhost:5173`. The API health endpoint is available at
`http://localhost:4000/api/health`.

Start a stored scan:

```bash
curl -X POST http://localhost:4000/api/scans \
  -H 'content-type: application/json' \
  -d '{"startUrl":"https://example.com"}'
```

## Optional Ollama review

LanguageTool works without an AI model. To review contextual word-choice
findings with a local Ollama model, set these values in `.env`:

```env
OLLAMA_ENABLED=true
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3.5:4b
```

If Ollama is unavailable or returns invalid JSON, the scan keeps the original
LanguageTool result and continues.

See `AGENTS.md` for the complete, intentionally limited MVP scope.
