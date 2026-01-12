# Offline PWA + Sync Plan

## 0. Objectives

- Add **offline capability** to the School Management System via a **Progressive Web App (PWA)** front-end.
- Use a **local offline-first database** in the browser (per device) that periodically **syncs** with the hosted Postgres DB.
- Prioritize a clear, incremental rollout that doesn’t destabilize the current production app.

---

## Implementation Status (2026-01-07)

- **Phase 1 – PWA shell**
  - **Implemented**:
    - `public/manifest.json` added and referenced via `metadata.manifest` in `src/app/layout.tsx`.
    - `public/sw.js` added with basic shell caching (root, favicon, logo) and no `/api` interception.
    - Service worker registration implemented in `src/hooks/useServiceWorkerRegistration.ts` and wired via `Providers`.
- **Phase 2 – Read-only offline data (admins first)**
  - **Implemented (current scope)**:
    - Generic IndexedDB-backed cache module at `src/lib/offlineCache.ts`.
    - Read-only offline fallback wired for admin-focused list hooks (via React Query + IndexedDB):
      - `useStudents`, `useTeachers`, `useClasses`, `useParents`.
      - `useFees`, `usePayments`.
      - `useSubjects`, `useEvents`, `useAnnouncements`.
      - `useLessonsList`, `useExamsList`, `useAssignmentsList`, `useAttendanceList`, `useResultsList`.
    - Behavior: after a successful online load, subsequent network failures for these queries fall back to cached data in IndexedDB (within the same browser profile).
- **Phase 3 – Finance offline writes + sync (payments)**
  - **Implemented**:
    - Offline write queue for payments backed by IndexedDB (`src/lib/financeOfflineQueue.ts`).
    - Idempotent payments API using a `clientRequestId` and `createdFromOffline` flags.
    - `useCreatePayment` wired to enqueue offline payments with optimistic UI updates.
    - `useFinanceSync` hook to replay queued payment operations when connectivity is restored, plus an admin-only offline diagnostics view at `/finance/offline` that surfaces failed payment, attendance, and results sync items with row-level manual retry.
- **Phase 4 – Sync infrastructure (bootstrap, changes, background refresh)**
  - **Implemented (v1)**:
    - Read-side sync endpoints:
      - `GET /api/sync/bootstrap` – returns a school- and role-scoped snapshot of core roster/timetable entities (classes, students, lessons, subjects, teachers).
      - `GET /api/sync/changes` – returns the same scoped snapshot and parses a `since` parameter; currently still returns a full snapshot because core roster models do not yet expose `updatedAt`.
    - Client-side sync utilities:
      - `src/lib/offlineSyncClient.ts` – runs bootstrap and changes sync, stores raw payloads plus the last sync timestamp in IndexedDB.
      - `src/lib/offlineSyncHydrator.ts` – hydrates the latest bootstrap snapshot into per-entity caches in IndexedDB (students, teachers, classes, subjects, lessons).
      - `src/hooks/useBackgroundSync.ts` – background hook that performs an initial bootstrap (if needed) and then periodic changes sync on the client, tracking `lastSync`, `isSyncing`, and `error` state.
- **Phase 5 – Attendance offline writes + sync (teachers/admin)**
  - **Implemented (v1)**:
    - PostgreSQL `Attendance` model extended with `clientRequestId` (unique) and `createdFromOffline` flag for idempotent offline writes.
    - IndexedDB-backed attendance offline queue at `src/lib/attendanceOfflineQueue.ts` for queuing `CREATE_ATTENDANCE` / `UPDATE_ATTENDANCE` operations while offline.
    - `POST /api/sync/attendance` endpoint that accepts batched attendance operations, enforces `attendance.write` permissions and school scoping, and uses `clientRequestId` for idempotent creates.
    - `AttendanceForm` wired to enqueue offline attendance operations when the browser is offline, preserving existing UI and layout.
    - `src/hooks/useAttendanceSync.ts` hook plus global mounting in `src/components/Providers.tsx` to replay queued attendance operations in the background and invalidate attendance list queries.
