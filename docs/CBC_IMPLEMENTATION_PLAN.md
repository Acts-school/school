# CBC Implementation Plan

## 1. Objectives

- **CBC alignment:** Extend the app to support Kenya’s CBC (2–6–3–3–3), competencies, and assessment model without breaking existing workflows.
- **Minimal disruption:** Keep existing `Student`, `Class`, `Grade`, `Subject`, `Lesson`, `Exam`, `Assignment`, `Result` working as is.
- **Incremental rollout:** Add CBC data structures first, then teacher workflows, then reporting/parent views.

### Implementation status (quick view)

| Phase  | Scope                                      | Status |
|--------|--------------------------------------------|--------|
| 1      | Schema extensions (Prisma models/enums)    | ✅     |
| 2      | Backend logic & APIs                       | ✅     |
| 3.1    | Exam/assignment CBC fields in forms        | ✅     |
| 3.2    | Teacher competency entry UI (/teacher/competencies) | ✅     |
| 4      | Student & parent CBC views                 | ✅ (current-term CBC & SLO snapshots live) |
| 5      | Admin / head teacher CBC analytics         | ⏳ (initial analytics live) |

---

## 2. Current State (Summary)

- **Core academic models:**  
  - `Student`, `Parent`, `Teacher`, `Class`, `Grade`, `Subject`, `Lesson`, `Exam`, `Assignment`, `Result`, `Attendance`.
- **Assessment:**  
  - `Result.score: Int` per student, tied to either an `Exam` or `Assignment`.
  - List pages for `exams`, `assignments`, `results` with role‑based filters.
- **School config:**  
  - `SchoolSettings` with `currentAcademicYear`, `currentTerm`, optional `passingScore`.
- **Finance & admin:**  
  - Fees, invoices, payments, payroll (not CBC‑specific but already functional).
- **CBC schema status:**  
  - Implemented in Prisma and migrated:
    - `EducationStage` enum and optional `Grade.stage`.
    - `EducationPathway` enum and optional `Class.pathway`.
    - `CbcCompetency` and `CbcCompetencyLevel` enums.
    - `AssessmentKind` and `CbcGateType` enums.
    - `AssessmentCompetency` join model.
    - `StudentCompetencyRecord` model.
    - `Exam` and `Assignment` extended with `kind`, `cbcGateType`, optional term/year.
    - CBC curriculum hierarchy models: `LearningArea`, `Strand`, `SubStrand`, `SpecificLearningOutcome`.
    - `SloAchievementLevel` enum and `StudentSloRecord` model for per-student SLO progress, linked to `Student`, `SpecificLearningOutcome`, and optional `Teacher`/`Exam`/`Assignment`/`Lesson`, with term and academic year.
    - Initial CBC curriculum data seeded for key Pre-Primary and Upper Primary learning areas (Language/Mathematics Activities; English/Mathematics) with representative strands, sub-strands, and SLOs.

---

## 3. Gaps vs CBC Requirements

- **Structure & stages**
  - ✅ CBC stages enum (`EducationStage`) and optional `Grade.stage` exist, but grades are not yet backfilled or used in logic.
  - ✅ Senior school pathways enum (`EducationPathway`) and optional `Class.pathway` exist, but no UI/logic sets them.
  - ✅ `AssessmentKind` and `CbcGateType` exist and are wired to `Exam`/`Assignment`, and the teacher/admin exam & assignment forms now expose them.
  - ⏳ CBC curriculum hierarchy (learning areas → strands → sub-strands → specific learning outcomes) now exists in the schema (`LearningArea`, `Strand`, `SubStrand`, `SpecificLearningOutcome`) and is **partially seeded** with representative KICD-aligned data for core Pre-Primary and Upper Primary learning areas, but most learning areas/grades are not yet fully seeded or linked to subjects/lessons in UI/logic.

- **Competencies & values**
  - ✅ `CbcCompetency` and `CbcCompetencyLevel` enums added.
  - ✅ `AssessmentCompetency` and `StudentCompetencyRecord` models added.
  - ✅ Backend actions now support tagging exams/assignments with competencies and saving per‑student competency records.
  - ⏳ `CbcCompetencyLevel` currently uses `EMERGING` / `DEVELOPING` / `PROFICIENT` / `ADVANCED`; plan to align to official CBC descriptors (`BELOW_EXPECTATIONS`, `APPROACHING_EXPECTATIONS`, `MEETING_EXPECTATIONS`) in schema, UI labels, and reports.
  - ⏳ No values/life‑skills model yet; still to be designed if needed.

