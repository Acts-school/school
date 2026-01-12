# User Profile Implementation Plan

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Complete

---

## 1. Goals & Scope

- **Goal:** Provide a single, consistent `/profile` experience for all authenticated users:
  - **Roles:** `admin`, `teacher`, `student`, `parent`, `accountant`.
- **Scope (core version):**
  - Read + update **basic personal and contact information** for each role.
  - Reuse existing data models (Prisma) and validation where possible.
  - Keep room to extend later with role-specific fields (e.g. staff metadata, academic info, avatars).

---

## 2. Current State Overview

### 2.1 Auth & Roles
- [x] **Roles defined** in `src/lib/rbac.ts` as `BaseRole`:
  - `"admin" | "teacher" | "student" | "parent" | "accountant"`.
- [x] **Permissions** defined and mapped per role with `roleToPermissions`.
- [x] **Route access** controlled in `src/lib/settings.ts` via `routeAccessMap` + `src/middleware.ts`.
- [x] **Authentication** via `next-auth` credentials provider:
  - `src/pages/api/auth/[...nextauth].ts` looks up the user **from role-specific tables**:
    - `Admin`, `Accountant`, `Teacher`, `Student`, `Parent` (Prisma models).
  - Session token contains: `id`, `username`, `role`, and `name` (for models that have it).

### 2.2 Data Models (Prisma)
- [x] Role-backed models in `prisma/schema.prisma`:
  - **Admin**: `id`, `username`, `password`, `staffId? -> Staff?` (no direct name/contact fields).
  - **Accountant**: `id`, `username`, `password`, `staffId? -> Staff?` (no direct name/contact fields).
  - **Teacher**: `username`, `password`, `name`, `surname`, `email?`, `phone?`, `address`, `img?`, `bloodType`, `sex`, `birthday`, etc.
  - **Student**: `username`, `password`, `name`, `surname`, `email?`, `phone?`, `address`, `img?`, `bloodType`, `sex`, `birthday`, links to `Parent`, `Class`, `Grade`.
  - **Parent**: `username`, `password`, `name`, `surname`, `email?`, `phone`, `address`.
- [x] **Staff** model used for staff metadata:
  - Fields: `staffCode?`, `firstName`, `lastName`, `email?`, `phone?`, `address?`, `dateOfBirth?`, `role: StaffRole`, etc.
  - Relations to `Admin`, `Accountant`, `Teacher`.

### 2.3 Existing Profile UI & Flows
- [x] **Navbar & Menu wiring**:
  - `Navbar.tsx` links avatar/name to `/profile`.
  - `Menu.tsx` has `Profile` entry under `OTHER` for roles: `admin`, `teacher`, `student`, `parent`.
- [x] **Profile page**: `src/app/(dashboard)/profile/page.tsx`
  - Uses `getServerSession(authOptions)` to read current `user`.
  - **Teacher:** loads from `prisma.teacher` by `id`, maps to `{ name, surname, email?, phone?, address }`.
  - **Student:** loads from `prisma.student` by `id`, maps to same shape.
  - **Parent:** loads from `prisma.parent` by `id`, maps to same shape.
  - **Admin/Accountant:** not handled explicitly:
    - Falls back to a simple read-only card using `session.user.name`, `session.user.email`, `role` if no `profileData`.
- [x] **Profile form component**: `src/components/forms/ProfileForm.tsx`
  - Client component using `react-hook-form` + `zodResolver(profileSchema)`.
  - Fields: `name`, `surname`, `email`, `phone`, `address`.
  - Calls `updateProfile` server action on submit.
- [x] **Validation schema**: `profileSchema` in `src/lib/formValidationSchemas.ts`
  - `name`: required string.
  - `surname`: required string.
  - `email`: optional, email-validated, empty string transformed to `undefined`.
  - `phone`: optional string with min length 5 (error message: "Phone is required!").
  - `address`: required string.

### 2.4 Profile Update Backend
- [x] **Server action**: `updateProfile` in `src/lib/actions.ts`
  - Reads `AuthContext` via `getAuthContext()` → `{ userId, role, permissions }`.
  - **Teacher:** updates `Teacher` record fields: `name`, `surname`, `email`, `phone`, `address`.
  - **Student:** updates `Student` record with same subset.
  - **Parent:** updates `Parent` record with same subset; has a slightly odd fallback for `phone` using `ctx.userId`.
  - **Admin / Accountant:** currently not supported → falls through to `default` and returns `{ success: false, error: true }`.
  - Revalidates `/profile` on success.

