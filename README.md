# presence

A small meditative web experience: a 10-minute typewriter sequence that
encourages a single intentional pause from screens, tracking a collective
"Global Daily Presence" counter across all visitors.

Live at **https://presence-d8g.pages.dev**.

## Architecture

| Piece | Where it runs | What it does |
|---|---|---|
| `site/index.html` | Cloudflare Pages | Single self-contained HTML file: typewriter sequence, YouTube IFrame for music, share flow. |
| `worker/` | Cloudflare Worker + D1 | Append-only audit log of every completed cycle, with a small `/stats` endpoint. |
| `abacus.jasoncameron.dev` | Third-party hobby counter | Drives the live "+XX min. of GDP*" display. Daily UTC namespace `presence-anthropic-YYYY-MM-DD/cycles`. |

The page is static; all state lives in the visitor's `localStorage` (anon
UUID, completion date, share count) plus the two counter services above.

## Local dev

```bash
# Serve site/ on localhost:8091
python3 -m http.server 8091 --directory site
open http://localhost:8091/?fast      # ?fast shrinks 10-min timer to 10s
```

## Deploy

```bash
# Static page
cd /Users/germain/Dev/AI_OS
npx wrangler pages deploy site --project-name presence

# Audit log Worker (rare; only when worker/ changes)
cd worker
npx wrangler deploy
```

## Repo layout

```
site/
  index.html         # the entire client app
worker/
  src/index.js       # Cloudflare Worker (POST /log, GET /stats)
  wrangler.toml      # binds D1 database `presence`
  schema.sql         # events table
  README.md          # deploy steps
```
