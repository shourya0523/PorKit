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
# Fill secrets (see below). Neon can be provisioned via Neon console/MCP.
pnpm --filter @porkit/shared build
pnpm db:push          # after DATABASE_URL(_UNPOOLED) is set
pnpm dev
```

`.env.local` and `.env` are gitignored. Never commit live keys.

Without Clerk/Stripe/GitHub/Inngest credentials the app still boots: Clerk middleware is a no-op when keys are missing, dashboard APIs use identity `local-dev-user`, and content uses the in-memory store unless `DATABASE_URL` is set (then the Drizzle/Neon adapter is used).

### Required env vars

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | [Neon console](https://console.neon.tech) → project → Connection details (pooled vs direct) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | [Clerk](https://dashboard.clerk.com) → API Keys |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_PAID` | [Stripe](https://dashboard.stripe.com/test/apikeys) + Webhooks endpoint for `/api/stripe/webhook` |
| `GITHUB_APP_*` / `NEXT_PUBLIC_GITHUB_APP_SLUG` | [GitHub Apps](https://github.com/settings/apps) — App ID, private key PEM, client id/secret, webhook secret |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | [Inngest](https://app.inngest.com) → Manage → Keys (or `npx inngest-cli@latest dev` locally) |
| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | Provider dashboard — needed for production LLM import/enrichment |

See `.env.example` for the full list and placeholder shapes.

### Secrets checklist

1. **Neon** — create a project, copy pooled + unpooled URLs into `.env.local`, run `pnpm db:push`.
2. **Clerk** — create an application, paste publishable + secret keys; set sign-in/up URLs as in `.env.example`.
3. **Stripe** — test mode keys; add webhook to `https://<host>/api/stripe/webhook` and paste signing secret. Paid claims require `STRIPE_WEBHOOK_SECRET` (unsigned stubs are rejected in production).
4. **GitHub App** — permissions for repo metadata; webhook → `/api/github/webhook` with `GITHUB_APP_WEBHOOK_SECRET`.
5. **Inngest** — sync functions at `/api/inngest`.
6. **LLM** — optional until AI enrichment / structured import is enabled.

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
