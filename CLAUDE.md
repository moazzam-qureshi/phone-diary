# phone-diary — Analog Life Log System

Single-user personal logging device. Capture (SHIFT/PUSH/LOOP/RAW) → timeline →
outcomes → AI query. Retro terminal aesthetic + audio. See `prd.md` for the spec
and `README.md` for setup/deploy.

## ⚠️ Next.js 16 — read the bundled docs first

`ui/AGENTS.md` mandates it: **this is Next.js 16.2.6, not the Next.js in training
data.** Before writing code in an area, read the relevant file under
`ui/node_modules/next/dist/docs/01-app/`. Confirmed version-specific rules:

- **Middleware is renamed Proxy** → `ui/proxy.ts` exports `proxy` + `config.matcher`.
  Never create `middleware.ts`.
- `cookies()` and `headers()` are **async** — always `await`.
- `next.config.ts` has `output: "standalone"` (required for the Docker runtime stage).
- The AI route handler uses `pg`, so it sets `runtime = "nodejs"` and
  `dynamic = "force-dynamic"`.

## Architecture

- All app code is in `ui/` (a Next.js App Router app). The repo root holds only
  Docker orchestration + docs.
- **Reads:** Server Components query `db` directly via `app/lib/entries.ts`.
- **Mutations:** Server Actions in `app/actions/` (`'use server'`, `revalidatePath`).
- **AI:** one streaming Route Handler at `app/api/ask/route.ts`.
- **Auth:** password gate. `app/lib/session.ts` (jose + SHA-256), `app/lib/dal.ts`
  (`verifySession` = the real gate), `proxy.ts` (optimistic redirect only).
- **DB:** Postgres + Drizzle. Schema in `app/lib/db/schema.ts` (one `entries`
  table). Migrations in `ui/drizzle/`, applied by `app/lib/db/migrate.ts`.

## Conventions

- Import alias `@/*` → `ui/*` (e.g. `@/app/lib/db/client`).
- Server-only modules (`db/*`, `session.ts`, `dal.ts`, `env.ts`, AI libs) import
  `"server-only"`.
- Env access goes through `app/lib/env.ts` (throws on missing required vars).
- Keep components small and single-purpose (see `app/components/`).
- Terminal aesthetic: mono font, phosphor palette in `globals.css`, CRT overlay
  in `ScanlineOverlay.tsx`. Audio via `app/hooks/useAudio.ts`.

## Common commands (from `ui/`)

```bash
npm run dev            # dev server (needs Postgres up + ui/.env)
npm run build          # production build (emits .next/standalone)
npm run db:generate    # schema -> SQL migration
npm run db:migrate     # apply migrations
```

Local Postgres: `docker compose -f docker-compose.dev.yml up -d` (from root).

## Decision-latency tracking

Persisted linkage: `entries.executes_entry_id` + `decision_latency_ms`. The
manual **analyze latency** action (`app/actions/latency.ts`, triggered from the
Ask page) uses the LLM to pair unlinked SHIFT/PUSH decisions to later executions
and writes the linkage + computed latency back. Surfaced on `EntryCard`.