- **Assessment model**
  - ✅ Exams and assignments now carry `kind` (FORMATIVE/SUMMATIVE/NATIONAL_GATE) and optional `cbcGateType`.
  - ✅ Qualitative/ordinal competency judgments stored via `StudentCompetencyRecord`.
  - ⏳ No explicit portfolio/artifact storage yet.

- **CBC‑style reporting & UX**
  - ✅ Basic student and parent dashboard CBC views exist (current-term competency and SLO snapshots on student/parent dashboards), and they now read from explicit term-level judgement tables (`StudentCompetencyRecord` and `StudentSloRecord`).
  - ✅ A first-cut CBC end-of-term **printable PDF report** per student and current term is implemented using `CbcTermReport` and `CbcTermReportDocument`, exposed via `GET /api/cbc-reports/student/[studentId]/pdf` and linked from:
    - Student context: results list (`/list/results`) and student profile shortcuts.
    - Parent context: per-child CBC overview card on the parent dashboard.
    - Teacher context: new `/teacher/cbc-reports` lookup page listing supervised classes and students with PDF links.
    - Admin context: CBC analytics "students needing support" table.
  - ✅ Teacher UI for bulk competency entry exists at `/teacher/competencies` (lesson‑based, for teachers only).
  - ✅ Initial admin overview for CBC progression exists at `/admin/cbc-analytics` (class-level competency distributions and list of students needing support); ⏳ richer filters, stage/grade views, and pathway/gate integration still pending.

- **Outcomes & evidence**
  - ⏳ `Result` remains numeric (`score: Int`) without CBC-style descriptive levels or rubrics; CBC competency levels are tracked separately via `StudentCompetencyRecord` but not yet surfaced as primary assessment in reports.
  - ✅ SLO-level (specific learning outcome) achievement tracking schema implemented via `StudentSloRecord` and `SloAchievementLevel` (`BELOW_EXPECTATIONS`, `APPROACHING_EXPECTATIONS`, `MEETING_EXPECTATIONS`), with per-student/per-SLO/per-term/year records and optional teacher/exam/assignment/lesson context; `StudentSloRecord` now acts as the **term SLO judgement layer** that reports and dashboards read from.
  - ✅ Initial SLO progress data seeded for key Pre-Primary and Upper Primary learning areas (Language/Mathematics Activities; English/Mathematics) with representative SLOs.
  - ✅ Teacher SLO entry UI at `/teacher/slo`, admin SLO analytics on `/admin/cbc-analytics`, and student/parent dashboard SLO snapshots now surface SLO-level data for the current term based on the term judgement layer; ⏳ full SLO-based printable reports and multi-term summaries still pending.
  - ✅ A separate `LearningObservation` model has been introduced at schema level to store raw lesson/task/exam evidence per student/SLO/competency; this is intended for teacher use when forming judgements and is not read directly by reports yet.
  - ⏳ **Backlog:** Inline, read-only snippets of the latest relevant `LearningObservation` (for the selected competency/SLO and context) on the teacher competency and SLO entry screens, to surface evidence without changing existing layout or workflows.
  - ✅ Schema support for structured evidence via `Rubric` and `RubricCriterion` models has been added to capture criteria-based descriptors tied to CBC outcomes.
  - ⏳ Next focus: wire rubrics and criteria into `LearningObservation` capture and analytics (backend-first), so that observations can optionally reference a rubric and criterion-level ratings before introducing any new CBC UI.
  - ⏳ No learner portfolio/evidence model (projects, files, artifacts) linked to competencies or outcomes.

---

## 4. Implementation Phases

### Phase 0 – Design & Migrations Prep

- **[Task]** Finalize CBC mappings:
  - Map `Grade.level` to CBC stages (e.g. 1–3 → LOWER_PRIMARY, etc.).
  - Decide whether pathways are per‑class or per‑student (or both).
