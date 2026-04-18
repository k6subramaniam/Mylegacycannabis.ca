# Security Review Checklist — Mylegacycannabis.ca

> This checklist MUST be completed for any PR that touches: authentication,
> admin routes, payment/order processing, user data, or environment configuration.
> Reference: PR #14 post-mortem (37 admin routes exposed via publicProcedure)

## Pre-Merge Security Gate

### A. Route & Authorization Security

- [ ] **All admin routes use `adminProcedure`** — no admin-prefixed tRPC
      routes use `publicProcedure` or `protectedProcedure`
- [ ] **All authenticated-user routes use `protectedProcedure`** — cart,
      orders, profile, ID verification
- [ ] **Only truly public routes use `publicProcedure`** — product listing,
      store info, health check
- [ ] **No new Express routes bypass tRPC middleware** — check `customAuth.ts`
      and `verifyRoutes.ts` for unguarded `app.get()`/`app.post()` calls
- [ ] **Role escalation check** — verify no user-facing endpoint can modify
      the `role` field in the users table

### B. Authentication & Session Security

- [ ] **OTP/session tokens are not logged in production** — check
      `console.log` statements in `customAuth.ts` and `emailService.ts`
- [ ] **Session cookies have Secure, HttpOnly, SameSite=Strict** flags
- [ ] **Google OAuth callback validates `state` parameter** to prevent CSRF
- [ ] **Rate limiting is applied** to all OTP endpoints (`express-rate-limit`)
- [ ] **JWT secrets are sourced from environment variables only** —
      grep for hardcoded strings in `jose` imports

### C. Data Protection & Input Validation

- [ ] **All user inputs validated via Zod schemas** (`server/validation.ts`) —
      no raw `req.body` usage
- [ ] **SQL injection check** — all database queries use Drizzle ORM
      parameterized queries, no raw SQL string concatenation
- [ ] **File uploads validated** — check `multer` config for file size limits,
      allowed MIME types, and path traversal prevention
- [ ] **No PII in client-side localStorage** beyond session token — check
      `AuthContext.tsx` and `CartContext.tsx`
- [ ] **ID verification images** stored securely with access control
      (not publicly accessible URLs)

### D. Environment & Secrets

- [ ] **No secrets committed to the repository** — check for API keys,
      database URLs, SMTP passwords in any `.ts`, `.tsx`, `.mjs` files
- [ ] **`.env` is in `.gitignore`** (confirmed)
- [ ] **Environment variables used for all sensitive config**:
      DATABASE_URL, SMTP_PASS, GOOGLE_CLIENT_SECRET, TWILIO_AUTH_TOKEN,
      JWT_SECRET, OWNER_OPEN_ID
- [ ] **No `console.log` of sensitive environment variables** in production paths

### E. Dependency Security

- [ ] **`pnpm audit --prod`** returns no HIGH or CRITICAL vulnerabilities
- [ ] **Check `pnpm.overrides`** in package.json — verify overrides are
      for legitimate security patches (currently: fast-xml-parser, qs, nanoid)
- [ ] **No deprecated packages** with known CVEs in direct dependencies

### F. Infrastructure & Docker

- [ ] **Dockerfile uses multi-stage build** — production image has no
      devDependencies (confirmed)
- [ ] **Container runs as non-root user** — add `USER node` in Dockerfile
      (CURRENTLY MISSING — recommend adding)
- [ ] **No sensitive files copied into Docker image** — verify `.dockerignore`
      excludes `.env`, `*.pem`, test fixtures with real data
- [ ] **Railway environment variables are set as secrets**, not in code

## Severity Classification

| Severity          | Response Time       | Example                                       |
| ----------------- | ------------------- | --------------------------------------------- |
| **P0 — Critical** | Fix within 4 hours  | Admin routes unprotected (PR #14)             |
| **P1 — High**     | Fix within 24 hours | Hardcoded secrets, XSS vulnerability          |
| **P2 — Medium**   | Fix within 1 sprint | Missing rate limiting, verbose error messages |
| **P3 — Low**      | Fix in next release | Formatting issues, non-critical dep updates   |
