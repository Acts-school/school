# Admin Panel Implementation Plan

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Complete

---

## 1. Navigation & Shell

### 1.1 Sidebar items
- [x] Implement `/profile` page
  - [x] Basic profile view for current user (name, email, role)
  - [x] Editable profile fields as agreed (e.g. contact info)
- [x] Implement `/settings` page
  - [x] Global school/admin settings (scope to be defined)
  - [ ] Per-user preferences (e.g. theme, language) if needed
- [x] Replace sidebar `Logout` link behavior
  - [ ] Option A: Wire `/logout` route to call `next-auth` `signOut()` then redirect
  - [x] Option B: Remove `/logout` route and make the menu item trigger the existing `LogoutButton` behavior
- [x] Implement `/list/messages` page
  - [ ] Decide data model & purpose (internal messages vs notifications)
  - [x] At minimum, avoid 404 for this route

### 1.2 Navbar
- [x] Make Messages icon actionable
  - [x] Either link to `/list/messages` or open a messages panel
- [x] Make Announcements icon/badge dynamic
  - [x] Replace hard-coded `1` with real total count for visible announcements
  - [x] Add click behavior to go to `/list/announcements`
- [x] Connect avatar/profile to profile page
  - [x] Clicking avatar or username should navigate to `/profile`

---

## 2. User Profile & Settings

### 2.1 Profile
- [x] Define profile fields and permissions per role (admin, teacher, student, parent)
- [x] Implement server-side profile fetch for current user
- [x] Implement profile update flow (form + API + validation)
- [x] Ensure updates respect RBAC rules

### 2.2 Settings
- [~] Define which settings are global vs per-user
  - Global settings are implemented via `SchoolSettings` (school year, term, passing score, etc.); only per-user preferences remain to be defined.
- [x] Implement admin-only settings section (e.g. school year, grading, finance options)
- [ ] Implement per-user preferences (if needed)
- [x] Guard settings page with appropriate permissions

---

## 3. Authentication & Logout

- [x] Decide on `/logout` route vs purely client-side sign-out
- [x] Ensure consistent logout UX
  - [x] Navbar logout and sidebar logout behave the same and are both reliable, using client-side LogoutButton

---

## 4. Announcements & Communication

### 4.1 Announcements management
- [x] Replace `DefaultForm` for `announcement` with real form component
  - [x] Create `AnnouncementForm` (create & update)
  - [x] Wire into `FormModal` `forms` map
- [x] Implement delete support for announcements
  - [x] Add delete hook / API for announcements
  - [x] Extend `FormModal` delete switch to handle `announcement`
- [x] Add validation and error handling for announcement CRUD

### 4.2 Related communication features
- [~] Define design and scope for Messages module
  - High-level design drafted: focus on simple 1:1 internal messages, with admin and teacher able to send and other roles read-only in v1; implementation is deferred.
  - Detailed data model, permissions, and UI/UX to be finalized when we pick this up.
- [ ] Align announcements & messages UX (how users see and manage them)

---

## 5. CRUD Gaps for Admin

The following tables currently show placeholder forms in `FormModal`:
- `parent`, `lesson`, `assignment`, `result`, `event`, `announcement`

### 5.1 Parents
- [x] Implement `ParentForm` (create/update)
- [x] Wire `parent` entry in `FormModal` to real form
- [x] Implement parent delete support in `FormModal` or via dedicated flow

### 5.2 Lessons
- [x] Implement `LessonForm` (create/update)
- [x] Wire `lesson` entry in `FormModal`
- [x] Implement lesson delete support

### 5.3 Assignments
- [x] Implement `AssignmentForm` (create/update)
- [x] Wire `assignment` entry in `FormModal`
- [x] Implement assignment delete support

### 5.4 Results
- [x] Implement `ResultForm` (create/update)
- [x] Wire `result` entry in `FormModal`
- [x] Implement result delete support

### 5.5 Events
- [x] Implement `EventForm` (create/update)
- [x] Wire `event` entry in `FormModal`
- [x] Implement event delete support

### 5.6 Announcements (recap)
- [x] Replace placeholder with `AnnouncementForm`
- [x] Implement create/update/delete flows end-to-end

---

## 6. Finance & Reports

Most finance pages (fees, collections, aging, invoices, debtors, expenses, payroll, etc.) are implemented.

### 6.1 Admin reports
// Focus for now on finance-focused admin reports.
- [x] Design dedicated "Admin Reports" area
- [x] Decide which reports to surface (finance-focused)
- [x] Implement route and UI guarded by `reports.view_admin`

### 6.2 UX polish for existing finance pages
- [~] Review validation, error states, and loading states
- [~] Standardize breadcrumbs and navigation across finance routes

### 6.3 Budget planning & reconciliation
- [x] Design and introduce a budget data model based on `/docs/YVONE.xlsx`
  - Year-level entity (e.g. `BudgetYear`) with status pill (`DRAFT`, `APPROVED`, `ARCHIVED`).
  - Section-level grouping for items (e.g. Operating expenses, Staff salaries, Other budgets).
  - Item-level rows (e.g. Food, Electricity, individual staff) with per-month amounts (Jan–Dec) and explanation, normalised into a monthly amounts table.