- **Phase 6 – Results offline writes + sync (assessments)**
  - **Implemented (v1)**:
    - PostgreSQL `Result` model extended with `clientRequestId` (unique) and `createdFromOffline` flag for idempotent offline writes.
    - IndexedDB-backed results offline queue at `src/lib/resultsOfflineQueue.ts` for queuing `CREATE_RESULT` / `UPDATE_RESULT` operations while offline.
    - `POST /api/sync/results` endpoint that accepts batched result operations, enforces appropriate permissions and school scoping, and uses `clientRequestId` for idempotent creates.
    - `ResultForm` wired to enqueue offline result operations when the browser is offline, preserving existing UI and layout.
    - `src/hooks/useResultsSync.ts` hook plus global mounting in `src/components/Providers.tsx` to replay queued result operations in the background and invalidate results list queries.
- **Phase 7 – Assignments offline writes + sync (assessments metadata)**
  - **Implemented (v1)**:
    - PostgreSQL `Assignment` model extended with `clientRequestId` (unique) and `createdFromOffline` flag for idempotent offline writes.
    - IndexedDB-backed assignments offline queue at `src/lib/assignmentsOfflineQueue.ts` for queuing `CREATE_ASSIGNMENT` / `UPDATE_ASSIGNMENT` operations while offline.
    - `POST /api/sync/assignments` endpoint that accepts batched assignment operations, enforces `assignments.write` permissions and school scoping via `getCurrentSchoolContext`, and uses `clientRequestId` for idempotent creates.
    - `AssignmentForm` wired to enqueue offline assignment create/update operations when the browser is offline, preserving existing UI and server action behavior for online submissions.
    - `src/hooks/useAssignmentsSync.ts` hook plus global mounting in `src/components/Providers.tsx` to replay queued assignment operations in the background and invalidate `["assignments"]` React Query caches so lists refresh after successful sync.
    - `useAssignmentsList` already participates in the generic read-only offline cache via `offlineCache` (see Phase 2), so list views benefit from both offline reads and background write sync.
- **Other later phases** (broader monitoring/metrics and potential expansion to additional modules) remain **planned** but not yet implemented.

## 1. Scope and Assumptions

### 1.1 Initial Offline Scope (v1)

- **Primary users (v1)**: Admins using Chrome/Chromium-based browsers on desktop or Android.
- **Planned extension**: Teachers for attendance/results once sync endpoints and outbox are implemented.
- **Features to support offline in v1** (candidate set):
  - View classes, students, timetable / lessons.
  - Record **attendance** while offline.
  - Optionally enter **continuous assessment / marks** offline.

- **Non-goals for v1**:
  - Offline M-Pesa payments.
  - Offline SMS sending.
  - Complete offline coverage of all modules (start with focused flows).

### 1.2 Intentionally online-only areas (v1)

The following categories are **kept online-only by design** in v1, even though the app supports offline caching elsewhere:

- **Messaging / communication** (`useMessages`, `useMessageRecipients`, list/messages pages)
  - Messages are time-sensitive and conversational. Stale local copies can be misleading (e.g. “sent” vs actually delivered/read), and conflict handling is non-trivial.

- **Audit and monitoring** (`useAuditLogs` and related views)
  - Audit logs should reflect the server’s exact truth. Caching them locally risks admins acting on out-of-date compliance / security information.

- **Fee configuration and structures** (`useFeeCategories`, `useClassFeeStructures`)
  - Configuration is changed infrequently and usually from stable connections (office desktops). Offline support here adds complexity with low practical benefit.

- **Per-student finance summaries** (`useStudentFees`, `useStudentFeesByStudent`, `useMyStudentFees`, `useMyStudentFeesSummary`)
  - Summaries are derived from underlying fees/payments, which are already cached. Keeping these UIs online-only avoids duplication and stale aggregates while still benefiting from cached base data.

- **Learning observations and similar extras** (`useLearningObservations`)
  - Nice-to-have for offline in a later phase, but not critical to the initial offline rollout.