- **[Task]** Plan database migrations for Prisma:
  - Ensure new enums/models are backward‑compatible.
  - Decide which fields must be required vs optional.

---

### Phase 1 – Schema Extensions (Prisma)

> Goal: Add CBC concepts to the data model without breaking existing features.

- **Status:** ✅ **Completed and migrated.**

- **1.1 CBC stages and pathways**
  - Added `EducationStage` enum (`PRE_PRIMARY`, `LOWER_PRIMARY`, `UPPER_PRIMARY`, `JUNIOR_SECONDARY`, `SENIOR_SECONDARY`).
  - Added `EducationPathway` enum (`STEM`, `ARTS_SPORTS`, `SOCIAL_SCIENCES`).
  - Extended `Grade` with optional `stage EducationStage?`.
  - Extended `Class` with optional `pathway EducationPathway?`.

- **1.2 Competency model**
  - Added `CbcCompetency` enum for the 7 core competencies.
  - Added `CbcCompetencyLevel` enum (`EMERGING`, `DEVELOPING`, `PROFICIENT`, `ADVANCED`).
  - Added `StudentCompetencyRecord` model with:
    - `studentId`, `teacherId`, `competency`, `level`, `term`, `academicYear`, optional `comment`.
    - Optional links: `examId?`, `assignmentId?`, `lessonId?`.

- **1.3 Assessment metadata**
  - Added `AssessmentKind` enum (`FORMATIVE`, `SUMMATIVE`, `NATIONAL_GATE`).
  - Added `CbcGateType` enum (`KPSEA`, `KILEA`, `SENIOR_EXIT`).
  - Extended `Exam` with `kind`, `cbcGateType`, optional `term` and `academicYear`.
  - Extended `Assignment` with `kind`, optional `term` and `academicYear`.
  - Added `AssessmentCompetency` join model linking `Exam`/`Assignment` to `CbcCompetency`.

- **1.4 Migrations**
  - Ran `npx prisma migrate dev --name add_cbc_support` successfully.
  - Existing queries/pages (`exams`, `assignments`, `results`) remain compatible.

---

### Phase 2 – Backend Logic & APIs

> Goal: Wire CBC concepts into server actions and API handlers.

- **2.1 Extend exam/assignment creation & update** – 
  - `examSchema` and `assignmentSchema` now accept:
    - `kind?: AssessmentKind`
    - `cbcGateType?: CbcGateType`
    - `competencies?: CbcCompetency[]`.
  - `createExam` / `updateExam`:
    - Persist `kind` (default `FORMATIVE`) and optional `cbcGateType`.
    - Create/update related `AssessmentCompetency` rows for targeted competencies.
  - `createAssignment` / `updateAssignment`:
    - Same pattern as exams, using transactions and `AssessmentCompetency`.

- **2.2 Student competency recording** – 
  - Added `studentCompetencyBatchSchema` to validate bulk updates for one competency, term, and year across many students, with optional `lessonId`/`examId`/`assignmentId` context.
  - Added `saveStudentCompetencies` action:
    - Restricted to authenticated teachers with `results.write` permission.
    - For each `(student, competency, term, academicYear, context)`:
      - Deletes existing `StudentCompetencyRecord` rows.
      - Creates a new `StudentCompetencyRecord` with `level` and optional `comment`.

- **2.3 Reporting utilities – ✅ core helpers implemented, further aggregation pending**
  - Added `getCbcTermReport` helper to assemble a structured CBC end-of-term report per student, combining:
    - SLO term judgements from `StudentSloRecord` grouped by learning area/strand/sub-strand.
    - Competency term judgements from `StudentCompetencyRecord`.
    - Evidence summaries from `LearningObservation` and optional rubrics.
  - Added `getTermAttendanceSummary` helper to compute `daysOpen`, `daysPresent`, and `daysAbsent` per student and academic year from `Attendance`, grouped by calendar day.
  - ⏳ Still to add more specialised aggregation helpers (e.g. by class/grade) for CBC dashboards, and to migrate to the stricter CBC level descriptors (`BELOW_EXPECTATIONS`, `APPROACHING_EXPECTATIONS`, `MEETING_EXPECTATIONS`) end-to-end in enums, UI labels, and reports.

