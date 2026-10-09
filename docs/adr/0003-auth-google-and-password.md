# 3. Google sign-in plus username and password, via Better Auth

- Status: accepted
- Date: 2026-10-09

## Context

The audience is an invite-only friend group today, with room to grow. Google sign-in is wanted so
the app can later connect Google Calendar; username and password is wanted for people who prefer
not to use Google. There is no email provider yet.

## Decision

- Better Auth with the Google social provider and the username plugin.
- Passwords hashed with scrypt; Have I Been Pwned check; rate limits and per-username throttling.
- Account creation only through a valid invite, by either method.
- Linking Google to an existing account only from a signed-in session, never by matching emails.
- Password recovery through admin-issued one-time reset links until optional email recovery ships.
- Google Calendar access requested separately, only when the user connects it (M10).

## Consequences

- Sessions live in our own database, so "sign out everywhere" is a delete.
- Storing passwords makes us responsible for hashing, throttling and resets.
- Better Auth's user schema expects an email; password-only users may need a non-routable
  placeholder (decided in the M1 plan).
