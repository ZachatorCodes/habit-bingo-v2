# 6. Server-render public pages with CDN caching instead of prerendering

- Status: accepted
- Date: 2026-10-09

## Context

The spec originally called for prerendered public pages (landing, privacy, terms). On Vercel,
prerendered files are served as static assets and never pass through `hooks.server.ts`, so they
would not receive the security headers or the Content Security Policy header set there.

## Decision

Server-render every page. Public pages set `cache-control: public, max-age=0, s-maxage=3600`, so
Vercel's CDN caches them while every response still flows through one place that sets security
headers.

## Consequences

- One source of truth for security headers on pages, testable locally with `vite preview`.
- Static files (icons, the web manifest, `/_app/immutable/*`) still bypass the hook, so `vercel.json`
  sets the same non-CSP headers for every path. A unit test keeps it in sync with
  `SECURITY_HEADERS`. Static files carry no CSP; they are not HTML documents.
- SEO is unchanged: crawlers receive full HTML either way.
- A cold cache costs one function invocation per hour per page, which is negligible.
- Public pages must not depend on cookies or the signed-in user, or they could not be shared-cached.