---

### Phase 3 – Teacher‑Facing UI

> Goal: Enable teachers to capture CBC‑style assessments and competencies easily.

- **3.1 Exam/assignment form extensions – ✅ Implemented**
  - `ExamForm` and `AssignmentForm` now include CBC fields for admins/teachers:
    - `Assessment kind` (FORMATIVE/SUMMATIVE/NATIONAL_GATE).
    - If `NATIONAL_GATE`, a `Gate type` select (KPSEA/KILEA/SENIOR_EXIT).
    - `Target competencies` – multi‑select of the 7 CBC competencies.
  - These fields bind to `examSchema` / `assignmentSchema` and are persisted via `createExam` / `updateExam` and `createAssignment` / `updateAssignment`, which manage `AssessmentCompetency` rows in a transaction.

- **3.2 Competency entry screen – ✅ Implemented (lesson‑based)**
  - New teacher‑only page `(dashboard)/teacher/competencies`:
    - Uses `TeacherCompetencyManagement` to fetch the teacher’s lessons via `/api/teacher-lessons`.
    - Lets the teacher select academic year, term, one `CbcCompetency`, and a lesson.
    - Lists students in the selected lesson’s class.
    - For each student, the teacher selects a `CbcCompetencyLevel` and can enter an optional comment.
    - Submission sends a `StudentCompetencyBatchSchema` payload to `saveStudentCompetencies`, which writes `StudentCompetencyRecord` rows.
  - Navigation: a `CBC Competencies` menu item is available for the teacher role and routes to `/teacher/competencies`.

- **3.3 Teacher CBC overview**
  - Per‑class CBC view:
    - Table of students vs competencies with current term `level`.
    - Highlight learners who are `EMERGING` on multiple competencies.

---

### Phase 4 – Student & Parent Views

> Goal: Expose CBC information in a way non‑teachers can understand.

- **4.1 Student CBC profile – ✅ current-term snapshots implemented**
  - The student dashboard `/student` now shows, in the right-hand column:
    - A **current-term competency snapshot**: one line per competency with a friendly label (e.g. "Communication & Collaboration") and a badge showing the latest `CbcCompetencyLevel` for the current term, plus any teacher comment.
    - A **current-term SLO snapshot**: up to a small number of the latest SLO records for the current term, grouped by learning area, showing learning area name, strand and sub-strand (e.g. `Strand · Sub-strand`), a short SLO description, and a badge with the `SloAchievementLevel` label (`Below expectations`, `Approaching expectations`, `Meeting expectations`).
  - ⏳ Still to add: multi-term history, explicit dates/teachers per record, and clear markers for national gate assessments (KPSEA/KILEA/Senior).

- **4.2 Parent dashboard – ✅ per-child CBC & SLO snapshots implemented**
  - For each child, the parent dashboard CBC card now shows:
    - A **current-term competency overview**: one row per competency with a friendly label and level badge from `CbcCompetencyLevel`, along with key teacher comments where present.
    - A **current-term SLO snapshot**: up to a small number of the latest SLOs for the current term, summarised by learning area with strand/sub-strand and SLO description, plus a badge for the `SloAchievementLevel`.
  - ⏳ Still to add: gate exam results integration, more narrative parent-friendly summaries, and historical views across terms/years.

---

### Phase 5 – Admin / Head Teacher CBC Analytics

> Goal: Support school leadership decisions (progress, interventions, pathways).

- **5.1 Class/grade summaries**
  - Views per grade/stage:
    - Distribution of competency levels per competency.
    - List of students needing support (e.g. mostly `EMERGING`).

- **5.2 Pathway support (G10–G12)**
  - For senior secondary:
    - Combine:
      - National gate exam performance.
      - Competency profile (especially critical thinking, digital literacy, self‑efficacy).
    - Provide a summary that can help guide pathway placement (STEM / Arts & Sports / Social Sciences).

---

### Phase 6 – CBC Curriculum Structure (Learning Areas, Strands, SLOs)

> Goal: Represent the CBC curriculum hierarchy (learning areas → strands → sub-strands → specific learning outcomes) in the data model in a way that can later power teacher workflows and analytics without breaking existing subject-based features.

