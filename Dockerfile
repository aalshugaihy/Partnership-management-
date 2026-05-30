# syntax=docker/dockerfile:1.6
# Multi-stage build for the partnership management platform

#─────────────────────────── deps ───────────────────────────
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Tools needed by better-sqlite3 native build
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --omit=optional

#─────────────────────────── builder ───────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

#─────────────────────────── runner ───────────────────────────
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Minimal runtime deps + libsqlite for better-sqlite3 native module
RUN apt-get update && apt-get install -y --no-install-recommends \
    libstdc++6 ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user for security
RUN groupadd -r app && useradd -r -g app -m -d /home/app app

COPY --from=builder --chown=app:app /app/.next ./.next
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./package.json
COPY --from=builder --chown=app:app /app/next.config.js ./next.config.js
COPY --from=builder --chown=app:app /app/scripts ./scripts
COPY --from=builder --chown=app:app /app/lib ./lib
COPY --from=builder --chown=app:app /app/tsconfig.json ./tsconfig.json
# NOTE: /app/data is the persistent volume mount point and is intentionally NOT
# copied from the builder — the host volume would overlay it anyway. The DB is
# created on first run via the seed script (which reads from scripts/seed.json).

# Writable volume mount point for the SQLite database
RUN mkdir -p /app/data && chown -R app:app /app/data
VOLUME ["/app/data"]
USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:${PORT:-3000}/api/health || exit 1

# Seed on every start. The seed script is idempotent:
#  - prospects use INSERT OR REPLACE by id
#  - GEOSA active partners check by company name (skip if exists)
#  - licensed_companies are DELETE+REINSERT
#  - org-wide KPIs same
# This ensures schema/data upgrades (e.g. new GEOSA partners) propagate even
# when a persistent DB already exists from a previous deployment.
CMD ["sh", "-c", "echo '⇒ Running seed (idempotent)...' && npm run seed && exec npx next start -p ${PORT:-3000} -H 0.0.0.0"]
