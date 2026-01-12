# Implementation Plan

This plan is based on the feature-by-feature assessment and prioritizes high-impact modules first. Each phase lists scope, data-model changes, APIs/UI, permissions, tests, and rollout notes.

## Phase 0: Cross‑cutting Foundations (prerequisites)
- **RBAC/Permissions**
  - Scope: Introduce permission scopes (e.g., `students.read`, `fees.write`, `attendance.bulk`) and derive them from roles.
  - Changes: Permission map, middleware/guards for server actions and pages, token enrichment.
  - Tests: RBAC matrix tests by role/scope; route protection tests.
- **Config/Docs**
  - Scope: `.env.example`, environment validation, README setup, Docker notes.
  - Tests: Env schema unit tests.
- **Telemetry & Quality**
  - Scope: Optional Sentry, basic request logging, request IDs.
  - Tests: API smoke tests; page render smoke in CI.

## Phase 1: Fees & Accounting (high impact)
- **Scope**: Fee structures, invoices, payments, receipts, debtors, simple expenses.
- **Data Model**: FeeStructure, Invoice, Payment, Receipt, Expense, Payer (Student/Parent link).
- **API/UI**: CRUD for fee entities; receipt PDF; dashboards for collection and debtors.
- **Integrations**: Payment gateway stub + webhook endpoint.
- **Permissions**: `accountant.*`, `cashier.payments.create`, `reports.view_finance`.
- **Tests**: Amount due/paid/outstanding; webhook signature; receipt contract.
- **Rollout**: Prisma migration; feature-flag UI.

## Phase 2: Admissions Workflow
- **Scope**: Online application → screening → decision → acceptance; admission fee; class allocation.
- **Data Model**: Application (states), Applicant, Notes, Attachments.
- **API/UI**: Applicant portal, staff review queue, decision actions, convert to Student.
- **Permissions**: `admissionsOfficer.*`, `principal.admissions.approve`.
- **Tests**: State machine transitions; class capacity checks; audit trail.
- **Rollout**: Seed sample forms; link acceptance to Fees.

## Phase 3: Report Cards
- **Scope**: Termly report cards, continuous assessment, configurable templates, PDF export.
- **Data Model**: Term, ReportTemplate, ReportCard, ReportItem, NurseryRubrics.
- **API/UI**: Template designer; teacher entry/preview; parent view + PDF.
- **Permissions**: `teacher.reports.edit_own`, `principal.reports.publish`, `parent.reports.view_child`.
- **Tests**: Aggregation accuracy; template rendering snapshots; export contracts.

## Phase 4: Parent Communications
- **Scope**: Announcements improvements, absence alerts, payment reminders, homework/class updates.
- **Data Model**: Notification, ChannelPreference, DeliveryLog.
- **Integrations**: SMS/email/push provider adapters.
- **API/UI**: Message composer; automated triggers (absence, overdue invoices).
- **Permissions**: `communications.send_announcement`, `accountant.send_payment_reminder`.
- **Tests**: Idempotent sends; opt-in/out; retry/backoff.

## Phase 5: HR (Staff & Leave)
- **Scope**: Leave management, duty rosters; prepare for payroll later.
- **Data Model**: LeaveRequest, LeaveType, Roster, (optional) StaffAttendance.
- **API/UI**: Leave request/approval; calendar; roster builder.
- **Permissions**: `hr.leave.approve`, `teacher.leave.request`.
- **Tests**: Overlap constraints; entitlement calculations.

## Phase 6: LMS Enhancements
- **Scope**: Content uploads (notes/materials), homework submissions, simple quizzes.
- **Data Model**: Material, Submission, Quiz, Question, Attempt.
- **API/UI**: Teacher upload; student submit; grading + feedback.
- **Permissions**: `teacher.materials.create`, `student.submissions.create`.
- **Tests**: Deadlines, grading rules, file validation.

## Phase 7: Nursery Health & Milestones
- **Scope**: Health/immunization records, incident logs, developmental milestones.
- **Data Model**: HealthRecord, Immunization, Incident, MilestoneTemplate, MilestoneEntry.
- **API/UI**: Nurse console; milestone dashboards; printable summaries.
- **Permissions**: `nurse.health.read_write` (sensitive), `parent.health.view_summary` (optional).
- **Tests**: PII access controls; audit logging.

## Phase 8: Transport & Hostel (optional)
- **Scope**: Routes, pickup points, transport attendance; hostel beds, roll calls, billing.
- **Data Model**: Route, Stop, Vehicle, Driver, TransportAttendance; Hostel, Room, Bed, Resident.
- **API/UI**: Manager screens; daily registers; billing link to Fees.
- **Permissions**: `transport.manage`, `warden.hostel.manage`.
- **Tests**: Capacity, assignment constraints.

## Phase 9: Inventory & Assets
- **Scope**: Uniforms, textbooks, stationery, asset tracking.
- **Data Model**: Item, StockMovement, Issue/Return, Asset.
- **API/UI**: Storekeeper console; student issue/return logs.
- **Permissions**: `inventory.manage`, `inventory.issue.return`.
- **Tests**: Stock reconciliation; low-stock alerts.

## Phase 10: Security & Pickup Authorization
- **Scope**: Authorized pickup lists, QR/ID verification, gate logs.
- **Data Model**: GuardianAuth, PickupEvent, QRCode/Badge.
- **Integrations**: Optional scanner app or web-based scan.
- **API/UI**: Security console for verification; alerts for mismatches.
- **Permissions**: `security.pickup.verify`.
- **Tests**: Authorization checks; auditability.

## Phase 11: Analytics & Reporting
- **Scope**: Fees, enrollment, performance, attendance trends.
- **Data Model**: Materialized views or denormalized summary tables; scheduled jobs.
- **API/UI**: Admin/principal dashboards; CSV/PDF export.
- **Permissions**: `reports.view_*` by domain.
- **Tests**: Query correctness; date filters; performance budgets.

## Non-functional Requirements (all phases)
- **Performance**: Indexes, pagination, N+1 audits, caching where safe.
- **Security/Privacy**: Least privilege; scopes; audit logs for sensitive reads/writes.
- **Accessibility**: a11y on forms and dashboards.
- **Internationalization**: Copy ready for i18n.
- **Migration strategy**: Incremental Prisma migrations; demo seeders.

## Milestone Ordering (suggested)
1) Foundations (RBAC, env/docs)
2) Fees → 3) Admissions → 4) Report Cards → 5) Parent Comms
6) HR → 7) LMS → 8) Nursery Health/Milestones
9) Inventory → 10) Security Pickup → 11) Transport/Hostel (if needed) → 12) Analytics

## Acceptance Criteria (examples)
- Fees: Create invoice, accept payment, update debtor list, PDF receipt; finance-only access.
- Admissions: Application → screening → offer → accept → student created with class; audited.
- Reports: Teacher enters scores; principal publishes; parent downloads PDF; templates configurable.
- Comms: Absent student triggers parent SMS; opt-outs respected and logged.

## Dependencies and Risks
- Payment gateway and SMS provider availability/limits.
- PII handling in health and security modules; require audit + encryption where needed.
- Avoid role sprawl by centralizing permissions.

## Next Steps
- Confirm initial roles-to-permissions matrix.
- Lock Phase 1/2 schema drafts and UI wireframes.
- Create migration plan and feature flags for incremental rollout.