- **6.1 Schema design (Prisma)**
  - Introduce explicit CBC curriculum entities, keeping names aligned with official CBC terms:
    - `LearningArea` (CBC learning area per stage/grade, e.g. Environmental Activities, Agriculture & Nutrition).
    - `Strand` (major theme within a learning area).
    - `SubStrand` (more granular unit under a strand).
    - `SpecificLearningOutcome` (SLO) attached to sub-strands.
  - Decide how these relate to existing `Subject`/`Lesson` models:
    - Option A: Map each CBC `LearningArea` to an existing `Subject` row where appropriate.
    - Option B: Keep CBC curriculum entities separate and only reference them from CBC-specific features.

- **6.2 Backward compatibility & migration plan**
  - Keep all existing `Subject`/topic usage working as-is for non-CBC or legacy data.
  - Allow gradual adoption:
    - Schools can continue to create `Lesson` entries tied to `Subject` while we progressively associate lessons with CBC `LearningArea`/`Strand`/`SubStrand` where relevant.
  - Avoid forced backfill: design relations so that older data without CBC curriculum links remains valid.

- **6.3 Future usage in CBC features**
  - Use CBC curriculum entities to enrich:
    - Teacher competency entry (optional selection of learning area/strand/sub-strand/SLO when recording competencies).
    - Admin analytics (filtering or aggregating competency records by learning area/strand).
  - Keep this phase schema-first; defer large UI changes until there is a clear, minimal pattern that fits existing pages.

---

### Phase 7 – Outcome-Based Assessment & SLO Tracking

> Goal: Introduce CBC-style outcome-based assessment that can complement or, where appropriate, replace raw numeric scores, starting from early CBC stages.

- **7.1 Result descriptors (non-breaking)**
  - Add optional descriptive fields around `Result` to allow mapping numeric scores to CBC-friendly levels without breaking existing marks:
    - e.g. an enum or derived label reflecting `BELOW_EXPECTATIONS` / `APPROACHING_EXPECTATIONS` / `MEETING_EXPECTATIONS`.
  - Keep existing `score: Int` for legacy and upper-level use; use descriptors primarily in CBC-facing reports.

- **7.2 SLO-level tracking (schema) – ✅ Implemented**
  - Added `SloAchievementLevel` enum (`BELOW_EXPECTATIONS`, `APPROACHING_EXPECTATIONS`, `MEETING_EXPECTATIONS`).
  - Added `StudentSloRecord` model to record learner progress against `SpecificLearningOutcome` rows, linked to `studentId`, `sloId`, `term`, `academicYear`, and optional `comment`.
  - Each SLO record can be tied to optional context (`teacherId?`, `examId?`, `assignmentId?`, `lessonId?`) and is indexed by `(studentId, academicYear, term)` and `(sloId, academicYear, term)` for reporting.
  - Migration applied via `npx prisma migrate dev --name add_cbc_slo_progress`.

- **7.3 CBC report support**
  - ✅ Implemented `getCbcTermReport` helper and `GET /api/cbc-reports/student` JSON endpoint to expose an end-of-term CBC report structure per student and term, combining:
    - SLO judgements grouped by learning area/strand/sub-strand.
    - Core competencies with levels and evidence summaries.
  - ✅ Implemented `CbcTermReportDocument` React PDF component and `GET /api/cbc-reports/student/[studentId]/pdf` route to render a Kenya-ready CBC end-of-term learner progress report (A4, portrait) with:
    - Header block, learner identification strip, learning areas and competencies tables.
    - Values section, narrative comment blocks, attendance summary, conditional pathway readiness (JSS only), signature block, and footer.
  - ✅ Wired role-appropriate entry points (student, parent, teacher, admin) to open the PDF inline in a new tab.
  - ⏳ Future enhancements: multi-term and multi-year variants, pre-primary/JS-specific layouts, deeper evidence summaries, and richer narrative comment handling.

---

### Phase 8 – Learner Portfolios & Evidence

> Goal: Store and relate learner artifacts (projects, files, observations) to competencies and outcomes in a way that supports CBC evidence requirements.

