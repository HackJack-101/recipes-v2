# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=24-alpine
# Oldest Node allowed: 24.22.1 ships NSS 3.131.1, the fix for CVE-2026-111943.
# The floating tag above still picks up newer releases; this only sets a floor.
ARG NODE_MIN_VERSION=24.22.1

FROM node:${NODE_VERSION} AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1 SKIP_DB_SETUP=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:${NODE_VERSION} AS runner
ARG NODE_MIN_VERSION
RUN node -e 'const [a, b] = [process.versions.node, process.argv[1]].map((v) => v.split(".").map(Number)); \
  const older = a.findIndex((n, i) => n !== b[i]); \
  if (older !== -1 && a[older] < b[older]) { console.error(`Node ${process.versions.node} is older than ${process.argv[1]}`); process.exit(1); }' \
  "$NODE_MIN_VERSION"
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/data/uploads
RUN addgroup -S -g 1001 app && adduser -S -u 1001 -G app app \
    && mkdir -p /data/uploads && chown -R app:app /data
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/drizzle ./drizzle
# Set by CI: the release version (or branch) and commit, shown in the app.
ARG APP_VERSION=dev
ARG APP_COMMIT=
ENV APP_VERSION=${APP_VERSION} APP_COMMIT=${APP_COMMIT}
USER app
EXPOSE 3000
VOLUME ["/data/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