These areas can be reconsidered in a **v2** once the core offline flows (lists, attendance, assessments, finance) have proven stable in production.

### 1.3 Device and Browser Assumptions

- Modern browsers supporting PWA + IndexedDB:
  - Chrome / Edge on desktop.
  - Chrome / Chromium-based browsers on Android.
- iOS Safari PWA support is possible but has stricter limits; treat as v2.

---

## 2. High-Level Architecture

### 2.1 PWA Shell

- **Web app manifest** (`public/manifest.json`):
  - App name, short name.
  - Icons for various sizes.
  - `start_url` (e.g. `/`), `display: "standalone"`.
  - Theme and background colors.

- **Service worker**:
  - Registered from the client (e.g. in a client-only component or a small bootstrap script).
  - Responsible for:
    - Caching static assets and the app shell (JS, CSS, icons, fonts).
    - Optionally caching selected API responses.
    - Detecting online/offline events and triggering sync.

- **Next.js integration options**:
  - Use a PWA helper (e.g. `next-pwa`) configured in `next.config.mjs`, or
  - Custom service worker + manual registration.

### 2.2 Local Offline Database

- **Storage backend**: IndexedDB, wrapped by a TypeScript-friendly library (e.g. Dexie) or a custom typed wrapper.
- **Local DB schema (per device)**: subset of server models, e.g.:
  - `local_classes`: id, name, grade, etc.
  - `local_students`: id, name, classId, etc.
  - `local_lessons`: timetable entries.
  - `local_attendance`: records (local + synced).
  - `sync_outbox`: queued mutations awaiting sync.

- **Responsibilities**:
  - Provide fast offline reads for scoped data.
  - Track unsynced changes and sync status per record or per operation.

---

## 3. Sync Model

### 3.1 Overview

- Use **operation-based sync for writes** and **incremental pull for reads**.
- Each browser/device maintains its own local DB and **outbox**.

### 3.2 Write Direction (Local → Server)

1. **Offline actions** (e.g. marking attendance):
   - UI updates local IndexedDB immediately (optimistic update).
   - A corresponding **operation** is appended to the `sync_outbox`, e.g.:
     - `{ id, type: "attendance.mark", payload: {...}, createdAt, userId, status: "pending" }`.

2. **When online** (detected by service worker / app):
   - Batch-push pending operations to dedicated sync endpoints, e.g.:
     - `POST /api/sync/attendance`
     - `POST /api/sync/results`
   - Attach metadata:
     - Auth (session cookie / token).
     - Client-generated IDs where needed.
     - Timestamps.

3. **Server behavior** (Next.js API + Prisma):
   - Validate auth and authorization.
   - Apply each operation in a **transaction**:
     - Insert/update attendance or result rows.
     - Update `updatedAt` and other derived fields.
   - Return per-operation statuses:
     - `success`, `rejected`, `conflict`, plus any corrected data.

4. **Client reconciliation**:
   - Mark successful operations as `synced` and remove them from the outbox.
   - Apply corrections returned by the server to local DB.

### 3.3 Read Direction (Server → Local)

1. **Initial sync** when user logs in or installs the PWA:
   - Call pull endpoints, e.g.:
     - `GET /api/sync/bootstrap?role=TEACHER`
   - Return initial snapshots for:
     - Relevant `classes`, `students`, `lessons`, and possibly recent `attendance`.
   - Store these in local IndexedDB.

2. **Incremental sync**:
   - Track `lastSyncedAt` per table or globally.
   - Periodically call endpoints such as:
     - `GET /api/sync/changes?since=2026-01-05T08:00:00Z`
   - Backend queries Prisma models using `updatedAt > since`:
     - Returns changed/new rows.
   - Client merges changes into local DB.

3. **Deletions**:
   - Initially, focus on add/update flows.
   - For deletions, introduce a `deletedAt` column where needed and treat records with `deletedAt != null` as deleted on the client.

---

## 4. Backend Changes (Next.js + Prisma)

### 4.1 New Sync API Endpoints

