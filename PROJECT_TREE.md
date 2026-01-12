# Project tree (ASCII)

Below is a detailed ASCII diagram of this repository. node_modules and .next folders are intentionally omitted.

```text
school/
├─ .env
├─ .env.example
├─ .env.local
├─ .eslintrc.json
├─ .gitignore
├─ .prettierrc
├─ .windsurf/
│  └─ rules/
│     └─ strict-typescript-system-no-any-smart-type-inference.md
├─ .github/
│  └─ workflows/
│     ├─ ci.yml
│     └─ migrate.yml
├─ ADMIN_PANEL_PLAN.md
├─ Dockerfile
├─ FEE_STRUCTURE.md
├─ IMPLEMENTATION_PLAN.md
├─ MPESA_INTEGRATION.md
├─ PRINTING_SUPPORT_PLAN.md
├─ PROD_READINESS_PLAN.md
├─ PROJECT_TREE.md
├─ README.md
├─ USER_PROFILE_PLAN.md
├─ docker-compose.yml
├─ docs/
│  ├─ CBC_IMPLEMENTATION_PLAN.md
│  ├─ FINANCE_FEES_PAGE_GUIDE.md
│  ├─ SIMPLE_FEE_CREATION_PLAN.md
│  ├─ YVONE.csv
│  ├─ YVONE.xlsx
│  ├─ fee-redesign-plan.md
│  └─ parent-student-onboarding-plan.md
├─ next-env.d.ts
├─ next.config.mjs
├─ package-lock.json
├─ package.json
├─ postcss.config.mjs
├─ prisma/
│  ├─ migrations/
│  │  ├─ migration_lock.toml
│  │  ├─ 20240905145454_init/
│  │  ├─ 20240913083652_addbirthday/
│  │  ├─ 20250929091402_add_passwords_with_default/
│  │  ├─ 20251122171437_remove_default_password_hashes/
│  │  ├─ 20251125202553_add_finance_models/
│  │  ├─ 20251125211953_add_accountant/
│  │  ├─ 20251126102941_add_fee_management/
│  │  ├─ 20251127110824_add_staff_and_payroll/
│  │  ├─ 20251128152543_fee_module_redesign/
│  │  ├─ 20251128190344_add_unique_school_paymentinfo_name/
│  │  ├─ 20251201121904_add_school_settings/
│  │  ├─ 20251202194403_add_user_preferences/
│  │  ├─ 20251203201225_add_budget_models/
│  │  ├─ 20251208145147_add_student_fee_base_and_discount/
│  │  ├─ 20251209090241_multi_school_phase1/
│  │  ├─ 20251210092616_add_mpesa_transaction/
│  │  ├─ 20251220084633_add_messages/
│  │  ├─ 20251221121816_add_twilio_messaging/
│  │  ├─ 20251221201820_add_sms_notification/
│  │  ├─ 20251224211149_add_cbc_support/
│  │  ├─ 20251227131825_add_cbc_curriculum_structure/
│  │  ├─ 20251227143347_add_cbc_slo_progress/
│  │  ├─ 20251229201128_add_image_asset/
│  │  ├─ 20251229221943_parent_address_unique_id_number/
│  │  └─ 20260102192452_cbc_term_judgement_layer/
│  ├─ reset-and-seed-minimal.ts
│  ├─ schema.prisma
│  ├─ seed-dev.ts
│  ├─ seed-fees.ts
│  ├─ seed-learning-areas.ts
│  ├─ seed-simple.ts
│  └─ seed.ts
├─ public/
│  ├─ announcement.png
│  ├─ assignment.png
│  ├─ attendance.png
│  ├─ avatar.png
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
│  ├─ logout.png
│  ├─ mail.png
│  ├─ maleFemale.png
│  ├─ message.png
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
│  ├─ student.png
│  ├─ subject.png
│  ├─ teacher.png
│  ├─ update.png
│  ├─ upload.png
│  └─ view.png
├─ scripts/
│  ├─ backfill-default-school.ts
│  └─ check-seed.js
├─ sentry.client.config.ts
├─ sentry.server.config.ts
├─ src/
│  ├─ __tests__/
│  │  ├─ authz.finance-permissions.test.ts
│  │  ├─ authz.results-permissions.test.ts
│  │  ├─ env.test.ts
│  │  ├─ feeEngine.test.ts
│  │  ├─ rbac.test.ts
│  │  └─ seo.test.ts
│  ├─ app/
│  │  ├─ error.tsx
│  │  ├─ favicon.ico
│  │  ├─ global-error.tsx
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  ├─ not-found.tsx
│  │  ├─ robots.ts
│  │  ├─ sitemap.ts
│  │  ├─ [[...sign-in]]/
│  │  │  └─ page.tsx
│  │  ├─ api/
│  │  │  ├─ announcement/
│  │  │  ├─ assignment/
│  │  │  ├─ attendance/
│  │  │  ├─ audit-logs/
│  │  │  ├─ bulk-attendance/
│  │  │  ├─ cbc-slos/
│  │  │  ├─ class/
│  │  │  ├─ classes/
│  │  │  ├─ current-school/
│  │  │  ├─ event/
│  │  │  ├─ exam/
│  │  │  ├─ fee-categories/
│  │  │  ├─ fee-structures/
│  │  │  ├─ fees/
│  │  │  ├─ images/
│  │  │  ├─ lesson/
│  │  │  ├─ messages/
│  │  │  ├─ mpesa/
│  │  │  ├─ parent/
│  │  │  ├─ payments/
│  │  │  ├─ receipts/
│  │  │  ├─ result/
│  │  │  ├─ student/
│  │  │  ├─ student-fees/
│  │  │  ├─ students/
│  │  │  ├─ subject/
│  │  │  ├─ subjects/
│  │  │  ├─ teacher/
│  │  │  ├─ teacher-lessons/
│  │  │  └─ teachers/
│  │  ├─ (dashboard)/
│  │  │  ├─ layout.tsx
│  │  │  ├─ admin/
│  │  │  ├─ finance/
│  │  │  ├─ list/
│  │  │  ├─ logout/
│  │  │  ├─ parent/
│  │  │  ├─ profile/
│  │  │  ├─ schools/
│  │  │  ├─ settings/
│  │  │  ├─ student/
│  │  │  ├─ super/
│  │  │  └─ teacher/
│  ├─ components/
│  │  ├─ AdminClassFeeEditor.tsx
│  │  ├─ Announcements.tsx
│  │  ├─ AttendanceChart.tsx
│  │  ├─ AttendanceChartContainer.tsx
│  │  ├─ AttendanceManagement.tsx
│  │  ├─ BigCalendarContainer.tsx
│  │  ├─ BigCalender.tsx
│  │  ├─ Breadcrumbs.tsx
│  │  ├─ BulkClearanceReminderButton.tsx
│  │  ├─ ClassListClient.tsx
│  │  ├─ ClearanceStudentPaymentModal.tsx
│  │  ├─ ClearanceStudentRowActions.tsx
│  │  ├─ ClosePayrollPeriodButton.tsx
│  │  ├─ CountChart.tsx
│  │  ├─ CountChartContainer.tsx
│  │  ├─ EventCalendar.tsx
│  │  ├─ EventCalendarContainer.tsx
│  │  ├─ EventList.tsx
│  │  ├─ FeeCategoryManager.tsx
│  │  ├─ FeeDetailClient.tsx
│  │  ├─ FinanceChart.tsx
│  │  ├─ FinanceChartContainer.tsx
│  │  ├─ FormContainer.tsx
│  │  ├─ FormContainerClient.tsx
│  │  ├─ FormModal.tsx
│  │  ├─ InputField.tsx
│  │  ├─ LogoutButton.tsx
│  │  ├─ ManualFeeReminderForm.tsx
│  │  ├─ ManualStudentFeeAdjustmentForm.tsx
│  │  ├─ Menu.tsx
│  │  ├─ MessagesClient.tsx
│  │  ├─ MyStudentFeesClient.tsx
│  │  ├─ Navbar.tsx
│  │  ├─ Pagination.tsx
│  │  ├─ ParentFeesClient.tsx
│  │  ├─ Performance.tsx
│  │  ├─ PrefillPayrollFromBudgetButton.tsx
│  │  ├─ Providers.tsx
│  │  ├─ SchoolSwitcher.tsx
│  │  ├─ StaffRoleTable.tsx
│  │  ├─ StudentAttendanceCard.tsx
│  │  ├─ StudentFeeAdjustModal.tsx
│  │  ├─ StudentFeePaymentFormInline.tsx
│  │  ├─ StudentFeePaymentsHistory.tsx
│  │  ├─ StudentFeeReminderButton.tsx
│  │  ├─ StudentFeesInlineCard.tsx
│  │  ├─ StudentListClient.tsx
│  │  ├─ StudentProfileView.tsx
│  │  ├─ SubjectListClient.tsx
│  │  ├─ SuperSchoolScopeButton.tsx
│  │  ├─ SyncStaffFromUsersButton.tsx
│  │  ├─ Table.tsx
│  │  ├─ TableSearch.tsx
│  │  ├─ TeacherCompetencyManagement.tsx
│  │  ├─ TeacherListClient.tsx
│  │  ├─ TeacherProfileView.tsx
│  │  ├─ TeacherSloManagement.tsx
│  │  ├─ UserCard.tsx
│  │  ├─ forms/
│  │  │  ├─ AnnouncementForm.tsx
│  │  │  ├─ AssignmentForm.tsx
│  │  │  ├─ AttendanceForm.tsx
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
│  │  └─ ui/
│  ├─ hooks/
│  │  ├─ useAnnouncements.ts
│  │  ├─ useAssignments.ts
│  │  ├─ useAuditLogs.ts
│  │  ├─ useClassFeeStructures.ts
│  │  ├─ useClasses.ts
│  │  ├─ useEvents.ts
│  │  ├─ useFeeCategories.ts
│  │  ├─ useFees.ts
│  │  ├─ useLessons.ts
│  │  ├─ useMessageRecipients.ts
│  │  ├─ useMessages.ts
│  │  ├─ useMyStudentFees.ts
│  │  ├─ useMyStudentFeesSummary.ts
│  │  ├─ useParents.ts
│  │  ├─ usePayments.ts
│  │  ├─ useResults.ts
│  │  ├─ useStudentFees.ts
│  │  ├─ useStudentFeesByStudent.ts
│  │  ├─ useStudents.ts
│  │  ├─ useSubjects.ts
│  │  └─ useTeachers.ts
│  ├─ lib/
│  │  ├─ actions.ts
│  │  ├─ authz.ts
│  │  ├─ budget.actions.ts
│  │  ├─ data.ts
│  │  ├─ env.client.ts
│  │  ├─ env.server.ts
│  │  ├─ env.ts
│  │  ├─ feeEngine.ts
│  │  ├─ fees.actions.ts
│  │  ├─ formValidationSchemas.ts
│  │  ├─ logger.ts
│  │  ├─ mockData.ts
│  │  ├─ payroll.actions.ts
│  │  ├─ pdf/
│  │  │  └─ ReceiptDocument.tsx
│  │  ├─ prisma.ts
│  │  ├─ rbac.ts
│  │  ├─ schoolSettings.ts
│  │  ├─ settings.ts
│  │  ├─ sms.ts
│  │  ├─ staff.actions.ts
│  │  ├─ studentFeePayments.ts
│  │  └─ utils.ts
│  ├─ instrumentation.ts
│  ├─ middleware.ts
│  ├─ pages/
│  │  └─ api/
│  │     └─ auth/
│  │        └─ [...nextauth].ts
│  ├─ providers/
│  │  └─ QueryProvider.tsx
│  └─ types/
│     └─ next-auth.d.ts
├─ tailwind.config.ts
├─ test-db.js
├─ tsconfig.json
├─ tsconfig.tsbuildinfo
├─ update-passwords.ts
└─ vite.config.ts
```

Notes:

- The tree intentionally omits `node_modules/` and `.next/` per request.

- Some API files appear under both `src/app/api` and `src/pages/api` paths (Next.js convention). I listed the canonical `src/app/api` routes and also included the legacy `src/pages/api/auth/[...nextauth].ts` file.

Generated on: 2026-01-02
