# LMS Student Dashboard Enhancement

## Goal

Build a dedicated LMS learning portal at `/student/lms`, replacing the current "My Learning" link (which incorrectly points to `/list/subjects`). The dashboard is a **school-ready, academically-grounded** experience split into three visual areas, inspired by the Learnbox screenshot but tuned to the existing ERP visual language.

---

## Proposed Changes

### Navigation

#### [MODIFY] [Menu.tsx](file:///c:/Users/anyum/OneDrive/Desktop/scholara-feat/src/components/Menu.tsx)
- Change `href` for `"My Learning (LMS)"` from `/list/subjects` → `/student/lms` (for `student` role)
- Change parent entry to `/parent/lms` (future) — keep as `/list/subjects` for now

---

### New Page: `/student/lms`

#### [NEW] [page.tsx](file:///c:/Users/anyum/OneDrive/Desktop/scholara-feat/src/app/(dashboard)/student/lms/page.tsx)
A **server component** that fetches all data in parallel via Prisma:

| Data | Query |
|---|---|
| Student info (name, class) | `prisma.student.findUnique` with class, grade |
| Academic snapshot | Assignments due, avg results, next exam |
| Subjects this term | `prisma.subject.findMany` via student's class, with lesson progress |
| Homework & Assessments | `prisma.assignment.findMany` with submissions, due dates |
| Today's timetable | `prisma.lesson.findMany` where date = today |
| Upcoming exams | `prisma.exam.findMany` ordered by startTime |
| Announcements | Reuse existing `<Announcements />` server component |

The page passes typed props to a client component `<LmsDashboardClient />`.

---

### New Client Component

#### [NEW] [LmsDashboardClient.tsx](file:///c:/Users/anyum/OneDrive/Desktop/scholara-feat/src/components/LmsDashboardClient.tsx)
A single `"use client"` component responsible for all interactivity:

**Layout (3-zone, matching existing ERP layout pattern):**
```
| ERP Sidebar | ← LMS Main (2/3) | LMS Sidebar (1/3) |
```

**Header Strip:**
- `👋 Hi, [Name]` + `Grade X | Term Y | YYYY Academic Year`
- 🟢 Attendance badge (Present / Absent today)

**Academic Snapshot (4 cards row):**
- 📚 Subjects This Term
- 📝 Assignments Due
- 📊 Average Score %
- ⏳ Next Exam (days)

Cards use existing `bg-lamaSkyLight`, `bg-lamaPurpleLight`, `bg-lamaYellowLight`, `bg-lamaGreenLight` palette.

**My Subjects grid (2-col):**
- Subject name, colored accent border
- Progress bar: `X / Y lessons completed`
- Last test score chip
- Teacher name
- "Continue →" link → `/list/subjects/[id]/viewer`

**Homework & Assessments (tabbed list):**
3 tabs: `Due Today` / `Due This Week` / `Completed`
Each row: assignment name, due datetime, score (if graded), status chip (red/yellow/green)

**Pre-primary variant:**
If student class name starts with `PP` or `KG` → renders `<PrePrimaryDashboard />` instead:
- Large colored activity blocks (Story Time, Counting, etc.)
- Star reward tally
- Teacher message card

---

### Support Server Component

#### [NEW] [LmsTimetableCard.tsx](file:///c:/Users/anyum/OneDrive/Desktop/scholara-feat/src/components/LmsTimetableCard.tsx)
Renders the right sidebar timetable panel (server component, receives `lessons` prop).

---

## Visual Language

| Token | Used For |
|---|---|
| `bg-lamaSkyLight` | Subjects This Term card |
| `bg-lamaPurpleLight` | Average Score card |
| `bg-lamaYellowLight` | Due Assignments card |
| `bg-lamaGreenLight` | Attendance / Completed |
| `text-lamaSky` | Accent headings, links |
| `text-lamaPurple` | Progress bars |

Font/spacing follows existing ERP pattern: `rounded-md`, `p-4`, `shadow-sm`, `gap-4`.

---

## Verification Plan

### Automated
- `npx tsc --noEmit` — must introduce no new errors

### Manual
- Student login → click "My Learning" → lands on `/student/lms`
- Snapshot cards render with real data (or 0 defaults)
- Subjects grid shows progress bars from lesson progress records
- Homework tabs filter correctly (due today / this week / completed)
- Right sidebar shows today's lessons from timetable
- Pre-primary student (class name `PP*`) renders simplified mode

> [!NOTE]
> Prisma queries will gracefully return empty arrays if no LMS data has been seeded. All cards default to `0` rather than crashing.
