# Simple Fee Creation – Phased Implementation Plan

_Last updated: 2025-12-28_

---

## 1. Objectives

- **Reduce complexity** of fee configuration for admins/accountants.
- **Avoid the Class Fee Structure Editor** as the primary way to set up fees.
- **Align with CBC stages** by allowing fee creation by broad stage group:
  - **ECDE** = Pre-primary (PP1–PP2).
  - **Primary** = Grade 1–6 (Lower + Upper Primary).
- **Respect existing finance models** (`FeeCategory`, `ClassFeeStructure`, `StudentFee`) and apply logic.
- Keep per-student editing possible through existing flows.

---

## 2. Current Relevant Models & Flows (Summary)

### 2.1 Prisma models

- `FeeCategory`
  - `name: String @unique`
  - `frequency: FeeFrequency` (enum: `TERMLY | YEARLY | ONE_TIME`).
- `ClassFeeStructure`
  - `classId: Int`
  - `feeCategoryId: Int`
  - `term: Term?` (null for yearly/one-time lines shown under Term 1).
  - `academicYear: Int?`
  - `amount: Int` (minor units).
  - Unique: `(classId, feeCategoryId, term, academicYear)`.
- `StudentFee`
  - `studentId: String`
  - `feeCategoryId: Int?`
  - `term: Term?`
  - `academicYear: Int?`
  - `baseAmount: Int?`, `amountDue: Int`, `amountPaid: Int`, `locked: Boolean`.
  - `sourceStructureId: Int?` → `ClassFeeStructure` link.
- CBC stage-related models:
  - `Grade.level: Int`
  - `Grade.stage?: EducationStage` (e.g. `PRE_PRIMARY`, `LOWER_PRIMARY`, `UPPER_PRIMARY`).
  - `Class.gradeId -> Grade`.

### 2.2 Existing APIs / flows

- `/api/fee-structures` (Class fee structures)
  - `POST` upserts a batch of `ClassFeeStructure` rows per `classId` + `year`.
- `/api/fee-structures/preview`
  - Computes what **StudentFee** rows would be affected for a given class/year/scope/term.
- `/api/fee-structures/apply`
  - Applies `ClassFeeStructure` → creates/updates `StudentFee` rows.
  - Treats `term = null` as a **yearly / one-time** line applied under `TERM1`.
- `/api/student-fees/generate`
  - Older path to generate student fees from `FeeStructure`.

The new simple flow should **reuse** `ClassFeeStructure` and the apply semantics where possible, not replace them.

---

## 3. Business Rules for Simple Fee Creation

From product decisions:

- **Yearly fees**
  - Exactly **one yearly charge per student per year**.
  - Implemented as one `StudentFee` per student, derived from `ClassFeeStructure` with `term = null`.
- **Scope of effect**
  - When a fee is created, it **applies immediately to all existing students** in the target stage(s), for the chosen year/term.
  - If a specific student needs a different amount, their `StudentFee` can be edited on the student profile.
- **Later admissions**
  - New students joining a class **should also receive** the configured fees for that stage and year.
  - Phase 1: we rely on re-running the apply logic per class/year as needed.
  - Phase 2: we will hook this into the student admission / class-change flow automatically.
- **One-time fees**
  - Sometimes **independent of term** conceptually (e.g. Admission, Interview).
  - For now we treat them like yearly lines (term `null`, shown under Term 1), but distinguish them by `FeeCategory.frequency = ONE_TIME`.
- **Stage groups (for now)**
  - `ECDE` → all classes whose `Grade.stage = PRE_PRIMARY` (PP1–PP2 conceptually; specific grade.number mapping handled in data).
  - `Primary` → classes whose `Grade.stage` is `LOWER_PRIMARY` or `UPPER_PRIMARY` and `Grade.level` is between 1–6.
  - The mapping must be **data-driven** via `Grade.stage` and `Grade.level`, so we can add Junior Secondary later without schema changes.

---

## 4. Phase 1 – Simple Stage-Based Fee Creator

### 4.1 Scope

- Introduce a **new, simple form** on the Finance → Fees page.
- Hide the **Class Fee Structure Editor** from the page (keep APIs and component available in code for now).
- Implement a **server action** that:
  - Validates inputs (name, amount, frequency, stage group, year, optional term).
  - Locates the target classes via `Grade.stage`/`Grade.level`.
  - Upserts `FeeCategory` and `ClassFeeStructure` lines.
  - Applies them to existing students by reusing the apply semantics.
  - Implemented in `src/components/forms/SimpleStageFeeForm.tsx` wired into the Finance → Fees page.

### 4.2 UX behaviour

Form fields (exact UI may evolve, but behaviour is fixed):

- **Fee name** (string, required).
- **Amount (KES)** (>= 0, converted to minor units on submit).
- **Frequency**:
  - `Termly`
  - `Yearly`
  - `One-time`
- **Stage group**:
  - `ECDE (PP1–PP2)`
  - `Primary (Grade 1–6)`
- **Academic year** (defaults from `SchoolSettings.currentAcademicYear`).
- **Term**
  - Required only when `frequency = Termly`.
  - Ignored for Yearly and One-time (semantics derive from term `null`).

On submit:

1. **FeeCategory resolution**
   - Find or create `FeeCategory` where:
     - `name = feeName`.
     - `frequency = TERMLY | YEARLY | ONE_TIME` (mapped from UI selection).
   - Mark `active = true`, `isRecurring` consistent with `frequency` (existing behaviour).

2. **Target classes resolution**
   - Fetch relevant `Grade` rows with non-null `stage`.
   - **ECDE**:
     - `Grade.stage = PRE_PRIMARY`.
   - **Primary**:
     - `Grade.stage IN (LOWER_PRIMARY, UPPER_PRIMARY)` and `Grade.level BETWEEN 1 AND 6`.
   - Fetch `Class` rows referencing those `Grade` ids.

3. **ClassFeeStructure upsert** per class
   - For each `classId` in target classes:
     - Choose `term`:
       - Termly → chosen term (TERM1 / TERM2 / TERM3).
       - Yearly → `null`.
       - One-time → `null`.
     - Upsert `ClassFeeStructure` with key `(classId, feeCategoryId, term, academicYear)` and new `amount`.

4. **Apply to existing students**
   - For each affected class and the given year:
     - Reuse the **apply algorithm** as in `/api/fee-structures/apply`:
       - For each `ClassFeeStructure` (filtered by class/year and, if term scope is relevant, by term + yearly-under-Term1 rule):
         - If no `StudentFee` exists for `(studentId, feeCategoryId, termOrTerm1, academicYear)` → create one.
         - If exists and `locked` is `true` → do not change monetary values, only update `sourceStructureId`.
         - If exists and paid more than new amount → update amounts, lock and mark status `paid`.
         - Else update `baseAmount`, `amountDue`, and `status` derived from `amountPaid`.

### 4.3 Data & type considerations

- Introduce a **narrowed server-action input type** for the simple creator, e.g.:
  - `stageGroup: "ECDE" | "PRIMARY"`.
  - `frequency: "TERMLY" | "YEARLY" | "ONE_TIME"`.
  - `amountMinor: number` (internal) / `amountKes: number` (UI).
- Add a corresponding **Zod schema** in `formValidationSchemas.ts` for runtime validation.
- No `any`; favour explicit enums and type aliases.

### 4.4 Out of scope for Phase 1

- No changes to **student creation** / **class change** flows.
- No new reporting or analytics by stage.
- No UI refactor beyond adding one card and hiding `AdminClassFeeEditor` from the Fees page.

---

## 5. Phase 2 – Automatic Fees for New Admissions / Class Changes

### 5.1 Objective

Ensure that **new students automatically receive the appropriate fees** based on existing stage-based definitions, without manual re-apply steps.

### 5.2 Trigger points

- **New student admission**:
  - When a `Student` is created for a particular `classId` and `gradeId`.
- **Class changes** in-year:
  - When a `Student`'s `classId` is updated.

### 5.3 Behaviour

When a trigger occurs for student `S` in class `C` for academic year `Y`:

1. Determine the **current academic year** (`SchoolSettings.currentAcademicYear`) and term if needed.
2. Fetch all `ClassFeeStructure` rows for `(classId = C, academicYear = Y)`.
3. For each structure `s`:
   - Determine `targetTerm`:
     - If `s.term` is non-null → `targetTerm = s.term`.
     - If `s.term` is null → `targetTerm = TERM1` (consistent with existing yearly/one-time behaviour).
   - Check if `StudentFee` already exists for `(S, s.feeCategoryId, targetTerm, Y)`.
   - If not, create a new `StudentFee` mirroring the logic in `/api/fee-structures/apply`.

Notes:

- This is effectively a **per-student version** of the apply logic.
- Must respect `locked` semantics if the student already has fees (e.g. when moving classes mid-year).

### 5.4 Implementation notes

- Identify the single place(s) where students are created/updated in the app.
- Introduce a small helper (server-side) for:
  - `applyClassFeeStructuresToStudent({ studentId, classId, academicYear })`.
- Ensure error handling/logging so failures do not block admission but are visible.
  - Implemented in `src/lib/actions.ts` as `applyClassFeeStructuresToStudent`, and invoked from the `createStudent` and `updateStudent` server actions.

---

## 6. Phase 3+ – Future Enhancements (Optional)

Potential follow-ups once Phase 1–2 are stable:

- **Additional stage groups**
  - Junior Secondary, Senior Secondary, custom school-specific stages.
  - Implemented purely by mapping `Grade.stage` and `Grade.level` to groups.
- **Stage-aware fee reporting**
  - Breakdown of fee income and outstanding balances by `EducationStage` and/or stage group (ECDE, Primary, JSS, etc.).
- **Fee presets per school**
  - Saved templates for common fee configurations per stage/year, clonable year-to-year.
- **CBC-linked financial analytics**
  - Combine CBC progression data with financial insights (e.g. fee waivers linked to support needs).

---

## 7. Tracking & Updating This Plan

- This document lives at: `docs/SIMPLE_FEE_CREATION_PLAN.md`.
- It should be updated whenever we:
  - Change business rules for fee frequency or stage mapping.
  - Adjust how `ClassFeeStructure` maps to `StudentFee`.
  - Implement or refine Phase 2 (admission/class-change hooks).
- Implementation tasks currently tracked:
  - `simple_fee_backend` – Implement backend actions for simplified fee creation.
  - `simple_fee_ui` – Update Fees UI to use simplified fee creation and hide the Class Fee Structure Editor.
