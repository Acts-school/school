# Project tree (ASCII)

Below is a detailed ASCII diagram of this repository. node_modules and .next folders are intentionally omitted.

```text
scholara-feat/
├─ .agents/
│  └─ rules/
│     └─ strict-typescript-ssystem-no-any-smart-type-inference.md
├─ .env
├─ .env.example
├─ .env.local
├─ .eslintrc.json
├─ .github/
│  └─ workflows/
│     ├─ ci.yml
│     ├─ migrate.yml
│     └─ neon_workflow.yml
├─ .gitignore
├─ .prettierrc
├─ .windsurf/
│  └─ rules/
│     └─ strict-typescript-system-no-any-smart-type-inference.md
├─ ADMIN_PANEL_PLAN.md
├─ build.log
├─ docker-compose.yml
├─ Dockerfile
├─ docs/
│  ├─ CBC_IMPLEMENTATION_PLAN.md
│  ├─ fee-redesign-plan.md
│  ├─ FINANCE_FEES_PAGE_GUIDE.md
│  ├─ LMS_BACKLOG.md
│  ├─ M-Pesa_Integration_Checklist_for_School_Fees_System.md
│  ├─ MPESA_C2B_ACCOUNT_PATTERN.md
│  ├─ parent-student-onboarding-plan.md
│  ├─ SIMPLE_FEE_CREATION_PLAN.md
│  ├─ YVONE.csv
│  └─ YVONE.xlsx
├─ FEE_STRUCTURE.md
├─ fix-all-broken.js
├─ fix-api-routes.js
├─ fix-broken-routes.js
├─ fix-ensure-permission.js
├─ generate_tree.js
├─ HOSTINGER_VPS_DEPLOYMENT_PLAN.md
├─ IMPLEMENTATION_PLAN.md
├─ lms_phase_two_implementation_plan.md
├─ lms_phase_two_task.md
├─ lsm_phase_one_implementation_plan.md
├─ MPESA_INTEGRATION.md
├─ next-env.d.ts
├─ next-types-js.d.ts
├─ next.config.mjs
├─ OFFLINE_PWA_SYNC_PLAN.md
├─ package-lock.json
├─ package.json
├─ pnpm-lock.yaml
├─ postcss.config.mjs
├─ PRINTING_SUPPORT_PLAN.md
├─ prisma/
│  ├─ migrations/
│  │  ├─ 20240905145454_init/
│  │  │  └─ migration.sql
│  │  ├─ 20240913083652_addbirthday/
│  │  │  └─ migration.sql
│  │  ├─ 20250929091402_add_passwords_with_default/
│  │  │  └─ migration.sql
│  │  ├─ 20251122171437_remove_default_password_hashes/
│  │  │  └─ migration.sql
│  │  ├─ 20251125202553_add_finance_models/
│  │  │  └─ migration.sql
│  │  ├─ 20251125211953_add_accountant/
│  │  │  └─ migration.sql
│  │  ├─ 20251126102941_add_fee_management/
│  │  │  └─ migration.sql
│  │  ├─ 20251127110824_add_staff_and_payroll/
│  │  │  └─ migration.sql
│  │  ├─ 20251128152543_fee_module_redesign/
│  │  │  └─ migration.sql
│  │  ├─ 20251128190344_add_unique_school_paymentinfo_name/
│  │  │  └─ migration.sql
│  │  ├─ 20251201121904_add_school_settings/
│  │  │  └─ migration.sql
│  │  ├─ 20251202194403_add_user_preferences/
│  │  │  └─ migration.sql
│  │  ├─ 20251203201225_add_budget_models/
│  │  │  └─ migration.sql
│  │  ├─ 20251208145147_add_student_fee_base_and_discount/
│  │  │  └─ migration.sql
│  │  ├─ 20251209090241_multi_school_phase1/
│  │  │  └─ migration.sql
│  │  ├─ 20251210092616_add_mpesa_transaction/
│  │  │  └─ migration.sql
│  │  ├─ 20251220084633_add_messages/
│  │  │  └─ migration.sql
│  │  ├─ 20251221121816_add_twilio_messaging/
│  │  │  └─ migration.sql
│  │  ├─ 20251221201820_add_sms_notification/
│  │  │  └─ migration.sql
│  │  ├─ 20251224211149_add_cbc_support/
│  │  │  └─ migration.sql
│  │  ├─ 20251227131825_add_cbc_curriculum_structure/
│  │  │  └─ migration.sql
│  │  ├─ 20251227143347_add_cbc_slo_progress/
│  │  │  └─ migration.sql
│  │  ├─ 20251229201128_add_image_asset/
│  │  │  └─ migration.sql
│  │  ├─ 20251229221943_parent_address_unique_id_number/
│  │  │  └─ migration.sql
│  │  ├─ 20260102192452_cbc_term_judgement_layer/
│  │  │  └─ migration.sql
│  │  ├─ 20260105115239_add_payment_idempotency_fields/
│  │  │  └─ migration.sql
│  │  ├─ 20260106210631_attendance_schema_change/
│  │  │  └─ migration.sql
│  │  ├─ 20260106220245_offline_writes_for_results_assessments/
│  │  │  └─ migration.sql
│  │  ├─ 20260107103856_add_assignment_offline_fields/
│  │  │  └─ migration.sql
│  │  ├─ 20260110003111_add_legacy_paypill/
│  │  │  └─ migration.sql
│  │  ├─ 20260110010013_add_phone_learning/
│  │  │  └─ migration.sql
│  │  ├─ 20260110103608_add_admission_fields/
│  │  │  └─ migration.sql
│  │  ├─ 20260113190921_parent_student_multi_parent/
│  │  │  └─ migration.sql
│  │  ├─ 20260114062656_student_status/
│  │  │  └─ migration.sql
│  │  ├─ 20260114073649_class_name_per_school/
│  │  │  └─ migration.sql
│  │  ├─ 20260211055954_add_student_fee_payment_allocation/
│  │  │  └─ migration.sql
│  │  └─ migration_lock.toml
│  ├─ reset-and-seed-minimal.ts
│  ├─ schema.prisma
│  ├─ seed-dev.ts
│  ├─ seed-fees.ts
│  ├─ seed-learning-areas.ts
│  ├─ seed-simple.ts
│  └─ seed.ts
├─ PROD_READINESS_PLAN.md
├─ PROJECT_TREE.md
├─ public/
│  ├─ announcement.png
│  ├─ assignment.png
│  ├─ attendance.png
│  ├─ avatar.png
│  ├─ avatarr.png
│  ├─ blood.png
│  ├─ calendar.png
│  ├─ class.png
│  ├─ close.png
│  ├─ create.png
│  ├─ date.png
│  ├─ delete.png
│  ├─ exam.png
│  ├─ filter.png
│  ├─ finance.png
│  ├─ home.png
│  ├─ lesson.png
│  ├─ logo.png
│  ├─ logo1.png
│  ├─ logout.png
│  ├─ mail.png
│  ├─ maleFemale.png
│  ├─ manifest.json
│  ├─ message.png
│  ├─ mockup1.png
│  ├─ more.png
│  ├─ moreDark.png
│  ├─ noAvatar.png
│  ├─ parent.png
│  ├─ phone.png
│  ├─ profile.png
│  ├─ result.png
│  ├─ search.png
│  ├─ setting.png
│  ├─ singleAttendance.png
│  ├─ singleBranch.png
│  ├─ singleClass.png
│  ├─ singleLesson.png
│  ├─ sort.png
│  ├─ stairs.png
│  ├─ student.png
│  ├─ subject.png
│  ├─ sw.js
│  ├─ teacher.png
│  ├─ update.png
│  ├─ upload.png
│  └─ view.png
├─ README.md
├─ Screenshot 2026-01-20 024247.png
├─ scripts/
│  ├─ backfill-default-school.ts
│  └─ check-seed.js
├─ sentry.client.config.ts
├─ sentry.server.config.ts
├─ src/
│  ├─ __tests__/
│  │  ├─ actions.server-actions.test.ts
│  │  ├─ authz.finance-permissions.test.ts
│  │  ├─ authz.results-permissions.test.ts
│  │  ├─ env.test.ts
│  │  ├─ feeEngine.test.ts
│  │  ├─ mpesa.c2b.confirm.test.ts
│  │  ├─ rbac.test.ts
│  │  ├─ seedFees.integration.test.ts
│  │  └─ seo.test.ts
│  ├─ .env.staging
│  ├─ app/
│  │  ├─ (dashboard)/
│  │  │  ├─ admin/
│  │  │  │  ├─ cbc-analytics/
│  │  │  │  │  └─ page.tsx
│  │  │  │  └─ page.tsx
│  │  │  ├─ cbc-reports/
│  │  │  │  └─ student/
│  │  │  │     └─ [studentId]/
│  │  │  │        └─ print/
│  │  │  │           └─ page.tsx
│  │  │  ├─ finance/
│  │  │  │  ├─ aging/
│  │  │  │  │  ├─ bucket/
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ export/
│  │  │  │  │  │  └─ route.ts
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ budget/
│  │  │  │  │  ├─ [yearId]/
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  ├─ import/
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ clearance/
│  │  │  │  │  ├─ export/
│  │  │  │  │  │  └─ route.ts
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ collections/
│  │  │  │  │  ├─ export/
│  │  │  │  │  │  └─ route.ts
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ debtors/
│  │  │  │  │  ├─ export/
│  │  │  │  │  │  └─ route.ts
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ expenses/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ fees/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ invoices/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ mpesa-review/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ offline/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ payroll/
│  │  │  │  │  ├─ [periodId]/
│  │  │  │  │  │  ├─ page.tsx
│  │  │  │  │  │  └─ print/
│  │  │  │  │  │     └─ page.tsx
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ receipts/
│  │  │  │  │  ├─ [paymentId]/
│  │  │  │  │  │  └─ print/
│  │  │  │  │  │     └─ page.tsx
│  │  │  │  │  └─ multi/
│  │  │  │  │     └─ [paymentId]/
│  │  │  │  │        └─ print/
│  │  │  │  │           └─ page.tsx
│  │  │  │  ├─ reports/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ staff/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ statements/
│  │  │  │  │  └─ student/
│  │  │  │  │     └─ [studentId]/
│  │  │  │  │        └─ print/
│  │  │  │  │           └─ page.tsx
│  │  │  │  └─ students/
│  │  │  │     └─ [studentId]/
│  │  │  │        └─ fees/
│  │  │  │           └─ page.tsx
│  │  │  ├─ layout.tsx
│  │  │  ├─ list/
│  │  │  │  ├─ announcements/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ assignments/
│  │  │  │  │  ├─ [id]/
│  │  │  │  │  │  ├─ submissions/
│  │  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  │  └─ submit/
│  │  │  │  │  │     └─ page.tsx
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ attendance/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ classes/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ events/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ exams/
│  │  │  │  │  ├─ [id]/
│  │  │  │  │  │  └─ take/
│  │  │  │  │  │     └─ page.tsx
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ fees/
│  │  │  │  │  └─ [id]/
│  │  │  │  ├─ lessons/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ loading.tsx
│  │  │  │  ├─ messages/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ parents/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ results/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ students/
│  │  │  │  │  ├─ [id]/
│  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ subjects/
│  │  │  │  │  ├─ [id]/
│  │  │  │  │  │  ├─ builder/
│  │  │  │  │  │  │  └─ page.tsx
│  │  │  │  │  │  └─ learn/
│  │  │  │  │  │     └─ page.tsx
│  │  │  │  │  └─ page.tsx
│  │  │  │  └─ teachers/
│  │  │  │     ├─ [id]/
│  │  │  │     │  └─ page.tsx
│  │  │  │     └─ page.tsx
│  │  │  ├─ logout/
│  │  │  │  └─ page.tsx
│  │  │  ├─ parent/
│  │  │  │  ├─ fees/
│  │  │  │  │  └─ page.tsx
│  │  │  │  └─ page.tsx
│  │  │  ├─ profile/
│  │  │  │  └─ page.tsx
│  │  │  ├─ schools/
│  │  │  │  └─ page.tsx
│  │  │  ├─ settings/
│  │  │  │  └─ page.tsx
│  │  │  ├─ student/
│  │  │  │  ├─ fees/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ lms/
│  │  │  │  │  └─ page.tsx
│  │  │  │  └─ page.tsx
│  │  │  ├─ super/
│  │  │  │  └─ page.tsx
│  │  │  └─ teacher/
│  │  │     ├─ cbc-reports/
│  │  │     │  └─ page.tsx
│  │  │     ├─ competencies/
│  │  │     │  └─ page.tsx
│  │  │     ├─ fees/
│  │  │     │  └─ page.tsx
│  │  │     ├─ lms/
│  │  │     │  └─ page.tsx
│  │  │     ├─ page.tsx
│  │  │     ├─ slo/
│  │  │     │  └─ page.tsx
│  │  │     ├─ tasks/
│  │  │     │  └─ page.tsx
│  │  │     └─ today/
│  │  │        └─ page.tsx
│  │  ├─ [[...sign-in]]/
│  │  │  └─ page.tsx
│  │  ├─ api/
│  │  │  ├─ announcement/
│  │  │  │  ├─ form-data/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ announcements/
│  │  │  │  └─ route.ts
│  │  │  ├─ assignment/
│  │  │  │  ├─ form-data/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ assignments/
│  │  │  │  └─ route.ts
│  │  │  ├─ assignmentSubmissions/
│  │  │  │  ├─ [id]/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ attendance/
│  │  │  │  ├─ form-data/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ attendances/
│  │  │  │  └─ route.ts
│  │  │  ├─ audit-logs/
│  │  │  │  └─ route.ts
│  │  │  ├─ bulk-attendance/
│  │  │  │  └─ route.ts
│  │  │  ├─ cbc-reports/
│  │  │  │  └─ student/
│  │  │  │     ├─ [studentId]/
│  │  │  │     │  └─ pdf/
│  │  │  │     │     └─ route.ts
│  │  │  │     └─ route.ts
│  │  │  ├─ cbc-rubrics/
│  │  │  │  └─ route.ts
│  │  │  ├─ cbc-slos/
│  │  │  │  └─ route.ts
│  │  │  ├─ cbc-task-marks/
│  │  │  │  └─ route.ts
│  │  │  ├─ class/
│  │  │  │  └─ form-data/
│  │  │  │     └─ route.ts
│  │  │  ├─ classes/
│  │  │  │  └─ route.ts
│  │  │  ├─ current-school/
│  │  │  │  └─ route.ts
│  │  │  ├─ event/
│  │  │  │  ├─ form-data/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ events/
│  │  │  │  └─ route.ts
│  │  │  ├─ exam/
│  │  │  │  └─ form-data/
│  │  │  │     └─ route.ts
│  │  │  ├─ exams/
│  │  │  │  ├─ [id]/
│  │  │  │  │  ├─ attempt/
│  │  │  │  │  │  └─ route.ts
│  │  │  │  │  └─ questions/
│  │  │  │  │     └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ fee-categories/
│  │  │  │  └─ route.ts
│  │  │  ├─ fee-structures/
│  │  │  │  ├─ [id]/
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ apply/
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ preview/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ fees/
│  │  │  │  ├─ form-data/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ images/
│  │  │  │  ├─ [id]/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ upload/
│  │  │  │     └─ route.ts
│  │  │  ├─ learning-observations/
│  │  │  │  └─ route.ts
│  │  │  ├─ lesson/
│  │  │  │  ├─ form-data/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ lessonMaterials/
│  │  │  │  ├─ [id]/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ lessonProgress/
│  │  │  │  └─ route.ts
│  │  │  ├─ lessons/
│  │  │  │  └─ route.ts
│  │  │  ├─ messages/
│  │  │  │  ├─ recipients/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ mpesa/
│  │  │  │  ├─ c2b/
│  │  │  │  │  ├─ confirm/
│  │  │  │  │  │  └─ route.ts
│  │  │  │  │  └─ validate/
│  │  │  │  │     └─ route.ts
│  │  │  │  ├─ callback/
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ initiate/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ review/
│  │  │  │     └─ route.ts
│  │  │  ├─ parent/
│  │  │  │  ├─ form-data/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ parents/
│  │  │  │  └─ route.ts
│  │  │  ├─ payments/
│  │  │  │  ├─ multi/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ pdf/
│  │  │  │  ├─ cbc-reports/
│  │  │  │  │  └─ student/
│  │  │  │  │     └─ [studentId]/
│  │  │  │  │        └─ route.ts
│  │  │  │  ├─ payroll/
│  │  │  │  │  └─ [periodId]/
│  │  │  │  │     └─ route.ts
│  │  │  │  └─ receipts/
│  │  │  │     └─ [paymentId]/
│  │  │  │        └─ route.ts
│  │  │  ├─ questions/
│  │  │  │  ├─ [id]/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ receipts/
│  │  │  │  └─ [paymentId]/
│  │  │  │     ├─ compact/
│  │  │  │     │  └─ route.ts
│  │  │  │     └─ pdf/
│  │  │  │        └─ route.ts
│  │  │  ├─ result/
│  │  │  │  ├─ form-data/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ results/
│  │  │  │  └─ route.ts
│  │  │  ├─ student/
│  │  │  │  └─ form-data/
│  │  │  │     └─ route.ts
│  │  │  ├─ student-fees/
│  │  │  │  ├─ by-student/
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ generate/
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ my/
│  │  │  │  │  ├─ route.ts
│  │  │  │  │  └─ summary/
│  │  │  │  │     └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  ├─ students/
│  │  │  │  └─ route.ts
│  │  │  ├─ subject/
│  │  │  │  └─ form-data/
│  │  │  │     └─ route.ts
│  │  │  ├─ subjects/
│  │  │  │  └─ route.ts
│  │  │  ├─ sync/
│  │  │  │  ├─ assignments/
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ attendance/
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ bootstrap/
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ changes/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ results/
│  │  │  │     └─ route.ts
│  │  │  ├─ teacher/
│  │  │  │  └─ form-data/
│  │  │  │     └─ route.ts
│  │  │  ├─ teacher-assignments/
│  │  │  │  └─ route.ts
│  │  │  ├─ teacher-lessons/
│  │  │  │  └─ route.ts
│  │  │  ├─ teachers/
│  │  │  │  └─ route.ts
│  │  │  └─ units/
│  │  │     ├─ [id]/
│  │  │     │  └─ route.ts
│  │  │     └─ route.ts
│  │  ├─ error.tsx
│  │  ├─ favicon.ico
│  │  ├─ global-error.tsx
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  ├─ not-found.tsx
│  │  ├─ robots.ts
│  │  └─ sitemap.ts
│  ├─ components/
│  │  ├─ AddStaffPayrollRowButton.tsx
│  │  ├─ AdminClassFeeEditor.tsx
│  │  ├─ AnnouncementListClient.tsx
│  │  ├─ Announcements.tsx
│  │  ├─ AssignmentListClient.tsx
│  │  ├─ AttendanceChart.tsx
│  │  ├─ AttendanceChartContainer.tsx
│  │  ├─ AttendanceListClient.tsx
│  │  ├─ AttendanceManagement.tsx
│  │  ├─ BigCalendarContainer.tsx
│  │  ├─ BigCalender.tsx
│  │  ├─ Breadcrumbs.tsx
│  │  ├─ BulkClearanceReminderButton.tsx
│  │  ├─ cbc/
│  │  │  └─ CbcTermReportPrint.tsx
│  │  ├─ CbcCompetencyPanel.tsx
│  │  ├─ CbcLearningJourneyPanel.tsx
│  │  ├─ ClassListClient.tsx
│  │  ├─ ClearanceSearchClient.tsx
│  │  ├─ ClearanceStudentPaymentModal.tsx
│  │  ├─ ClearanceStudentRowActions.tsx
│  │  ├─ ClosePayrollPeriodButton.tsx
│  │  ├─ CountChart.tsx
│  │  ├─ CountChartContainer.tsx
│  │  ├─ CourseBuilderClient.tsx
│  │  ├─ EventCalendar.tsx
│  │  ├─ EventCalendarContainer.tsx
│  │  ├─ EventList.tsx
│  │  ├─ EventListClient.tsx
│  │  ├─ ExamListClient.tsx
│  │  ├─ FeeCategoryManager.tsx
│  │  ├─ FeeDetailClient.tsx
│  │  ├─ finance/
│  │  │  ├─ PrintReceiptToolbar.tsx
│  │  │  └─ ThermalReceipt.tsx
│  │  ├─ FinanceChart.tsx
│  │  ├─ FinanceChartContainer.tsx
│  │  ├─ FinanceOfflineDiagnosticsClient.tsx
│  │  ├─ FormContainer.tsx
│  │  ├─ FormContainerClient.tsx
│  │  ├─ FormModal.tsx
│  │  ├─ forms/
│  │  │  ├─ AnnouncementForm.tsx
│  │  │  ├─ AssignmentForm.tsx
│  │  │  ├─ AttendanceForm.tsx
│  │  │  ├─ BudgetSectionAddItemForm.tsx
│  │  │  ├─ ChangePasswordForm.tsx
│  │  │  ├─ ClassForm.tsx
│  │  │  ├─ EventForm.tsx
│  │  │  ├─ ExamForm.tsx
│  │  │  ├─ ExpenseForm.tsx
│  │  │  ├─ FeeForm.tsx
│  │  │  ├─ FeeStructureForm.tsx
│  │  │  ├─ ImportBudgetCsvForm.tsx
│  │  │  ├─ InvoiceForm.tsx
│  │  │  ├─ LessonForm.tsx
│  │  │  ├─ ParentForm.tsx
│  │  │  ├─ PaymentForm.tsx
│  │  │  ├─ PayrollPeriodForm.tsx
│  │  │  ├─ PreferencesForm.tsx
│  │  │  ├─ ProfileForm.tsx
│  │  │  ├─ ResultForm.tsx
│  │  │  ├─ SettingsForm.tsx
│  │  │  ├─ SimpleStageFeeForm.tsx
│  │  │  ├─ StaffForm.tsx
│  │  │  ├─ StaffPayrollRowForm.tsx
│  │  │  ├─ StudentForm.tsx
│  │  │  ├─ SubjectForm.tsx
│  │  │  └─ TeacherForm.tsx
│  │  ├─ InputField.tsx
│  │  ├─ LessonListClient.tsx
│  │  ├─ LessonObservationCard.tsx
│  │  ├─ LessonViewerClient.tsx
│  │  ├─ LmsDashboardClient.tsx
│  │  ├─ LmsTimetableCard.tsx
│  │  ├─ LogoutButton.tsx
│  │  ├─ ManualFeeReminderForm.tsx
│  │  ├─ ManualStudentFeeAdjustmentForm.tsx
│  │  ├─ MaterialManager.tsx
│  │  ├─ Menu.tsx
│  │  ├─ MenuClient.tsx
│  │  ├─ MessagesClient.tsx
│  │  ├─ MpesaReviewClient.tsx
│  │  ├─ MyStudentFeesClient.tsx
│  │  ├─ Navbar.tsx
│  │  ├─ Pagination.tsx
│  │  ├─ ParentFeesClient.tsx
│  │  ├─ ParentListClient.tsx
│  │  ├─ Performance.tsx
│  │  ├─ PrefillPayrollFromBudgetButton.tsx
│  │  ├─ Providers.tsx
│  │  ├─ QuestionBankClient.tsx
│  │  ├─ QuizEditorClient.tsx
│  │  ├─ QuizPlayerClient.tsx
│  │  ├─ ResultListClient.tsx
│  │  ├─ SchoolSwitcher.tsx
│  │  ├─ StaffRoleTable.tsx
│  │  ├─ StudentAssignmentSubmitClient.tsx
│  │  ├─ StudentAttendanceCard.tsx
│  │  ├─ StudentCoursesClient.tsx
│  │  ├─ StudentFeeAdjustModal.tsx
│  │  ├─ StudentFeePaymentFormInline.tsx
│  │  ├─ StudentFeePaymentsHistory.tsx
│  │  ├─ StudentFeeReminderButton.tsx
│  │  ├─ StudentFeesInlineCard.tsx
│  │  ├─ StudentListClient.tsx
│  │  ├─ StudentProfileView.tsx
│  │  ├─ SubjectBuilderTabsClient.tsx
│  │  ├─ SubjectListClient.tsx
│  │  ├─ SubmissionsClient.tsx
│  │  ├─ SuperSchoolScopeButton.tsx
│  │  ├─ SyncStaffFromUsersButton.tsx
│  │  ├─ Table.tsx
│  │  ├─ TableSearch.tsx
│  │  ├─ TeacherCompetencyManagement.tsx
│  │  ├─ TeacherListClient.tsx
│  │  ├─ TeacherLmsDashboardClient.tsx
│  │  ├─ TeacherProfileView.tsx
│  │  ├─ TeacherSloManagement.tsx
│  │  ├─ TeacherTaskRubricMarking.tsx
│  │  ├─ TeacherTodayLessons.tsx
│  │  ├─ ui/
│  │  └─ UserCard.tsx
│  ├─ hooks/
│  │  ├─ useAnnouncements.ts
│  │  ├─ useAssignments.ts
│  │  ├─ useAssignmentsSync.ts
│  │  ├─ useAttendance.ts
│  │  ├─ useAttendanceSync.ts
│  │  ├─ useAuditLogs.ts
│  │  ├─ useBackgroundSync.ts
│  │  ├─ useClasses.ts
│  │  ├─ useClassFeeStructures.ts
│  │  ├─ useEvents.ts
│  │  ├─ useExams.ts
│  │  ├─ useFeeCategories.ts
│  │  ├─ useFees.ts
│  │  ├─ useFinanceSync.ts
│  │  ├─ useLearningObservations.ts
│  │  ├─ useLessons.ts
│  │  ├─ useMessageRecipients.ts
│  │  ├─ useMessages.ts
│  │  ├─ useMyStudentFees.ts
│  │  ├─ useMyStudentFeesSummary.ts
│  │  ├─ useParents.ts
│  │  ├─ usePayments.ts
│  │  ├─ useResults.ts
│  │  ├─ useResultsSync.ts
│  │  ├─ useServiceWorkerRegistration.ts
│  │  ├─ useStudentFees.ts
│  │  ├─ useStudentFeesByStudent.ts
│  │  ├─ useStudents.ts
│  │  ├─ useSubjects.ts
│  │  └─ useTeachers.ts
│  ├─ instrumentation.ts
│  ├─ lib/
│  │  ├─ actions.ts
│  │  ├─ assignmentsOfflineQueue.ts
│  │  ├─ attendanceOfflineQueue.ts
│  │  ├─ authz.ts
│  │  ├─ budget.actions.ts
│  │  ├─ cbcReports.ts
│  │  ├─ data.ts
│  │  ├─ env.client.ts
│  │  ├─ env.server.ts
│  │  ├─ env.ts
│  │  ├─ feeEngine.ts
│  │  ├─ fees.actions.ts
│  │  ├─ financeOfflineQueue.ts
│  │  ├─ formValidationSchemas.ts
│  │  ├─ logger.ts
│  │  ├─ mockData.ts
│  │  ├─ offlineCache.ts
│  │  ├─ offlineSyncClient.ts
│  │  ├─ offlineSyncHydrator.ts
│  │  ├─ payroll.actions.ts
│  │  ├─ pdf/
│  │  │  ├─ CbcTermReportDocument.tsx
│  │  │  ├─ pdfTypes.ts
│  │  │  └─ ReceiptDocument.tsx
│  │  ├─ prisma.ts
│  │  ├─ rbac.ts
│  │  ├─ resultsOfflineQueue.ts
│  │  ├─ schoolSettings.ts
│  │  ├─ settings.ts
│  │  ├─ sms.ts
│  │  ├─ staff.actions.ts
│  │  ├─ studentFeePayments.ts
│  │  └─ utils.ts
│  ├─ middleware.ts
│  ├─ pages/
│  │  └─ api/
│  │     └─ auth/
│  │        └─ [...nextauth].ts
│  ├─ providers/
│  │  └─ QueryProvider.tsx
│  ├─ styles/
│  │  └─ react-toastify.css
│  └─ types/
│     └─ next-auth.d.ts
├─ tailwind.config.ts
├─ test-db.js
├─ tsconfig.json
├─ tsconfig.tsbuildinfo
├─ update-passwords.ts
├─ USER_PROFILE_PLAN.md
└─ vite.config.ts
```

Notes:

- The tree intentionally omits `node_modules/` and `.next/` per request.

- Some API files appear under both `src/app/api` and `src/pages/api` paths (Next.js convention). I listed the canonical `src/app/api` routes and also included the legacy `src/pages/api/auth/[...nextauth].ts` file.

Generated on: 2026-02-22
