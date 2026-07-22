# Por-Kit

Hosted portfolio CMS for developers with an existing React/Next.js site.

Import career data, sync selected GitHub projects, and embed live portfolio content via SDK, public API, or neutral widgets.

## Monorepo

```text
apps/web          Next.js App Router — marketing, docs, dashboard, API
packages/shared   Zod schemas, confidence gate, plan entitlements
packages/sdk      @porkit/sdk React/Next helpers
packages/widget   Neutral projects + experience embeds
drizzle/          Postgres schema (Neon)
```

## Local setup

```bash
corepack enable
pnpm install
cp .env.example .env.local
# Fill DATABASE_URL, Clerk, Stripe, GitHub App, Inngest as available
pnpm --filter @porkit/shared build
pnpm dev
```

Without live credentials the app still boots: Clerk middleware is skipped when keys are missing, and content APIs use an in-memory store for local/demo use. Point `DATABASE_URL` at Neon and run `pnpm db:push` when ready for persistence.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm test` | Workspace unit/integration tests |
| `pnpm typecheck` | TypeScript across packages |
| `pnpm lint` | ESLint |
| `pnpm db:push` | Push Drizzle schema to Neon |
| `pnpm dev` | Next.js dev server |

## Product theme

Pig/barnyard identity is for Por-Kit product surfaces (marketing, docs, dashboard) only. Public API and widget output stay visually neutral.
