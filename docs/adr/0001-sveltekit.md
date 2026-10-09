# 1. SvelteKit for the web app

- Status: accepted
- Date: 2026-10-09

## Context

v2 is a ground-up rebuild whose top priorities are a satisfying, animated UI; a small, clean
codebase; and learning a new stack. It is a website used on phones and desktops, needs server
rendering for SEO, and is deployed to Vercel.

Options considered: SvelteKit, Next.js (the v1 stack), and a Vite React SPA with Supabase.

## Decision

Use SvelteKit (Svelte 5, runes) with TypeScript in strict mode.

## Consequences

- Built-in transitions and springs make the "Pop & burst" check-ins and bingo celebrations cheap
  to build without an animation library.
- Less code per component than React, which serves the "tight core" goal.
- Form actions and load functions give progressive enhancement and server rendering by default.
- Smaller ecosystem than React; Bits UI covers the accessible primitives we need.
- SvelteKit 3 is new: configuration lives in `vite.config.ts` and env vars in `src/env.ts`.
