# Presence audit log (Cloudflare Worker + D1)

Tiny write-only event log used as a permanent companion to the live abacus counter.
The browser fires a fire-and-forget beacon to `/log` whenever a user completes a
10-minute cycle. We also expose `/stats` so we can read aggregates later without
queueing wrangler queries.

Abacus still drives the live GDP display in `index.html`. This is purely an
audit trail we own.

## One-time deploy

Requires Node and a (free) Cloudflare account.

```bash
cd /Users/germain/Dev/AI_OS/worker

# 1. Auth (opens a browser)
npx wrangler login

# 2. Create the D1 database — wrangler prints a database_id
npx wrangler d1 create presence
#   → "database_id = 'abcd-1234-...' "
#   Paste that value into wrangler.toml's `database_id` field.

# 3. Apply the schema to the remote D1
npx wrangler d1 execute presence --remote --file=schema.sql

# 4. Deploy the worker — prints the public URL
npx wrangler deploy
#   → "https://presence-log.<your-subdomain>.workers.dev"
```

## Wire the client

Open `/Users/germain/Dev/AI_OS/index.html` and set the `LOG_ENDPOINT` constant
(near the top of the `<script>` block) to the worker URL printed above. Leave
it as `""` to disable logging.

```js
const LOG_ENDPOINT = "https://presence-log.<your-subdomain>.workers.dev";
```

## Reading the data

```bash
# Quick aggregates
curl https://presence-log.<your-subdomain>.workers.dev/stats

# Arbitrary queries
npx wrangler d1 execute presence --remote --command \
  "SELECT day, COUNT(*) FROM events WHERE event_type='completion' GROUP BY day ORDER BY day DESC"
```

## What we record

Per completion:
- `ts`              — server-side unix ms
- `day`             — UTC YYYY-MM-DD (matches the abacus namespace key)
- `event_type`      — `'completion'`
- `anon_id`         — the browser's `presence:userId` UUID
- `came_from_ref`   — `?ref=` value if this user arrived via a share
- `ua`              — user-agent string (truncated)
- `ip_day_hash`     — `sha256(ip + day)` — we never store the raw IP

No login, no email, no PII beyond what the browser sends in headers.

## Free-tier ceiling

Cloudflare Workers free plan: 100k requests/day. D1 free plan: 5GB storage,
5 million reads/day, 100k writes/day. Plenty of headroom for "share with a
few people."