- **8.1 Portfolio schema**
  - Introduce a simple `PortfolioItem`-style model tied to `studentId`, with title, optional description, file or reference URL, term, and academic year.
  - Allow optional links to `StudentCompetencyRecord`, `SpecificLearningOutcome`, and/or `Exam`/`Assignment` where relevant.

- **8.2 Gradual rollout**
  - Start with backend support and minimal admin/teacher-facing lists; defer rich file management and UI until core CBC workflows are stable.

- **8.3 Reporting hooks**
  - Ensure portfolio items can be surfaced alongside competency levels and SLO status in future CBC report views, without locking in a specific report-card layout yet.

---

## 5. Data Migration & Backward Compatibility

- **5.1 Backfill stages**
  - Script to populate `Grade.stage` based on `Grade.level`.
  - Ensure new fields default sensibly to avoid breaking queries.

- **5.2 Optional retro‑tagging**
  - Optionally:
    - Mark some existing exams as `SUMMATIVE`.
    - Tag key school exams as `NATIONAL_GATE` where applicable.
    - Add high‑level competency tags to common assessments.

- **5.3 Progressive enablement**
  - Initially:
    - Keep CBC features off by default at UI level.
    - Enable per school or per environment once tested.

---

## 6. Testing & QA

- **Unit / integration tests**
  - Verify:
    - Exams/assignments creation still works without CBC fields.
    - Competency records are created correctly and tied to the right students/assessments.
  - Validate aggregation functions for reports.

- **Role‑based access tests**
  - Ensure:
    - Only teachers/admin can write CBC data.
    - Students/parents can only view their own CBC info.

- **Performance checks**
  - For large classes:
    - Ensure competency entry pages and reports remain responsive.

---

## 7. Documentation & Training

- **Internal docs**
  - Update developer docs to cover:
    - New enums/models.
    - New server actions and UI components.
- **User‑facing help**
  - Short guides/screenshots for:
    - Teachers: how to record CBC competencies.
    - Parents: how to read CBC competency views.

---

## 8. CBC Backlog (Pending Implementations)

> High-level backlog of remaining CBC work, grouped by area. These items build on the implemented schema, teacher flows, dashboards, and initial analytics, and can be tackled incrementally.

- **Teacher UX & daily workflows**
  - Inline, read-only `LearningObservation` snippets on existing teacher screens (competency entry at `/teacher/competencies` and SLO entry at `/teacher/slo`), showing the latest relevant evidence without changing layout.
  - Optional quick links from observation snippets back to the original lesson/task context for teacher review.

- **Student & parent views**
  - Multi-term CBC history on student and parent dashboards (competencies and SLOs across terms/years, with clearer term context and teacher attribution).
  - Integration of national gate assessments (`cbcGateType` and key results) into parent-friendly CBC summaries.

- **Admin / head teacher analytics**
  - Richer filters on `/admin/cbc-analytics` (by stage, grade, class, term, learning area, and competency), including SLO-level drill-downs.
  - Pathway-support views for senior secondary (combining gate exams, competency profiles, and SLO evidence to support STEM/Arts & Sports/Social Sciences decisions).

- **Curriculum & data foundations**
  - Seed remaining CBC curriculum data (learning areas, strands, sub-strands, SLOs) beyond the initial representative sets, for all grades/stages in active use.
  - Decide and implement the mapping between CBC `LearningArea`/`Strand` and existing `Subject`/`Lesson` for schools that want tighter alignment.
  - Backfill `Grade.stage` based on `Grade.level` and, if adopted, set `Class.pathway` values for relevant classes.
  - Design and, if needed, implement a values/life-skills model aligned with CBC, linked to students and/or classes.

- **Reporting & evidence**
  - Enhance the existing end-of-term CBC PDF report powered by `CbcTermReport` and `CbcTermReportDocument` to support:
    - Multi-term and multi-year views where needed (e.g. history sections on separate pages).
    - Stage-specific layout variants (e.g. simplified pre-primary, pathway-focused junior/senior secondary).
    - Clearer integration of class/teacher comments and richer evidence summaries.
  - SLO-based printable reports (per learning area/strand/sub-strand) suitable for sharing with parents and archiving.
  - Learner portfolio/evidence model (files, projects, artifacts) linked to competencies, SLOs, and/or assessments, with minimal UI for attaching and reviewing items.