---

## 3. Gaps & Design Decisions Needed

### 3.1 Role Coverage Gaps
- [ ] **Admin profile editing not implemented** (read-only fallback only).
- [ ] **Accountant profile editing not implemented** (no profile route link in `Menu` yet; no update logic).
- [ ] **Staff model not leveraged** for admin/accountant display or editing.

### 3.2 Data Shape & Canonical Profile
- [ ] No explicit, unified `UserProfile` type that describes what a "profile" is across roles.
- [ ] UI currently assumes a simple `{ name, surname, email?, phone?, address }` shape; teachers/students/parents have more data (avatar, blood type, sex, birthday, relationships) which are not surfaced.
- [ ] Admin/Accountant identities are effectively split between role tables and `Staff`, making it unclear which fields should be editable via `/profile`.

### 3.3 Permissions & Safety
- [ ] Profile updates rely on role-specific branches but do not clearly define which fields each role is allowed to edit (e.g. should students edit `name` or only contact info?).
- [ ] No dedicated `profile.read` / `profile.write` permission; updates implicitly allowed for any authenticated user with a supported role.

---

## 4. Target Core Design (Phase 1)

### 4.1 Unified Concept: `UserProfile` (conceptual)

Define a **role-discriminated profile shape** (in `src/lib/profile.ts` later):

- **Common fields (all roles):**
  - `id` (string)
  - `role` (`"admin" | "teacher" | "student" | "parent" | "accountant"`)
  - `displayName` (derived from domain models)
  - `email?`
  - `phone?`
  - `address?`
- **Role-specific extensions (for later phases):**
  - Student: class, grade, parent name(s).
  - Teacher: subjects, classes, staff code.
  - Admin/Accountant: staff code, staff role, employment dates.

For **Phase 1**, the implementation will focus on **common fields only**, with clear extension points.

### 4.2 Data Source by Role (Phase 1)

- **Teacher**
  - Source: `Teacher` model.
  - Profile fields: `name`, `surname`, `email`, `phone`, `address`.
- **Student**
  - Source: `Student` model.
  - Profile fields: `name`, `surname`, `email`, `phone`, `address`.
- **Parent**
  - Source: `Parent` model.
  - Profile fields: `name`, `surname`, `email`, `phone`, `address`.
- **Admin**
  - Source: primarily `Staff` record linked via `Admin.staffId`, falling back if missing.
  - Profile fields (Phase 1):
    - `firstName`/`lastName` from `Staff` → mapped to `name`/`surname` in the form.
    - `email`, `phone`, `address` from `Staff`.
  - If no `Staff` exists, read-only display using session data with a clear message.
- **Accountant**
  - Source: `Staff` record linked via `Accountant.staffId`.
  - Profile fields: same mapping as for admin.

### 4.3 Editing Rules (Phase 1)

- **Teacher, Student, Parent**
  - Can edit: `name`, `surname`, `email`, `phone`, `address` (as currently implemented).
- **Admin, Accountant**
  - Can edit: `email`, `phone`, `address` in `Staff`.
  - **Name fields**: configurable decision; default assumption:
    - Allow editing `firstName`/`lastName` via the same form fields (`name`/`surname`).
- **Out of scope for Phase 1**
  - Changing usernames or passwords (handled via separate flows).
  - Editing role or association (e.g. staff role, class/grade relationships).

---

## 5. Backend Implementation Plan

### 5.1 Introduce `getCurrentUserProfile` Helper

- [ ] **Add** `src/lib/profile.ts` with:
  - A strongly typed `UserProfile` discriminated union by `role`.
  - `getCurrentUserProfile()` which:
    - Reads the current session (via `getAuthContext` or `getServerSession`).
    - Based on `role`, fetches the appropriate Prisma model(s).
    - Maps to the `UserProfile` shape used by the profile page.
  - Handles missing records gracefully (e.g. no `Staff` for admin) and returns a safe fallback.

### 5.2 Extend `updateProfile` Server Action

