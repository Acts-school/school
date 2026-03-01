# Desktop/Electron Implementation Plan

## Decisions

- **Offline DB for desktop:** Prisma with SQLite datasource (keep Postgres for server/web deployment).
- **Repo structure:** Single repo; same Next.js app with multiple deployment flavors (web + Electron desktop).
- **Windows support:** Windows 10 and above.
- **Installer scope:** Per-user install (no admin privileges required) via Electron-based installer.

## High-Level Tasks

1. **Electron Shell & Dev Workflow**
   - Add Electron as a dev dependency.
   - Add `electron-builder` for packaging.
   - Create `electron/main.ts` (Electron main process) that:
     - Starts a local Next.js server in dev and prod.
     - Opens a `BrowserWindow` pointing to `http://127.0.0.1:&lt;port&gt;`.
   - Add `npm` scripts for `electron:dev` and `electron:build`.

2. **Prisma Dual-Environment DB Setup**
   - Prisma does **not** allow using `env()` for the `provider` field.
   - Current state:
     - `schema.prisma` uses a fixed `provider = "postgresql"` and `url = env("DATABASE_URL")`.
     - `.env` supplies the Postgres `DATABASE_URL` for web/server and desktop (for now).
   - Full SQLite support for desktop will require a separate Prisma schema or build-time transformation, which can be designed later.

3. **Desktop Build Pipeline**
   - Configure `electron-builder` (in `package.json` `build` field):
     - `appId`, `productName`.
     - Include `.next`, `public`, `prisma`, `node_modules`, `electron`.
     - Windows `nsis` target for a `.exe` installer.
     - Per-user install settings (no admin, user-level install path, shortcuts).
   - Integrate `next build` + Prisma steps into `electron:build`.

4. **First-Run DB & Migrations**
   - First run for desktop (SQLite):
     - Use a bootstrap step to run `prisma migrate deploy` against SQLite if the DB file does not exist.
     - Optionally run `prisma db seed` when `EACTS_DESKTOP_SEED=1`.

5. **Testing and QA**
   - Verify full offline behavior (no external network required).
   - Test authentication and main flows on Windows 10+.
   - Verify install/uninstall, shortcuts, and data persistence across app restarts.

## Current Status

- [x] Architecture decisions for desktop build (DB, repo, OS, install scope).
- [x] Add Electron shell and dev workflow (dev + prod startup wiring).
- [ ] Refine Prisma configuration to support a true SQLite desktop schema (blocked by provider env limitation).
- [x] Configure `electron-builder` for Windows `.exe` (NSIS, per-user install).
- [x] Implement desktop DB initialization/seed strategy (first-run Prisma migrate deploy + optional seed) — will be updated once SQLite schema is introduced.
- [ ] Run end-to-end tests on Windows 10+.