Add a small, explicit sync surface; do **not** start by making every existing endpoint offline-aware.

- **Implemented (read-side, v1)**:
  - `GET /api/sync/bootstrap` – returns an initial, school- and role-scoped snapshot for the logged-in user (classes, students, lessons, subjects, teachers).
  - `GET /api/sync/changes` – accepts an optional `since` query parameter and returns a school- and role-scoped snapshot for the same entities. For now, because core roster/timetable models do not yet expose `updatedAt`, this endpoint still returns a full scoped snapshot rather than a minimal diff; once `updatedAt` is available, it can be extended to only return rows with `updatedAt > since`.

- **Implemented (write-side, attendance, v1)**:
  - `POST /api/sync/attendance` – accepts batched offline attendance operations (create/update), validates `attendance.write` permissions, enforces school scoping based on `getCurrentSchoolContext`, and uses `clientRequestId` / `createdFromOffline` on the `Attendance` model for idempotent offline writes.

- **Implemented (write-side, assessments, v1)**:
  - `POST /api/sync/results` – accepts batched offline assessment operations for results, paired with `src/lib/resultsOfflineQueue.ts`, `src/hooks/useResultsSync.ts`, and global mounting in `src/components/Providers.tsx` to replay queued result operations in the background.

Each sync endpoint should:

- Use existing auth/role checks.
- Filter data by the users scope (e.g. teacher only sees own classes).
- Wrap DB changes in transactions.

### 4.2 Data Model Considerations

Most relevant models already have `createdAt` / `updatedAt`, which simplifies incremental sync:

- `Attendance` (date, studentId, lessonId, createdAt, etc.).
- `Lesson`, `Class`, `Student` and related models.

Potential future refinements:

- Add `deletedAt` to models where soft-deletion is needed.
- Add explicit `version` columns if we later want more nuanced conflict resolution.

### 4.3 Conflict Handling Strategy (v1)

- **Simple rule**: server is source of truth.
- If two teachers modify the same record in conflicting ways:
  - Prefer **last-write-wins** based on `updatedAt` for v1.
  - Optionally log conflicts for review.
- For high-risk flows (e.g. marks overrides), surface conflicts in UI later (v2).

---

## 5. Front-End Changes (Next.js App Router)

### 5.1 PWA Integration Steps

1. **Add manifest** in `public/` and reference it in `app/layout.tsx`:
   - `<link rel="manifest" href="/manifest.json" />`.
   - Add basic meta tags for theme color, app name.

2. **Add service worker registration**:
   - Client-only bootstrap that registers `/sw.js` when supported.
   - Handle install/activate events in the service worker.

3. **Caching strategy**:
   - Precache shell assets (Next-generated JS/CSS, fonts, icons).
   - Use `stale-while-revalidate` for static assets.
   - For sync-related API routes, rely more on local DB than on HTTP cache.

### 5.2 Local DB Integration in UI

- Introduce a **data access layer** on the client:
  - Abstracts over IndexedDB + network.
  - Exposes hooks like `useOfflineStudents`, `useOfflineLessons`, `useOfflineAttendance`.
- For targeted pages (e.g. teacher attendance view):
  - On mount:
    - Read from local DB to show data instantly.
    - If online, trigger a background sync.
  - On actions (mark attendance):
    - Update local DB immediately.
    - Append operation to outbox.
    - Trigger sync when online.

### 5.3 Connectivity Awareness in UI

- Implement connectivity indicator (non-intrusive):
  - Show online/offline status in a subtle part of the layout.
- For actions:
  - If offline, show a note: Saved offline  will sync when online.
  - If sync fails, surface an error badge for affected items.

---

## 6. Security and Privacy

- **Auth tokens / sessions**:
  - Rely on existing NextAuth session cookies.
  - Ensure service worker-proxied requests maintain cookies as needed.

- **Local data**:
  - Stored on device in IndexedDB.
  - Contains potentially sensitive student/attendance data.
  - Communicate to schools that devices should be protected (lock screen, user accounts).