- [ ] **Refactor** existing role branches for teacher/student/parent to:
  - Use a shared mapping consistent with `UserProfile`.
  - Remove the odd `phone` fallback for parents and rely entirely on validated input.
- [ ] **Add branches** for:
  - **Admin**
    - Load the `Admin` by `ctx.userId`, including `staff`.
    - If `staff` exists: update its `firstName`/`lastName` ↔ `name`/`surname`, plus `email`, `phone`, `address`.
    - If no `staff`: either create a minimal `Staff` record or return a clear error (decision point; for now prefer a clear error and log).
  - **Accountant**
    - Same as admin but via the `Accountant` model.
- [ ] Ensure the function keeps using `ctx.userId` only (no user id comes from the client).
- [ ] Keep strict TypeScript typings (no `any` – use `ProfileSchema` and Prisma-generated types).

### 5.3 Optional: Permission Refinement

- [ ] Decide whether a dedicated `"profile.write"` permission is needed.
  - If yes, add to `Permission` in `rbac.ts` and to `ADMIN_PERMISSIONS`, etc.
  - Gate `updateProfile` via `ensurePermission("profile.write")` before role-specific updates.

---

## 6. Frontend Implementation Plan

### 6.1 Refactor `/profile` Page

- [ ] Replace direct Prisma calls in `src/app/(dashboard)/profile/page.tsx` with `getCurrentUserProfile`.
- [ ] Change logic from role-specific queries to a single `profile` object:
  - If `profile` available and editable: render `ProfileForm` with `initialData`.
  - If not editable (e.g. no backing record): show a read-only view with clear messaging.
- [ ] Include role label from the `UserProfile` object instead of loosely using `session.user.role`.

### 6.2 Evolve `ProfileForm`

- [ ] Keep existing fields (Phase 1): `name`, `surname`, `email`, `phone`, `address`.
- [ ] Pass through `role` and potentially simple flags (e.g. `canEditName`) so future tweaks per role are easy.
- [ ] Ensure the form always posts data that matches `profileSchema`.
- [ ] Confirm correct mapping between form values and per-role update logic in `updateProfile`.

### 6.3 UI/UX Considerations (Phase 1)

- [ ] Add a short description on the profile page explaining what can be edited.
- [ ] Make success/error states consistent with other forms (reusing existing toast patterns).
- [ ] Ensure the profile page works responsively within the dashboard layout.

---

## 7. Data & Migration Considerations

- [ ] **Admin/Accountant records without Staff:**
  - Decide policy:
    - Option A: prevent profile editing and show a message instructing an admin to link a Staff record.
    - Option B: auto-create a minimal Staff record on first profile edit.
  - Capture the chosen policy in comments/docs and ensure seed scripts are updated if needed.
- [ ] **Existing teacher/student/parent data:**
  - No schema changes for Phase 1; only reading/updating existing columns.
- [ ] **Future fields (Phase 2+):**
  - Avatars from `img` fields.
  - Blood type, sex, birthday displayed in profile for appropriate roles.

---

## 8. Testing & QA Plan

- [ ] **Unit / integration tests** (where test harness exists):
  - `getCurrentUserProfile` for each role, including missing-data edge cases.
  - `updateProfile` happy-path and error-path tests per role.
- [ ] **Manual QA scenarios:**
  - Log in as **admin**, open `/profile`, edit contact info, verify DB changes.
  - Log in as **teacher**, **student**, **parent**, **accountant** and repeat.
  - Verify that users cannot edit other users' data via the profile form.
  - Confirm `/profile` behaves reasonably when underlying data is partially missing.

---

## 9. Phased Rollout

1. **Phase 1 (Core):**
   - Implement `getCurrentUserProfile` and refactor `/profile` to use it.
   - Extend `updateProfile` for admin/accountant via `Staff`.
   - Keep UI fields limited to basic personal/contact info.
2. **Phase 2 (Role-specific Enhancements):**
   - Expose additional teacher/student info (class, grade, subjects, etc.).
   - Show staff metadata for admin/accountant.
3. **Phase 3 (Preferences & Advanced Features):**
   - Per-user settings (theme, language, notifications) integrated with `/settings`.
   - Avatar upload, password change flows, etc.
