# Analog Life Log System

A single-user, self-hosted **personal reality-logging device** with a retro
sci-fi / terminal aesthetic. Capture raw thoughts with near-zero friction,
attach outcomes later, browse a filtered timeline, and ask natural-language
questions over your log. See [`prd.md`](./prd.md) for the product spec.

**Stack:** Next.js 16 (App Router) · Postgres · Drizzle ORM · jose (password
gate) · OpenRouter (AI query) · Docker + Coolify.

```
phone-diary/
├── ui/                        # the Next.js app (all app code lives here)
├── docker-compose.yml         # web + postgres + migrate (used everywhere)
├── docker-compose.override.yml# local-only: publishes ports (Coolify ignores it)
├── docker-compose.dev.yml     # optional: postgres-only, for schema authoring
├── .env                       # single source of truth (git-ignored)
└── .env.example               # template
```

The app runs the same way everywhere: **Docker Compose**, reading the root
`.env` via `env_file`. `docker-compose.yml` defines `web` + `postgres` +
a one-shot `migrate` service. `DATABASE_URL` uses the compose service host
`postgres`, so it's identical locally and on Coolify.

## Run locally (Docker)

1. Create `.env` from the template and fill it in:
   ```bash
   cp .env.example .env
   ```
   Required values:
   - `POSTGRES_PASSWORD` — any password; must match the one in `DATABASE_URL`
   - `DATABASE_URL` — `postgres://als:<POSTGRES_PASSWORD>@postgres:5432/als`
   - `SESSION_SECRET` — `openssl rand -base64 32`
   - `APP_PASSWORD_HASH` — SHA-256 hex of your password (default ships as the
     hash of `letmein`):
     ```bash
     node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PW').digest('hex'))"
     ```
   - `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`
2. Build and start everything:
   ```bash
   docker compose up --build
   ```
   Compose auto-merges `docker-compose.override.yml`, publishing the web port.
   On first start the `migrate` service applies migrations, then `web` starts.
3. Open http://localhost:3000 — you'll be redirected to `/login`.

To rebuild after code changes: `docker compose up --build`.
To stop: `docker compose down` (add `-v` to also wipe the DB volume).

## Changing the database schema

Migrations live in `ui/drizzle/` and are applied automatically by the `migrate`
service on every `docker compose up`. To author a new migration you generate the
SQL once on the host:

```bash
# optional: postgres-only stack for host tooling
docker compose -f docker-compose.dev.yml up -d
cd ui && npm install
DATABASE_URL=postgres://als:als@localhost:5432/als npm run db:generate
```

Edit `ui/app/lib/db/schema.ts`, run `db:generate`, commit the new SQL in
`ui/drizzle/`. The next `docker compose up` applies it.

## Audio

The only sound is a synthesized analog-keypad **click on each keystroke**
(generated in code via Web Audio — no audio files). Toggle it with the `♪`
control in the nav; the setting persists in `localStorage`.

## Deploy on Coolify

1. Push this repo to Git.
2. In Coolify, create a **Docker Compose** resource pointing at
   `docker-compose.yml`.
3. Set environment variables in Coolify's UI (same keys as your local `.env`):
   - `POSTGRES_PASSWORD` — strong random password
   - `DATABASE_URL` — `postgres://als:<POSTGRES_PASSWORD>@postgres:5432/als`
     (internal Docker host `postgres`)
   - `SESSION_SECRET` — `openssl rand -base64 32`
   - `APP_PASSWORD_HASH` — sha256 hex of your password (see above)
   - `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`
4. Expose the **web** service on port `3000` and assign your domain + SSL.
   Do **not** expose `postgres`. Coolify uses `docker-compose.yml` only — it
   ignores `docker-compose.override.yml`, so the local port mappings don't apply.
5. Deploy. Coolify builds the images, runs the one-shot `migrate` service
   (applies migrations, exits 0), then starts `web`. The `als_pg_data` volume
   persists across redeploys.

## Security notes

- Single-user password gate: SHA-256 of the password compared in constant time,
  session is a jose-signed (HS256) httpOnly cookie. Fine for a private,
  single-user deployment behind HTTPS. Use a high-entropy password.
- The Proxy (`ui/proxy.ts`) is an optimistic redirect only; the real gate is
  `verifySession()` (`ui/app/lib/dal.ts`), called by every page, action, and the
  AI route handler.
