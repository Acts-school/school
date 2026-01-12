# Parent & Student Onboarding Improvements

This document outlines a plan to simplify and scale the process of onboarding parents and students while preserving the existing data model:

- `Parent.address` is the **ID Number** (unique, user-facing identifier).
- `Parent.id` is the **UUID primary key**.
- `Student.parentId` is a **foreign key to `Parent.id`**.

We aim to:

- Reduce friction for day-to-day operations (single-family onboarding).
- Support bulk onboarding (hundreds/thousands of records).
- Maintain data integrity and clear auditing.

---

## Phase 1 – Combined Parent + Student Creation Flow

### Goal

Allow creating a **new parent and a new student in a single flow**, instead of two separate forms.

### UX Concept

- On the **Student creation** screen, add a choice for the parent source:
  - **Option A:** Link to an **existing parent**.
  - **Option B:** **Create new parent** inline.
- When **B** is selected, show an embedded `Parent` section in the same form (fields for name, surname, phone, ID Number, etc.).

### Backend Design

- Add a new server action, e.g. `createParentAndStudent` (name TBD to match conventions).
- Input shape (conceptual):
  - `mode: "existing-parent" | "new-parent"`.
  - `studentData: StudentSchema` (or a close variant).
  - When `mode === "existing-parent"`:
    - Expect a `parentIdNumber` string (maps to `Parent.address`).
  - When `mode === "new-parent"`:
    - Expect `parentData` shaped similarly to `ParentSchema`, including an `idNumber` field that maps to `Parent.address`.
- Implementation:
  - Wrap logic in a **Prisma transaction**.
  - If `mode === "new-parent"`:
    - Create `Parent` with `address = idNumber`.
    - Capture the created `Parent.id`.
  - If `mode === "existing-parent"`:
    - Look up `Parent` by `address = parentIdNumber`.
    - Fail with a clear error if not found.
  - Use `Parent.id` as `Student.parentId` when creating the student.

### Validation & Errors

- Reuse existing Zod schemas where possible; introduce small wrappers or refinements if needed.
- Validate that `idNumber` is **non-empty** and unique (rely on DB uniqueness + translate Prisma `P2002` errors to user-friendly messages).
- Provide clear error messages when:
  - The provided ID Number is already used by another parent (for new parent).
  - The provided ID Number does not exist (for existing parent).

### Constraints & Non-Goals

- **Do not break** existing standalone Parent and Student creation flows; this is an **additional** path.
- Respect existing **UI styling and layout**; only add new options/fields where necessary.
- No changes to Prisma schema at this stage.

---

## Phase 2 – Easier Linking to Existing Parents (Search/Lookup)

### Goal

Make it easier and less error-prone to attach a student to an existing parent, without manually typing raw ID Numbers.

### UX Concept

- Replace the plain text `Parent Id` input in the Student form with a **searchable selector** that can search by:
  - Parent name (name + surname).
  - Phone.
  - ID Number (`Parent.address`).
- When a parent is selected, the component fills the hidden `parentIdNumber` field (or directly the UUID, depending on backend choice).

### Backend & API

- Add a lightweight API endpoint or action to search parents by term:
  - Input: `query: string`.
  - Output: a small list of matches with fields like `{ id, name, surname, phone, idNumber }`.
- Implement server-side filtering with proper limits (e.g. top 10 results).

### Integration with Existing Logic

Two possible integration strategies:

1. **Keep current server action interface**
   - The Student form still submits a **string field** interpreted as the ID Number.
   - The lookup component writes the selected parent’s **ID Number** into that field.
   - No changes to existing `createStudent`/`updateStudent` logic.

2. **Switch to UUID on the wire** (optional, later)
   - The Student form submits the parent’s UUID (`Parent.id`).
   - The server actions skip the `findUnique` by address and use the UUID directly.
   - This would simplify server logic but requires a coordinated change.

For now, prefer **strategy 1** to minimize impact.

---

## Phase 3 – Bulk Import (CSV/Excel)

### Goal

Enable onboarding **large numbers** of parents and students from existing data sources.

### 3.1 Bulk Parent Import

- Provide a CSV template with columns such as:
  - `username`, `password` (or a default password policy),
  - `name`, `surname`, `email`, `phone`,
  - `id_number` (maps to `Parent.address`).
- Flow:
  - Upload CSV via a dedicated page in the dashboard.
  - Backend parses CSV, validates each row, and reports per-row errors.
  - Valid rows are inserted in batches; failures are surfaced clearly.

### 3.2 Bulk Student Import (linking by Parent ID Number)

- Provide a CSV template with columns such as:
  - Student credentials and details.
  - `parent_id_number` (the same value used as `Parent.address`).
  - Grade/class identifiers (e.g. grade level, class name or IDs).
- Flow:
  - For each row, look up `Parent` by `address = parent_id_number`.
  - Validate grade/class existence and map to IDs.
  - Create `Student` rows, accumulating errors without stopping whole file.

### 3.3 Combined Parent + Student Import (optional)

- A more advanced mode where each row includes both parent and student fields.
- Backend behavior:
  - Upsert Parent by `id_number`.
  - Attach student(s) to that parent.

### Technical Considerations

- Use a robust CSV parser and defensive validation; avoid `any` in TypeScript types.
- For large imports, consider processing in **chunks** and storing import logs in DB.
- Provide a downloadable **error report** (CSV of failed rows with reasons).

---

## Phase 4 – Multi-Student Per Parent Flow

### Goal

Make it easy to add multiple children for the same parent.

### UX Concept

- On the **Parent detail** page (or table row actions), add an action:
  - **“Add Student for this Parent”**.
- This opens the Student form with the parent’s ID Number **pre-filled and locked**.
- Optionally show a list of existing students for that parent with quick actions.

### Backend

- Reuse existing Student creation logic; the only change is how the form is pre-populated.
- No schema changes needed.

---

## Phase 5 – Validation, Testing, and Rollout

### Validation

- Unit tests for new server actions (e.g. `createParentAndStudent`, parent search, CSV parsing helpers).
- Integration tests (or manual test scripts) for:
  - Combined Parent+Student creation (both modes).
  - Student creation linking to existing parents via search.
  - Bulk import workflows.

### Data Integrity Checks

- Ensure `Parent.address` remains unique.
- Ensure every `Student.parentId` references an existing `Parent.id`.
- Ensure no orphaned students after imports.

### Rollout Strategy

- Introduce new flows alongside existing ones.
- Once new flows are stable and accepted by users:
  - Optionally de-emphasize or hide older, more cumbersome paths.

---

## Implementation Order (Recommended)

1. **Phase 1 – Combined Parent + Student flow**
   - Immediate impact on day-to-day operations.
2. **Phase 2 – Parent search in Student form**
   - Reduces input errors and speeds up linking.
3. **Phase 3 – Bulk import**
   - Required for large-scale onboarding.
4. **Phase 4 – Multi-student per parent flow**
   - Improves UX for families with multiple children.
5. **Phase 5 – Testing & polish**
   - Ensure stability before heavily relying on new flows.
