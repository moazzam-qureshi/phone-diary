# syntax=docker/dockerfile:1.7
# Multi-stage build for the Analog Life Log Next.js app.
# Build context is ./ui (see docker-compose.yml).

# === Deps ===
FROM node:22-alpine AS deps
WORKDIR /app
# npm install (not ci) so the build tolerates lockfile/npm-version drift and
# always installs devDependencies needed for `next build`, drizzle-kit, tsx.
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# === Builder ===
FROM node:22-alpine AS builder
WORKDIR /app
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

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
