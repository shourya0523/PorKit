# Known Residuals — feat/porkit-portfolio-cms

Source: ce-work shipping gate (ce-code-review full multi-persona path deferred; gh unauthenticated). Manual diff scan after U1–U7 land.

## Cleared (2026-07-21)

1. **P1 — Authz on local API routes** — ✅ Dashboard mutation APIs resolve identity via `requireClerkUserId()` (Clerk session). Body/query `clerkUserId` is no longer trusted. Without Clerk env, fixed `local-dev-user` for local smoke only. Middleware protects dashboard + mutation routes; Stripe/GitHub webhooks stay public and signature-verified.
2. **P1 — Stripe webhook signature** — ✅ `constructStripeEvent` / `stripe.webhooks.constructEvent` required when `STRIPE_WEBHOOK_SECRET` is set. Production refuses unsigned webhooks if secret is missing. Local stub remains for tests only.
3. **P2 — Persistence adapter** — ✅ `createDrizzleStore` + `getStore()` swaps to Neon when `DATABASE_URL` is set. Memory store retained for unit tests / offline. Run `pnpm db:push` after wiring Neon.
4. **P2 — GitHub webhook / docx extract** — ✅ GitHub webhook verifies `x-hub-signature-256` when `GITHUB_APP_WEBHOOK_SECRET` is set. Import API extracts `.docx` via mammoth; PDF still needs a dedicated extractor.

## Still open (accepted / blocked on credentials)

1. **P2 — Live GitHub App OAuth + LLM structuring** — Inngest hooks are in place; wire App credentials + OpenAI/Anthropic for production parity. Heuristic text parsing remains the offline path.
2. **P2 — PDF extract** — Docx/txt supported; PDF returns a clear 400 until a PDF library is added.
3. **P3 — Clerk middleware skip** — When Clerk keys are missing, middleware is a no-op so unsigned `/dashboard` is reachable locally. Expected for greenfield smoke without credentials.

## Coverage

- Automated: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm --filter @porkit/web build`.
- Manual Clerk sign-in / Stripe checkout / GitHub App install / 15-minute smoke — blocked on remaining third-party credentials (see README secrets checklist). Neon project can be wired via `.env.local`.
