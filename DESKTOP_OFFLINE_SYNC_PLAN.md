# Desktop Offline/Online Sync Plan

This document tracks the incremental steps toward **full offline/online sync** for the Windows desktop (Electron + SQLite) app.

## Phase 0 – Baseline (current status)
- Electron shell runs embedded Next.js server.
- Dual Prisma schemas:
  - Postgres (`prisma/schema.postgres.prisma`) for web.
  - SQLite (`prisma/schema.sqlite.prisma`) for desktop.
- Desktop currently still uses **Postgres** via `.env.desktop`.

**Goal:** Confirm the desktop runtime can cleanly switch to SQLite without changing application code.

---

## Phase 1 – One-time Postgres → SQLite snapshot
- Implement a Node/TS import path that:
  - Connects to **Postgres** (cloud) using the Postgres Prisma client.
  - Connects to **SQLite** (local file) using the SQLite Prisma client.
  - Copies data in dependency order while preserving IDs.
- Run import from the desktop environment (Electron or CLI) while online.
- Add a small `Meta`/`Settings` row in SQLite to mark `initial_import_done`.

**Exit criteria:**
- `eacts-desktop.db` contains a consistent snapshot of the school’s data.
- Subsequent desktop runs detect that initial import is done and do not re-import.

---

## Phase 2 – Switch desktop reads/writes to SQLite
- Change `.env.desktop` to point `DATABASE_URL` at `file:./eacts-desktop.db`.
- Ensure Electron production startup runs Prisma migrations for SQLite on first run if needed.
- Verify full app flows (login, admin dashboard, finance, attendance, exams) work **fully offline** using only SQLite.
- Introduce a **runtime-aware repository layer** that can switch between Postgres (Prisma) and SQLite (`better-sqlite3`) for selected views without changing UI code.
- First iteration (implemented):
  - `studentsRepository` backing `GET /api/students` (admin students list).
  - `teachersRepository` backing `GET /api/teachers` (admin teachers list).
  - `parentsRepository` backing `GET /api/parents` (admin parents list).
  - `studentFeesRepository` backing `GET /api/student-fees` (student-fees list by `structureId`).
- In **desktop runtime** (`EACTS_RUNTIME=desktop`), these repositories read from normalized SQLite tables populated by the materialization pipeline, while the web runtime continues to use Postgres via Prisma.
- Current limitation: these repositories are **read-only**; all creates/updates/deletes still go directly to Postgres via existing Prisma-based API routes.

**Exit criteria:**
- Installed desktop app can:
  - Start and operate with **no network connection**.
  - Persist changes to the local SQLite DB.

---

## Phase 3 – Local change tracking (Sync Outbox)
- Introduce a `SyncOutbox` (or equivalent) table in SQLite that records:
  - `id`, `entityType`, `entityId`, `operation` (create/update/delete), `payload`, `createdAt`.
- Route all **server-side mutations** in the desktop app through a central layer that:
  - Applies the mutation to SQLite.
  - Appends an outbox entry describing the change.

**Exit criteria:**
- Every desktop-only mutation is represented as a durable outbox item.
- No sync logic yet; just reliable local tracking.

---

### Phase 3.1 – Parents + Students CRUD (scoped implementation)

Focus: implement **create/update/delete** for **parents and students** in desktop runtime, wired through the Sync Outbox, while keeping the existing web behaviour intact.

- Define strongly-typed outbox payloads for roster entities:
  - `entityType`: `"parent" | "student" | "parent_student"`.
  - `operation`: `"create" | "update" | "delete"`.
  - `payload`: JSON-serialised, strictly-typed TS structures (no `any`).
- Extend normalized SQLite schema (runtime-only) with an `outbox`/`sync_outbox` table:
  - Columns: `id`, `entityType`, `operation`, `payload`, `createdAt`, `syncedAt` (nullable), `status` (`"pending" | "synced" | "failed"`).
  - Not touched by the snapshot/materialization pipeline to avoid losing local mutations.
- Extend `parentsRepository` and `studentsRepository` with **write methods** (desktop-aware):
  - `createParentWithStudent` (linked create following the current UI flow).
  - `updateParent`, `updateStudent` (basic field updates only; no complex cascades in first iteration).
  - `deleteStudent` (and optionally delete parent if they have no remaining students, matching existing web semantics).
- Runtime behaviour:
  - **Web runtime**: existing API routes continue to call Prisma/Postgres directly (no behavioural change).
  - **Desktop runtime**: the same API routes are refactored to delegate to the repositories which:
    - Apply the mutation to SQLite inside a transaction.
    - Insert a corresponding `sync_outbox` record in the same transaction.
- Scope limits for this phase:
  - Only roster entities: `parent` and `student` (and their direct relations such as class and primary parent link).
  - No finance/attendance/exams mutations yet.
  - No automatic server sync; outbox entries simply accumulate as an append-only log.

**Exit criteria:**
- Parent + student creations, updates, and deletions performed in the **desktop app**:
  - Succeed while offline using only SQLite.
  - Are fully represented as durable outbox entries.
- Web runtime behaviour for the same endpoints remains unchanged.

---

## Phase 4 – Online push-only sync (desktop → Postgres)
- Add a sync routine that, when network is available:
  - Reads pending outbox records from SQLite.
  - Calls authenticated cloud APIs (or server routes) to apply changes to Postgres.
  - Marks outbox entries as processed (or deletes them) on success.
- Make sync **idempotent** using patterns already used in the PWA (e.g. `clientRequestId`, `createdFromOffline`).

**Exit criteria:**
- Desktop-originated changes eventually appear in Postgres when the user goes online.
- Re-running sync does not duplicate records.

---

## Phase 5 – Bidirectional sync (desktop ↔ Postgres)
- Extend sync to also **pull** server-side changes:
  - Use `updatedAt`/version columns and a per-device `lastSyncedAt` cursor.
  - Fetch changes per entity scope (school, user role).
- Apply incoming changes into SQLite while:
  - Preserving local IDs.
  - Avoiding duplicate upserts.

**Exit criteria:**
- Desktop periodically converges toward server state while online.
- No data loss on either side in simple concurrent-edit scenarios.

---

## Phase 6 – Conflict resolution & UX
- Define conflict policies per domain (e.g. attendance, payments, roster):
  - "Server wins", "last write wins", or domain-specific merge logic.
- Surface sync status and errors in a dedicated desktop diagnostics view.
- Add retries, exponential backoff, and clear user messaging for failed syncs.

**Exit criteria:**
- Users can trust that offline work is eventually consistent with the server.
- Conflicts are handled predictably with minimal manual intervention.
