# 2. Drizzle ORM on Neon Postgres, PGlite for tests

- Status: accepted
- Date: 2026-10-09

## Context

The game is relational (users, habits, cards, squares, check-ins, groups) and needs transactions
and unique constraints as the source of truth for concurrency. We want fast integration tests that
run on Windows without Docker, and an isolated database per pull-request preview.

## Decision

- Postgres hosted on Neon, with a database branch per Vercel preview deployment.
- Drizzle ORM with Drizzle Kit SQL migrations committed to `drizzle/`.
- Production driver: `@neondatabase/serverless` `Pool` (`drizzle-orm/neon-serverless`), which
  supports transactions.
- Tests: PGlite, a real Postgres compiled to WebAssembly running in-process, with the same
  migrations applied.

## Consequences

- No ORM engine binary (a recurring Windows pain point in v1).
- Integration tests run in seconds with no external services.
- Services take a `Db` type that both drivers satisfy, so tests exercise the same code paths.
- PGlite is not byte-for-byte Neon; anything Neon-specific must be covered by the preview deploy.
