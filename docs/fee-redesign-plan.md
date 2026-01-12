# Fee Module Redesign – Implementation Plan

This document is the living plan for redesigning the fee module. We will update it as we implement. It balances clean data modeling, admin/accountant editing, role-based visibility, and instantaneous reflections on student/parent views.

Last updated: After M3 Admin UI (inline editor, category manager) polish

---

## Objectives
- Model fee categories, class-level structures per term/year, one‑time fees, and optional per‑student charges (transport, uniforms).
- Provide an editor for admins/accountants to configure fees, preview, and apply across students.
- Preserve strict role-based visibility:
  - Parents/Admins/Accountants: full figures + totals.
  - Students/Teachers: status only.
- Enable summaries with rollover credit across terms/years.
- Seed the exact figures from the provided sheet for ECDE and Grades 1–6.

---

## A. Target Data Model (Prisma)
> Names/types are proposed; we will finalize during migration.

- FeeCategory
  - id, name, description?, is_recurring:boolean, frequency: "termly" | "yearly" | "one_time", is_editable:boolean, active:boolean
  - Examples: Tuition, Activity, External Exams, Meals, Assessment Book, Computer Studies, Admission, Interview, Transport, Uniform

- Class (reuse existing)
  - ECDE (Nursery), Grade 1–6

- FeeStructure (class/year editor lines)
  - id, classId, feeCategoryId, term: TERM1|TERM2|TERM3|null (null = yearly/one_time), academicYear:int|null, amountMinor:int, active:boolean
  - Unique: (classId, feeCategoryId, term, academicYear)
  - Yearly entries stored once per class/year (term = null) but shown under Term 1 by convention

- Student (reuse existing)

- StudentFee (generated per student)
  - id, studentId, feeCategoryId, term: TERM1|TERM2|TERM3|null, academicYear:int, amountDueMinor:int, amountPaidMinor:int, status: "unpaid" | "partially_paid" | "paid", locked:boolean, sourceStructureId:int|null, createdAt, updatedAt
  - Index: (studentId, academicYear, term)

- Payment (reuse and extend)
  - id, studentFeeId?, amountMinor:int, method, reference?, paidAt
  - Optional: isCreditFromPrior:boolean to track rollover explicitly

- Transport & Uniform
  - TransportSubscription: id, studentId, enabled:boolean, rateMinor:int, frequency:"termly"|"monthly", notes?
  - UniformItemPrice: id, classId|null, itemName, priceMinor:int, active:boolean
  - UniformPurchase: id, studentId, itemName, qty, priceMinor, purchasedAt

- AuditLog
  - id, actorUserId, entity:"fee_structure"|"student_fee"|"payment", entityId, oldValue JSON, newValue JSON, reason?, createdAt

- SchoolPaymentInfo
  - id, name, data JSON (e.g., paybill, account, till, notes)

---

## B. Seed Data (Exact Figures)
All amounts are KES; stored in minor units (x100). Year = 2025.

### Payment Info
- Kingdom Bank: paybill 529914, account 51029
- M-Pesa Till: 5669463
- One-time: Admission = 2500, Interview = 500

### ECDE (Nursery)
- Tuition: 4000 per term
- External Exams: 300 per term
- Meals: 1800 per term
- Activity (yearly): 700 once
- Assessment Book: 400 (TERM1)
- Term totals (from sheet):
  - Term 1: 7200
  - Term 2: 6100
  - Term 3: 6100

### Primary (Grades 1–6)
- Tuition: 5000 per term
- External Exams: 300 per term
- Meals: 1800 per term
- Activity (yearly): 700 once
- Assessment Book: 400 (TERM1).
- Computer Studies: 1500 per term (billed via separate channel per sheet),
  but INCLUDED in displayed term totals.
- Term totals (authoritative, including Computer Studies):
  - Term 1: 9,900
  - Term 2: 8,800
- Term Adjustment: +200 (TERM1/2/3) to maintain totals.

Seeding approach chosen: totals above are enforced using a small "Term Adjustment" category of +200 on TERM1/TERM2/TERM3 as needed (TERM1 included) while Assessment Book is 400 in TERM1. If you prefer keeping Assessment Book at 2000, we can retain 2000 and use offsetting adjustments (including negatives) to preserve these totals.

Decision: Displayed term totals include Computer Studies (billed via its dedicated channel). We will confirm the exact per‑item Primary figures with you and seed itemized amounts to sum to these totals.

- One-time global categories: Admission 2500, Interview 500, Uniform (itemized catalog, editable).

---

## C. Backend APIs
- Fee Categories
  - GET /api/fee-categories — implemented (supports ?active=true, returns id/name/active/frequency)
  - POST /api/fee-categories — implemented (create with name/description/frequency, sets isRecurring/isEditable/active)
  - PATCH /api/fee-categories — implemented (rename/activate/deactivate with Zod validation and deactivation guard)

- Fee Structures
  - GET /api/fee-structures?classId=&year=
  - POST /api/fee-structures (create or upsert) — implemented (with per-line AuditLog)
  - PATCH /api/fee-structures/:id (update) — implemented (Zod validated + audit)
  - POST /api/fee-structures/preview (classId, year) → computed student fees preview — implemented (Zod validated)
  - POST /api/fee-structures/apply (classId, year, scope: "all"|"term", term?) → generate/update StudentFee — implemented (Zod validated + audit)

- Student Fees (role-aware)
  - GET /api/student-fees/my?term=&year=&search= (implemented)
  - GET /api/student-fees/my/summary?term= (implemented; shows totals + rollover credit)
  - GET /api/students/:id/fees (admin/accountant/parent) → itemized per term + yearly totals
  - GET /api/students/:id/fees/status (student/teacher) → statuses only