- [x] Implement budget CSV import and payroll pre-fill integration
  - [x] Implement Prisma models, minimal list/detail pages, and CSV import into `BudgetYear` / `BudgetSection` / `BudgetItem` / `BudgetAmount`.
  - [x] Implement "Pre-Fill from Approved Budget" action and UI on payroll periods that updates staff basic salaries from STAFF budget items.
- [x] Align budget categories with existing finance models
  - Map overhead items (Food, Electricity, Water, etc.) to a shared finance category concept that is also used by `Expense` records.
  - Map salary-related budget rows to `Staff` / `StaffPayroll` so staff costs can be compared budget vs actual by month and year.
  - For fee/income side, define how budgeted income (expected fees/collections) relates to `StudentFee`, `Invoice`, and `Payment` data for reporting.
- [x] Support per-student negotiated fee discounts
  - Add `baseAmount` and `discountReason` to `StudentFee` so the standard class/grade fee and discount context are preserved.
  - Update fee-structure apply logic so `baseAmount` is filled from `ClassFeeStructure`, while `locked` rows are never overwritten.
  - Add a manual adjustment server action and admin-only form in `/finance/collections` to set a final agreed `amountDue` for an individual `StudentFee` row.
- [ ] Define how an APPROVED budget year affects other finance modules
  - Only one APPROVED budget per academic year; others remain DRAFT or ARCHIVED.
  - When status changes to APPROVED, expose read-only budget summaries in relevant pages: `/finance/fees`, `/finance/expenses`, `/finance/payroll`, and `/finance/reports`.
  - Ensure `/finance/reports` can show budget vs actual for key aggregates (total income, total expenses, staff costs) using the approved budget and live transactions.
  - Treat APPROVED as a locked baseline for comparison and guidance only; never silently overwrite actual `Expense`, `Invoice`, `Payment`, or `StaffPayroll` data.
  - Payroll (hybrid approach):
    - Always show budget vs actual staff costs per month/period in `/finance/payroll` and `/finance/reports`, with variance indicators.
    - Add an optional "Pre-Fill from Approved Budget" action when creating a new `PayrollPeriod` that proposes row amounts from matching salary-related `BudgetItem` + `BudgetAmount` data.
    - Require a confirmation/preview step and allow edits after pre-fill so mid-year hires/leavers and adjustments can be handled safely.
  - Expenses (soft-lock categories):
    - In `/finance/expenses`, make `category` a searchable dropdown sourced from budgeted overhead categories (by `BudgetSection`), with an "Other/Unbudgeted" option that requires a note.
    - Highlight unbudgeted or over-budget expenses in the UI and surface them in `/finance/reports` (e.g. "Unbudgeted Expenses" and category/month variance blocks).
    - If no approved budget exists for the current year, fall back to the existing free-form flow but prompt admins to set up a budget.
  - Income / fees (hybrid derived + override):
    - Derive a default "Budgeted Fee Income" line in the budget editor from live data (e.g. current or forecast enrollment × `FeeStructure` / `ClassFeeStructure` rates, normalized by term/month).
    - Allow manual overrides of these amounts with a required "override reason" so planners can factor in expected growth/discounts.
    - In `/finance/fees`, `/finance/debtors`, `/finance/aging`, and `/finance/reports`, show fee collections and outstanding balances vs this budgeted income baseline, with simple variance summaries.
- [ ] Reconcile each existing finance page with the budget plan
  - `/finance/fees` & collections-related reports: confirm how budgeted fee income should be derived (per class/grade/term) and surfaced alongside current fee structures and collections.
  - `/finance/invoices` and `/finance/debtors`: decide whether debtor views remain purely actuals or also display how far collections lag behind budget for the year/term.
  - `/finance/clearance` and `/finance/aging`: keep focused on fee clearance/aging, but consider small budget context (e.g. show how outstanding amounts compare to budgeted income).
  - `/finance/expenses`: introduce basic budget vs actual view by category and month, using the approved budget as the baseline for overhead and one-off items.
  - `/finance/payroll` & `/finance/staff`: ensure staff basic salaries and monthly payroll totals can be reconciled to the staff-salary portion of the approved budget.
- [x] Add budget vs actual views to `/finance/reports` using the approved budget and live fees/expenses/payroll data.
- [x] Add UI for reviewing and editing roles of staff auto-created from budget import (e.g. in `/finance/staff` or payroll screens).
- [ ] Clean up and simplify where needed
  - Avoid duplicate or overlapping debtors logic between `/finance/invoices` and `/finance/debtors` once the final approach is chosen.
  - Confirm that any legacy mock data (e.g. in `src/lib/data.ts`) is not used by the finance module and can be ignored or removed once live finance data is stable.

---

## 7. Testing & QA

