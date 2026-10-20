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

Open `APP_URL` (default http://localhost:3000) and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. The super admin is created on first start, when the database has no users. From the **Administration** page, create accounts and kitchens, and rename any account (including the first admin); kitchen owners then manage their members. Owners can also create **invite links** from the kitchen settings: whoever opens one creates an account (or signs in) and joins as a member. Each link works once and expires after 24 hours.

Database migrations run automatically when the container starts. Data lives in two volumes: `pgdata` (database) and `uploads` (photos). Back up both.

| Variable | Description |
| --- | --- |
| `APP_URL` | Public URL, used to build share links. Use `https://` to mark the session cookie secure. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credentials of the bundled PostgreSQL. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | First super admin, created only if no user exists. |
| `ANTHROPIC_API_KEY` | Enables AI import. Without it the import button is hidden. |
| `ANTHROPIC_MODEL` | Claude model used for import (default `claude-opus-5-5`). |
| `TIME_ZONE` | Time zone for dates shown in the app, e.g. when a recipe was last made (default `Europe/Paris`). |
| `RECIPES_VERSION` | Image tag to run (default `latest`). |
| `PORT` | Host port (default `3000`). |

Put the app behind a reverse proxy with HTTPS (Caddy, Traefik, nginx…) for anything beyond your local network.

## Self-hosting with Portainer

The same `docker-compose.yml` runs as a Portainer stack.

1. In Portainer, open your environment, go to **Stacks** → **Add stack** and name it `recipes`.
2. Choose a build method:
   - **Repository** (recommended): repository URL `https://github.com/HackJack-101/recipes-v2`, reference `refs/heads/main`, compose path `docker-compose.yml`. Portainer can then redeploy when the file changes.
   - **Web editor**: paste the content of [`docker-compose.yml`](docker-compose.yml) and delete the `build: .` line (there is no source code to build from).
3. Under **Environment variables**, switch to **Advanced mode** and paste your settings, at least:
   ```env
   POSTGRES_PASSWORD=a-long-random-password
   ADMIN_EMAIL=you@example.com
   ADMIN_PASSWORD=another-long-password
   APP_URL=https://recipes.example.com
   ANTHROPIC_API_KEY=
   ```
   Any variable from the table above can be added here. `POSTGRES_PASSWORD` is required; the deploy fails without it.
4. Click **Deploy the stack**, wait for the `db` service to become healthy, then open `APP_URL` and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

To update, open the stack and click **Pull and redeploy** (Repository) or **Update the stack** with **Re-pull image and redeploy** enabled (Web editor). Pin a release instead of `latest` by setting `RECIPES_VERSION` (for example `1.2.0`), or follow releases with `stable`. To redeploy automatically on each release, see [Deploying releases to Portainer](#deploying-releases-to-portainer). The `recipes_pgdata` and `recipes_uploads` volumes are kept across updates; back them up from **Volumes**.

If Portainer's stack sits on a shared network with a reverse proxy (Traefik, Nginx Proxy Manager…), point the proxy at the `app` service on port `3000`, and set `APP_URL` to the public HTTPS address so share links and secure cookies work.

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

| Event | Workflow | Runs |
| --- | --- | --- |
| Pull request | `ci.yml` | Lint, typecheck, unit and database tests (PostgreSQL service), production build, Playwright. Required to merge. |
| Push to `main` | `ci.yml` | The same tests, then a multi-arch (amd64/arm64) image pushed to GHCR as `latest` and `sha-<commit>`. Docs-only changes skip it. |
| Published release (tag `v1.2.0`) | `release.yml` | Image tagged `1.2.0`, `1.2`, `stable` and `sha-<commit>`, then the Portainer deploy. No tests: the commit passed them on its pull request. |
| Published pre-release (`v1.3.0-rc.1`) | `release.yml` | Image tagged `1.3.0-rc.1` and `sha-<commit>` only: no `stable`, no deploy. |

Release tags must be semver (`v1.2.0` or `1.2.0`). Pushing a tag alone builds nothing; publish a release from it.

### Contributing

`main` is protected: changes go through a pull request, the **Lint, test & build** check must pass, and the branch must be up to date with `main`. Rebase your branch rather than merging `main` into it (`git pull --rebase origin main`, or **Update branch** → **Update with rebase** on GitHub). Pull requests are merged with **Squash and merge**, using the pull request's title and description as the commit message, so `main` keeps one commit per change.

### Deploying releases to Portainer

The `deploy` job calls the stack's Portainer webhook (Portainer Business Edition; the free 3-node licence is enough) with `?RECIPES_VERSION=<version>`. Portainer pulls the image and redeploys the stack; the job then polls `APP_URL/api/health` until it reports the new version, and fails after 10 minutes otherwise.

1. In Portainer, open the stack's **Editor** and set the app image to:
   ```yaml
   image: ghcr.io/hackjack-101/recipes-v2:${RECIPES_VERSION:-stable}
   ```
   Remove `RECIPES_VERSION` from the stack's environment variables, so the value sent by the webhook is the one used. A manual redeploy without it runs `stable`, the latest release.
2. Still in the **Editor**, turn on **Create a Stack webhook** and copy its URL.
3. In GitHub, open **Settings** → **Environments** → **New environment** and name it `production`. Optionally add yourself as a required reviewer to approve each deploy.
4. In that environment, add:

   | Name | Kind | Value |
   | --- | --- | --- |
   | `PORTAINER_WEBHOOK_URL` | secret | The webhook URL. Anyone who has it can redeploy the stack. |
   | `APP_URL` | variable | The app's public URL, such as `https://recipes.example.com` (optional: enables the version check) |

If a proxy puts basic auth in front of Portainer, exempt `/api/stacks/webhooks/` from it: the webhook's id is its secret.

To roll back, re-run the `deploy` job of an earlier release.
