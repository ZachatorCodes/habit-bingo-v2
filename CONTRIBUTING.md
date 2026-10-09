# Contributing

Habit Bingo is built like a product team would build it: small user stories, test-driven
development, pull requests, and green CI before anything reaches `main`.

## Workflow (GitHub Flow)

1. Pick an issue (a user story) from the current milestone.
2. Branch from an up-to-date `main`:
   `feat/…` (features), `fix/…` (bugs), `chore/…` (tooling), `ci/…`, `docs/…`.
3. Work in small commits using [Conventional Commits](https://www.conventionalcommits.org/):
   `feat: …`, `fix: …`, `chore: …`, `docs: …`, `test: …`, `refactor: …`, `ci: …`.
4. Open a PR using the template. CI runs and Vercel posts a preview URL.
5. Squash-merge once all required checks pass. The PR title becomes the commit message, so it must
   also be a Conventional Commit.

`main` is protected: no direct pushes, required checks must pass, history stays linear.

Releases are automatic: release-please keeps a "Release v…" PR open with the changelog. Merging it
tags the release.

## Test-driven development

Every behavior follows red → green → refactor:

1. Write a failing test for one behavior.
2. Run it and watch it fail for the expected reason.
3. Write the minimum code that makes it pass.
4. Refactor with the tests green, then commit.

Issue acceptance criteria are written as Given / When / Then and map one-to-one to tests.

| Level       | Tool                                   | Lives in                      | Run                           |
| ----------- | -------------------------------------- | ----------------------------- | ----------------------------- |
| Unit        | Vitest (`server` project)              | `src/**/*.spec.ts`            | `npx vitest --project server` |
| Integration | Vitest + PGlite (in-memory Postgres)   | `src/lib/server/**/*.spec.ts` | `npx vitest --project server` |
| Component   | Vitest browser mode (`client` project) | `src/**/*.svelte.spec.ts`     | `npx vitest --project client` |
| End-to-end  | Playwright (phone + desktop)           | `e2e/*.e2e.ts`                | `npm run test:e2e`            |

The pure game rules in `src/lib/game` require 100% branch coverage (`npm run test:coverage`).

## Definition of done

- Acceptance tests pass and CI is green.
- Checked on the preview deploy on a phone.
- Code reviewed.
- Accessibility checked: keyboard, labels, contrast, reduced motion.
- Docs updated (README, ADRs in `docs/adr/`, spec) where behavior or decisions changed.

## Local setup

See the [README](README.md#getting-started).