- **Sync endpoints**:
  - Validate user roles for every operation.
  - Avoid returning more data than needed (only teachers classes, etc.).

---

## 7. Rollout Plan

### Phase 1 – Foundations

- Add manifest and basic service worker (no local DB yet):
  - App becomes installable and has basic offline shell for static pages.
- Ensure production deployment still passes all tests and health checks.

### Phase 2 – Read-Only Offline Data

- Implement IndexedDB schema.
- Add `bootstrap` + `changes` endpoints.
- For selected views (e.g. teacher dashboard):
  - Load from local DB when offline.
  - Populate initial cache from server when online.

### Phase 3 – Offline Writes for Attendance

- Add `sync_outbox` table in local DB.
- Implement `POST /api/sync/attendance`.
- Wire attendance UI to write to local DB + outbox and sync when online.
- Add basic conflict handling (last-write-wins) and error surfaces.

### Phase 4 – Extend to Assessments (Optional)

- Mirror Phase 3 for assessment results.
- Introduce more advanced conflict handling if needed.

### Phase 5 – Monitoring and Hardening

- Add Sentry logging for sync failures.
- Add metrics/logs to see:
  - Offline usage frequency.
  - Sync success/failure rates.

---

## 8. Acceptance Criteria (v1)

- App is installable as a PWA on supported browsers.
- No regression to existing online-only behavior for any role.

### 8.1 Teacher offline acceptance tests

For a user with the **teacher** role:

- **Initial online usage**
  - Can log in and open the dashboard.
  - Can view own timetable/classes while online.
  - Can mark attendance for their lessons while online and see results reflected in existing reports.

- **Offline behavior**
  - After an initial online session, can reopen the app while offline and still view timetable/classes from cached data (no hard failures).
  - While offline, can open the attendance view and record attendance for a lesson without network errors.

- **Sync back to server**
  - After going back online, previously queued offline attendance operations are replayed automatically (or via background sync) without user intervention.
  - The updated attendance is visible in the main hosted system (e.g. admin views or teacher reports) once sync completes.
  - No duplicate or out-of-scope attendance rows are created for other schools/classes.

### 8.2 Accountant offline acceptance tests

For a user with the **accountant** role:

- **Initial online usage**
  - Can log in and open the finance dashboard or payments screen.
  - Can view recent finance data (fee structures, student balances, payments lists) while online.
  - Can record a payment while online and see it reflected in existing finance reports.

- **Offline behavior**
  - After an initial online session, can reopen key finance list views while offline (e.g. payments list) and see cached data without hard failures.
  - While offline, can enter a new payment and submit the form without network errors; the UI indicates the payment has been queued and will sync when online.

- **Sync back to server**
  - After going back online, previously queued offline payment operations are replayed automatically by the background sync hook.
  - Payments entered offline appear in the main hosted system with correct amounts and student associations, without creating duplicates.
  - Any failed payment syncs are visible in the finance offline diagnostics view so an accountant/admin can review and retry.

### 8.3 Admin offline acceptance tests

For a user with the **admin** role:

- **Initial online usage**
  - Can log in and open the main dashboard.
  - Can view core rosters and timetable data (students, teachers, classes, lessons) while online.
  - Can access attendance, assessment (results/assignments), and finance views and perform normal online operations there.

- **Offline behavior**
  - After an initial online session, can reopen the app while offline and still view key administrative lists (e.g. students, teachers, classes, lessons, assignments, attendance, results, payments) from cached data without hard failures.
  - While offline, can:
    - Record attendance or assessment results/assignments using the existing forms, which queue operations instead of failing on network errors.
    - Record payments where permitted, with the UI indicating that writes are queued for sync.

- **Sync back to server**
  - After going back online, previously queued offline operations (attendance, results, assignments, payments) are replayed automatically by their respective background sync hooks.
  - The updated data is visible across admin reports and lists once sync completes, without introducing duplicates or cross-school leakage.
  - Admins can use the offline diagnostics views (e.g. finance offline diagnostics) to inspect failed operations and retry as needed.
