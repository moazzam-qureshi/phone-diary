# syntax=docker/dockerfile:1.7
# Multi-stage build for the Analog Life Log Next.js app.
# Build context is ./ui (see docker-compose.yml).

# === Deps ===
FROM node:22-alpine AS deps
WORKDIR /app
# Coolify injects `ARG NODE_ENV` (often =production) into every stage, which
# makes npm skip devDependencies. We MUST install devDeps (next, tailwind,
# typescript, drizzle-kit, tsx are all needed to build). Force it explicitly
# and ignore the injected NODE_ENV. npm install (not ci) tolerates lockfile drift.
ARG NODE_ENV
COPY package.json package-lock.json ./
RUN NODE_ENV=development npm install --include=dev --no-audit --no-fund

# === Builder ===
FROM node:22-alpine AS builder
WORKDIR /app
ARG NODE_ENV
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build with NODE_ENV=production output but devDeps already present.
RUN NODE_ENV=production npm run build

# === Migrator ===
# Retains full deps + the drizzle/ SQL + migrate.ts so the one-shot migrate
# service can run the programmatic migrator (no drizzle-kit needed at runtime).
FROM builder AS migrator
WORKDIR /app
CMD ["npm", "run", "db:migrate"]

# === Runtime ===
# Minimal Next.js standalone bundle.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
