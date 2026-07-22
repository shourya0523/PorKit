# Known Residuals — feat/porkit-portfolio-cms

Source: ce-work shipping gate (ce-code-review full multi-persona path deferred; gh unauthenticated). Manual diff scan after U1–U7 land.

## Actionable residuals (accepted)

1. **P1 — Authz on local API routes** — `apps/web/app/api/**` accepts `clerkUserId` from the request body and defaults to `local-dev-user` when Clerk env is absent. Fine for scaffolding; before production, require Clerk session on dashboard APIs and drop body-supplied identity.
2. **P1 — Stripe webhook signature** — `apps/web/app/api/stripe/webhook/route.ts` skips signature verification when `STRIPE_WEBHOOK_SECRET` is unset. Wire `stripe.webhooks.constructEvent` before enabling paid claims.
3. **P2 — Persistence adapter** — Domain logic lives in `apps/web/lib/content/store.ts` (in-memory). Drizzle schema is ready (`drizzle/schema.ts`); Neon-backed repository not yet swapped in. Run `pnpm db:push` after setting `DATABASE_URL` and implement the Drizzle adapter.
4. **P2 — Real GitHub App / LLM / PDF extract** — Inngest functions are durable hooks; résumé structuring uses heuristic text parsing offline. Connect GitHub App credentials, OpenAI/Anthropic, and mammoth/PDF extract for production parity.
5. **P3 — Clerk middleware skip** — When Clerk keys are missing, middleware is a no-op so unsigned `/dashboard` is reachable locally. Expected for greenfield smoke without credentials.

## Coverage

- Automated: `pnpm test` (30 tests), `pnpm typecheck`, `pnpm lint`, `pnpm --filter @porkit/web build` — all green.
- Manual Clerk sign-in / Neon migrate / Stripe checkout / 15-minute smoke — blocked on credentials.