- Payments
  - GET /api/payments?studentFeeId=
  - POST /api/payments (parent limited to own children; admin/accountant unrestricted)
  - Optional: auto-allocation to unpaid StudentFee rows in priority order

- Transport & Uniform
  - POST/PATCH /api/transport-subscription
  - GET/POST /api/uniform/prices
  - POST /api/uniform/purchase

- Audit Logs
  - GET /api/audit-logs?entity=fee_structure&entityId= — implemented (pagination)
  - POST /api/fee-structures: logs per-line upsert with before/after — implemented
  - POST /api/fee-structures/apply: logs operation — implemented

---

## D. Fee Engine — Automatic Update Logic
- On FeeStructure change (create/update):
  1) Resolve impacted students (class/year).
  2) For each impacted (category, term/year):
     - If no payments: overwrite StudentFee.amountDueMinor.
     - If payments exist:
       - If new amount ≥ paid: update amountDueMinor and recompute status.
       - If new amount < paid: lock the row and record the difference as credit/adjustment.
  3) Yearly categories: applied once (shown under TERM1 for UI consistency).
  4) One-time categories: applied to configured term (TERM1 for Assessment Book; Admission/Interview at enrollment).
  5) Per-student options (transport/uniform): applied only if enabled/purchased.

- Idempotency: use upsert keyed by (studentId, feeCategoryId, term, academicYear) with sourceStructureId + lastAppliedAt.
  - Unit tests implemented (src/lib/feeEngine.ts + src/__tests__/feeEngine.test.ts): creation, overpayment lock, locked preservation, status transitions.

---

## E. UI/UX
- Admin/Accountant Fee Dashboard
  - Year selector; class tabs (ECDE, G1–G6)
  - Recurring grid (Tuition, External, Meals, Computer Studies, Activity)
  - One-time section (Assessment Book, Admission, Interview, Uniform)
  - Actions: Save, Preview Student Fees, Apply to All Students — implemented
  - Audit log panel — implemented (list, View more, Revert, Revert all by timestamp)

- Parent View
  - Student header, class, year, term selector
  - Itemized breakdown with amounts/status
  - Subtotals per term, one-time section, grand total, amount paid, balance
  - “Computer Studies” shown as separate payable line if excluded from term totals
  - Pay now / Statement / Reminder

- Student View
  - Status-only per term + one-time clearance; no amounts

- Teacher View
  - Class clearance matrix (students × terms); status only; export

---

## F. Rollover Credit
- Display (implemented in /api/student-fees/my/summary): pastCredit, balance, rolloverForward using rows from earlier terms/years.
- Optional persistence: store explicit Credit ledger or mark Payment rows with isCreditFromPrior.

---

## G. Migration & Compatibility
- Add FeeCategory and FeeStructure tables; backfill from current data as needed.
- Add new StudentFee fields (term, academicYear, sourceStructureId, locked) and migrate existing rows with heuristics.
- Run old and new endpoints side-by-side; switch UI progressively.

---

## H. Validation & Tests
- Unit: engine idempotency; rollover math; RBAC checks.
- Integration: structure change → preview → apply → parent view update; overpayment → rollover.
- Data integrity: unique constraints, transactions, audit logs.

---

## I. Milestones (Estimated)
- M1 Schema + Seeds — completed
- M2 APIs + Engine — core + Zod validation implemented (fee-structures list/upsert/preview/apply, audit logs, engine tests)
- M3 Admin UI — mostly implemented (AdminClassFeeEditor, audit panel, inline PATCH, yearly section, totals/auto-balance, fee category manager, toasts)
- M4 Parent/Student/Teacher views (2–3 days)
- M5 Reports/Polish (2–3 days)
- M6 QA & Cutover (1–2 days)

---

## J. Open Points (Need Confirmation)
1) Yearly Activity positioning: OK to show under Term 1? (Current plan: show under Term 1.)
2) Primary Assessment Book: keep at 2000 and use adjustments vs. seeded 600 with small TERM2/3 adjustments?

---

## Current Implementation Status Snapshot
- Role-aware my-fees list + payment history: implemented.
- Payments POST hardened for parent ownership: implemented.
- Summary endpoint (/api/student-fees/my/summary) with rollover credit: implemented.
- Term filter in my-fees UI: implemented.
- Generate API extended to accept term and academicYear: implemented.
- Admin fee detail inline payments: implemented.
- M1 schema models (FeeCategory, ClassFeeStructure, AuditLog, SchoolPaymentInfo) added.
- StudentFee extended with term/year, locked, sourceStructureId, indexes.
- Seeds added: payment info, categories, ECDE lines, Primary G1–G6 lines matching authoritative totals.
- New APIs: fee-structures (get/upsert/preview/apply), fee-categories (GET/POST/PATCH with frequency), audit-logs (list).
- Zod validation: preview/apply/upsert and fee-structures PATCH — implemented.
- AdminClassFeeEditor:
  - Class/year selector and grid for TERM1/TERM2/TERM3.
  - Separate yearly/one-time section (term = null) shown under TERM1.
  - Inline per-cell save using PATCH (or POST upsert for new lines).
  - Totals row, expected Primary totals, and auto-balance via Term Adjustment.
  - Dirty tracking, Preview/Apply disable when unsaved, and toast feedback.
  - Audit panel with pagination, per-entry Revert, and Revert all by timestamp.

This document is our single source of truth for the redesign. We will update sections as we implement, migrate, and make design choices.