- [ ] Add integration tests for admin navigation (sidebar + navbar)
- [ ] Add basic end-to-end flows for:
  - [ ] Logging in as admin and navigating all admin-only pages
  - [ ] Announcement CRUD
  - [ ] A representative CRUD entity (e.g. Parent or Assignment)
- [x] Manual QA checklist for each admin feature before release
  - [x] Admin navigation: verify sidebar + navbar links for `/profile`, `/settings`, `/finance/*`, `/list/announcements`, `/list/messages`, and `/finance/reports` work for an admin user.
  - [x] Finance flows: verify fees, collections, aging, clearance, invoices, debtors, expenses, payroll, staff, and student fees pages load, show breadcrumbs, and basic tables or summaries without errors.

---
## 8. Immediate Next Tasks


Short-term tasks we can tackle next (candidate order):
1. Testing & QA automation
  - Add integration tests for admin navigation (sidebar + navbar).
  - Add basic end-to-end flows for:
    - Logging in as admin and navigating all admin-only pages.
    - Announcement CRUD.
    - A representative CRUD entity (e.g. Parent or Assignment).
2. Finance: budget planning module
  - Inspect the proposed budget in `/docs/YVONE.xlsx` and define a budget data model and business logic that fits the existing finance module.
  - Design admin/accountant UI and UX for creating, updating, and reviewing yearly budgets (and later comparing against actuals).
3. Messages module (deferred)
  - Revisit the drafted scope for the Messages module (1:1 internal messages, admin/teacher send; others read-only in v1).
  - Align announcements & messages UX (how users see and manage them) when we decide to implement it.
4. Per-user preferences
  - Decide which settings should be per-user (e.g. theme, language).
  - Implement per-user preferences in the profile/settings UI if still needed.
5. Finance UX polish
  - Review validation, error states, and loading states across finance pages.
  - Standardize breadcrumbs and navigation across finance routes.
6. Cloudinary typings
  - Tighten Cloudinary upload typings for image upload widgets (e.g. TeacherForm, StudentForm) once core CRUD flows are stable.

This file should be updated after each task completion to reflect real progress and any scope changes.

## 9. Multi-school / Branch support

- [x] Phase 1: Design and schema
  - Define a `School` model to represent each school or branch in a group.
  - Define a `SchoolUser` join model to capture which users belong to which schools and with which role (e.g. SUPER_ADMIN, SCHOOL_ADMIN, ACCOUNTANT).
  - Introduce optional `schoolId` fields on core academic and finance entities (students, classes, finance, budget, payroll, etc.) so existing data remains valid while new records can be associated with a school.
  - Plan a data migration path that creates a default school for the current deployment and gradually backfills `schoolId` on existing rows (see `scripts/backfill-default-school.ts`).
- [x] Phase 2: RBAC and scoping
  - Extend RBAC to distinguish super admins (global) from per-school admins and accountants using `SchoolUser` and `getCurrentSchoolContext` (including `isSuperAdmin`).
  - Ensure all core finance and academic queries and mutations are scoped by `currentSchoolId` for non-super-admins, while super admins can see data across all schools or operate in global (unscoped) mode.
  - Update finance, budget, and academic server actions and API routes to require and enforce a school context when reading or writing data, including per-school deletes and SUPER_ADMIN-only global operations where appropriate.
- [x] Phase 3: UX and analytics
  - [x] Add a simple school selector in the admin shell for users who belong to more than one school/branch, backed by a `currentSchoolId` cookie and `getCurrentSchoolContext`.
  - [x] Ensure the selected school is reflected in breadcrumbs, page titles, and filters on key finance and academic pages (with current school/global scope shown in headings and breadcrumbs, and queries already scoped).
  - [x] Implement super-admin dashboards with per-school analytics and combined rollups across all schools, including per-school and global finance metrics and quick links into each school's scoped `/admin` view.
  - [x] Add guardrails so per-school admins only see and manage data for their current school, while super admins can switch across schools or view group-level summaries (including per-school delete scoping and SUPER_ADMIN-only destructive actions).

## 10. Backlog

- [ ] Budget & staff-role management polish
  - Add visual affordances for staff auto-created from budget import (e.g. a badge or note in `/finance/staff`).
  - Add basic filtering/sorting on the staff role table to help review imported staff.
  - Add helper copy on the budget import UI explaining that missing staff will be auto-created with role `OTHER`.
- [ ] Tighten Cloudinary upload typings for image upload widgets (e.g. TeacherForm, StudentForm) once core CRUD flows are stable.
- [ ] Revisit env.server test behavior (dummy DATABASE_URL/NEXTAUTH_SECRET)
  - Currently Vitest/CI runs use deterministic dummy values for `DATABASE_URL` and `NEXTAUTH_SECRET` when `NODE_ENV === "test"` so unit tests do not require real secrets.
  - Later, consider switching to a dedicated test database URL and/or CI-provided secrets, and simplifying the Zod schema once the test/CI env story is finalized.
