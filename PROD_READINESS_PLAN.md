# Production Readiness Implementation Plan

This living document tracks work to harden and prepare the app for production. I will update statuses and notes as changes land.

## Goals
- Reduce security risk (headers, secrets, rate limiting, logs).
- Improve reliability (build/runtime hardening, health checks).
- Add observability (errors, logging, monitoring).
- Establish quality gates (lint, type-check, CI, tests).
- Baseline SEO/ops artifacts (robots, sitemap, caching).

## Current State (Summary)
- Next.js 14 App Router, NextAuth credentials, Prisma/Postgres, Docker/compose.
- Minimal `next.config.mjs`, minimal ESLint, no CI, no tests.
- Sensitive console logs in auth/middleware; default password hashes in schema.
- No security headers, rate limiting, error pages, or monitoring.

## Workstreams and Tasks

### 1) Security Hardening
- Remove sensitive logs or gate logs by `NODE_ENV`.
- Add security headers via `next.config.mjs` `headers()`:
  - Content-Security-Policy, Referrer-Policy, X-Content-Type-Options, Permissions-Policy, Strict-Transport-Security, Frame-ancestors.
- Add basic auth rate limiting (middleware or edge-friendly store).
- Replace hardcoded DB creds in compose with env variables and strong secrets.
- Remove default password hashes from Prisma schema; seed by hashing at runtime. (Completed)
- Validate environment variables at startup (zod schema, separate server/client).
- Ensure `NEXTAUTH_SECRET` required in prod and documented.

### 2) Build and Runtime
- Convert Dockerfile to multi-stage; run as non-root and set `NODE_ENV=production`.
- Build-time: install deps, `prisma generate`, `next build`.
- Runtime: copy minimal artifacts (`.next`, `node_modules` prod, `public`, `prisma` client), expose 3000.
- Decide where to run migrations (prefer CI/CD `prisma migrate deploy`).
- Compose: add healthchecks; DB readiness; optional `depends_on` with health.

### 3) Observability and Error Handling
- Add `app/error.tsx` and `app/not-found.tsx` with user-friendly messages.
- Integrate Sentry (server + browser) or alternative; DSN via env.
- Introduce structured logging utility (levels, redact PII).

### 4) Quality Gates and CI/CD
- Add Prettier and align ESLint; format scripts.
- Add GitHub Actions workflow to run:
  - Install with caching.
  - `tsc --noEmit`, `eslint .`, `prisma generate`, `next build`.
  - Optional: unit tests (set up Jest/Vitest as follow-up).
- Optionally push Docker image and deploy (provider-specific to be added later).

### 5) Config and Docs
- Add `.env.example` covering required envs.
- Document setup and deployment in README (local + docker + prod notes).
- Add environment validation module and import in server entry points.

### 6) SEO and Performance Ops
- Add `public/robots.txt`.
- Add sitemap (e.g., next-sitemap) and build script.
- Review `images.remotePatterns` and set caching headers for static assets.

## Initial Tests Added
- env validation schema tests (strict checks for required vars)
- RBAC route access map tests (allow/deny by role and path)
- robots and sitemap route tests (basic contract)

## Deployment: Vercel + Neon (Production)
- Database: Neon (managed Postgres). Use pooled/SSL URL for `DATABASE_URL`.
- Vercel env vars (Production & Preview):
  - `DATABASE_URL` = Neon connection string (e.g. postgresql://.../db?sslmode=require)
  - `NEXTAUTH_SECRET` = long random string
  - `NEXTAUTH_URL` = https://<project>.vercel.app
  - `NEXT_PUBLIC_APP_URL` = https://<project>.vercel.app
  - `SENTRY_DSN` (optional)
- Build on Vercel (temporary): set Build Command to `npm run vercel-build` to run `prisma migrate deploy && prisma generate && next build`.

### GitHub Actions: Production Migrations
- Workflow: `.github/workflows/migrate.yml` runs `npx prisma migrate deploy` on pushes to main.
- Required secret in repo settings → Actions secrets:
  - `PROD_DATABASE_URL` = Neon production connection string
- Recommended: once GitHub Action is confirmed working, switch Vercel Build Command back to `next build` (remove DB dependency at build time).

## Milestones and Acceptance Criteria

- Milestone A: Security foundations
  - Headers applied; no sensitive logs in prod; env validation enforced; secrets not hardcoded.
- Milestone B: Hardened builds
  - Multi-stage Docker image <400MB; runtime as non-root; healthchecks added.
- Milestone C: Observability
  - Error pages exist; Sentry wired; basic structured logs.
- Milestone D: Quality gates
  - CI green on lint, types, build; Prettier enabled; optional smoke tests.
- Milestone E: SEO/ops
  - robots.txt and sitemap present; image/static caching configured.

## Implementation Sequence (Proposed)
1. Security headers + log cleanup + env validation + `.env.example`.
2. Multi-stage Docker + compose healthchecks; move migrations to CI.
3. Error/not-found pages; logging utility; Sentry.
4. Prettier + ESLint tune; GitHub Actions CI.
5. robots.txt, next-sitemap, caching headers.

## Required Environment Variables (initial)
- NEXTAUTH_SECRET
- DATABASE_URL
- SENTRY_DSN (optional)
- NEXT_PUBLIC_APP_URL (for callbacks, sitemap)

## Risks/Notes
- Credentials provider with role input increases enumeration surface; consider unified user table or server-side resolution.
- Rate limiting storage choice must be deploy-target friendly (e.g., Upstash Redis for edge or in-VM token bucket for Node runtime).
- Ensure Prisma client bundling works in multi-stage Docker (copy schema and client).

## Tracking Table
- Security headers: Completed
- Log cleanup: Completed
- Env validation: Completed
- `.env.example`: Completed
- Docker multi-stage: Completed
- Compose healthchecks: Completed
- Error/not-found pages: Completed
- Sentry + logging: Completed
- Prettier + ESLint: Completed
- GitHub Actions CI: Completed
- robots.txt + sitemap: Completed
- Static/image caching: Completed
