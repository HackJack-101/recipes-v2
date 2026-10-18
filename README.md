# Recipes

A private, self-hosted cookbook for families, friends or small teams. Save recipes in shared **kitchens**, cook from them on any device, and share a single recipe with anyone through a link. Available in French and English. See [PRODUCT.md](PRODUCT.md) for the product overview.

- Next.js (App Router, server actions) · React · TypeScript · Tailwind CSS
- PostgreSQL with Drizzle ORM
- AI recipe import with Claude (optional)
- Shipped as a Docker image: `ghcr.io/hackjack-101/recipes-v2`

## Self-hosting with Docker Compose

```sh
curl -O https://raw.githubusercontent.com/HackJack-101/recipes-v2/main/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/HackJack-101/recipes-v2/main/.env.example
# edit .env: set POSTGRES_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD, APP_URL (and ANTHROPIC_API_KEY for AI import)
docker compose up -d
```

Open `APP_URL` (default http://localhost:3000) and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. The super admin is created on first start, when the database has no users. From the **Administration** page, create accounts and kitchens; kitchen owners then manage their members.

Database migrations run automatically when the container starts. Data lives in two volumes: `pgdata` (database) and `uploads` (photos). Back up both.

| Variable | Description |
| --- | --- |
| `APP_URL` | Public URL, used to build share links. Use `https://` to mark the session cookie secure. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credentials of the bundled PostgreSQL. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | First super admin, created only if no user exists. |
| `ANTHROPIC_API_KEY` | Enables AI import. Without it the import button is hidden. |
| `ANTHROPIC_MODEL` | Claude model used for import (default `claude-opus-5-5`). |
| `RECIPES_VERSION` | Image tag to run (default `latest`). |
| `PORT` | Host port (default `3000`). |

Put the app behind a reverse proxy with HTTPS (Caddy, Traefik, nginx…) for anything beyond your local network.

## Development

Requirements: Node 24 and pnpm (`corepack enable`), plus a PostgreSQL database.

```sh
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL on localhost:5432
cp .env.example .env                              # then set DATABASE_URL=postgres://recipes:recipes@localhost:5432/recipes and UPLOAD_DIR=./uploads
pnpm install
pnpm dev                                          # migrates, seeds the admin, serves http://localhost:3000
```

| Command | |
| --- | --- |
| `pnpm lint` / `pnpm typecheck` | ESLint and TypeScript |
| `pnpm test` | Unit tests (Vitest). Set `TEST_DATABASE_URL` to also run the database tests. |
| `pnpm build && pnpm test:e2e` | Playwright smoke test (desktop + mobile) against the production build |
| `pnpm db:generate` | Create a migration after changing `src/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations and seed the admin without starting the app |

### Project layout

```
src/
  app/            routes (pages, server actions in app/actions, API routes in app/api)
  components/     UI primitives (components/ui) and feature components
  db/             Drizzle schema, client, startup migrations
  lib/            auth, permissions, recipes, scaler, Markdown/ZIP export, AI import
  messages/       en / fr translations
drizzle/          SQL migrations
e2e/              Playwright tests
```

## CI/CD

`.github/workflows/ci.yml` runs on every push and pull request: lint, typecheck, unit and database tests (against a PostgreSQL service), production build and Playwright tests. On `main` and on `v*` tags it then builds a multi-arch (amd64/arm64) image and pushes it to GHCR as `latest`, `sha-<commit>` and, for tags, the semver version.
