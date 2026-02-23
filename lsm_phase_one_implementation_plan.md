# LMS Implementation Plan

This document outlines the architecture, database design, and feature roadmap to integrate a robust Learning Management System (LMS) into the existing School Management Dashboard, maximizing reuse of existing entities.

## 1. Core Architecture & Reuse Strategy

We will build the LMS on top of your existing educational hierarchy to prevent data duplication.

| LMS Concept | Existing System Concept | Notes |
| :--- | :--- | :--- |
| **User & Roles** | `Student`, `Teacher`, `Parent`, `Admin` | Covered perfectly by the current [SchoolUser](file:///c:/Users/anyum/OneDrive/Desktop/scholara-feat/src/lib/authz.ts#4-8) and role-based middleware. |
| **Course** | `Subject` + `Class` relation | A "Course" is practically a `Subject` taught to a specific `Class` by a `Teacher`. |
| **Syllabus / Modules** | **[NEW] `Unit`** | A new entity to group `Lesson`s together logically (e.g., "Algebra", "Biology Ch 1"). |
| **Lessons** | `Lesson` (Existing) | We will enhance `Lesson` to include an `order` and a link to a `Unit`. |
| **Content** | **[NEW] `LessonMaterial`** | To store diverse attachments like PDFs, Videos, or rich text linked to a `Lesson`. |
| **Assessment** | `Assignment`, `Exam`, `Result` | Existing elements are strong. We will add a **[NEW] `AssignmentSubmission`** for students to upload their work. |
| **Communication** | `MessageThread`, `Announcement` | Fully reusable for course discussions and broadcast notifications. |

---

## 2. Proposed Changes: Phase 1 (MVP) Database Extensions

We will extend [prisma/schema.prisma](file:///c:/Users/anyum/OneDrive/Desktop/scholara-feat/prisma/schema.prisma) with the following entities to support Phase 1 features (Content upload, submissions, and progress tracking).

### [MODIFY] [prisma/schema.prisma](file:///c:/Users/anyum/OneDrive/Desktop/scholara-feat/prisma/schema.prisma)

```prisma
// --- COURSE MANAGEMENT ---

// Grouping lessons into logical syllabus sections
model Unit {
  id          Int      @id @default(autoincrement())
  title       String
  description String?
  
  subjectId   Int
  subject     Subject  @relation(fields: [subjectId], references: [id])
  
  // Optional: Link to class if units differ by class, otherwise default to Subject level
  classId     Int?     
  class       Class?   @relation(fields: [classId], references: [id])
  
  order       Int      @default(0)
  lessons     Lesson[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Enhance existing Lesson model
// modify: model Lesson {
//   ...
//   unitId      Int?
//   unit        Unit?    @relation(fields: [unitId], references: [id])
//   order       Int      @default(0)
//   materials   LessonMaterial[]
//   progress    LessonProgress[]
// }

// --- CONTENT DELIVERY ---

enum MaterialType {
  VIDEO
  PDF
  DOCUMENT // Word/PPT
  TEXT     // Rich Text
  LINK     // External generic link/YouTube
}

model LessonMaterial {
  id          Int          @id @default(autoincrement())
  title       String
  type        MaterialType 
  url         String?      // Used for Cloudinary/S3 links
  content     String?      // Used for raw text
  
  lessonId    Int
  lesson      Lesson       @relation(fields: [lessonId], references: [id])
  
  createdAt   DateTime     @default(now())
}

// --- PROGRESS TRACKING ---

model LessonProgress {
  id          Int      @id @default(autoincrement())
  studentId   String
  student     Student  @relation(fields: [studentId], references: [id])
  
  lessonId    Int
  lesson      Lesson   @relation(fields: [lessonId], references: [id])
  
  completed   Boolean  @default(false)
  completedAt DateTime?

  @@unique([studentId, lessonId])
}

// --- ASSESSMENT & GRADING ---

enum SubmissionStatus {
  SUBMITTED
  GRADED
  RETURNED
  LATE
}

model AssignmentSubmission {
  id           Int      @id @default(autoincrement())
  
  assignmentId Int
  assignment   Assignment @relation(fields: [assignmentId], references: [id])
  
  studentId    String
  student      Student  @relation(fields: [studentId], references: [id])
  
  fileUrl      String?  // If student uploads a file
  textContent  String?  // If student writes an essay
  
  status       SubmissionStatus @default(SUBMITTED)
  submittedAt  DateTime @default(now())
  
  // Link directly to the final grade given entirely by the teacher
  resultId     Int?     @unique
  result       Result?  @relation(fields: [resultId], references: [id])
}
```

---

## 3. UI/UX Feature Implementation Plan

We'll introduce new, sleek UI components leveraging Tailwind CSS and typical LMS aesthetics (card-based content layouts, progress bars, inline video players). 

### 📚 Course Builder (Teacher/Admin View)
- A drag-and-drop interface within the `Subject` view to create **Units** and attach **Lessons** to them.
- Deep integration with `next-cloudinary` (already in [package.json](file:///c:/Users/anyum/OneDrive/Desktop/scholara-feat/package.json)) for seamless video/PDF uploads inside a `LessonManager`.

### 🎓 Learning Dashboard (Student View)
- **Progress overview**: Visual progress bars showing completion percentage per `Subject`.
- **Lesson Viewer**: A focused reading/watching environment. It will display the `LessonMaterial` (playing videos, rendering PDFs) with a prominent "Mark as Complete" button tracking via `LessonProgress`.
- **Assignment Dropzone**: When viewing an `Assignment`, the student will have a form to upload `.pdf` or doc links using Cloudinary, mutating into `AssignmentSubmission`.

### 📊 Gradebook (Teacher View)
- When a teacher views an `Assignment`, they will see a table of `AssignmentSubmission` records.
- They can view the file, add a score, which creates a `Result` record linked to that submission and updates the status to `GRADED`.

---

## 4. Verification Plan

### Automated Checks
- Run `tsc --noEmit` and `vitest` to ensure no strictly-typed areas are broken by extending definitions.
- `prisma generate && prisma db push` to validate schema logic.

### Manual Verification Workflow
- **Teacher Flow**: Login -> Select Class/Subject -> Create Unit -> Add Lesson -> Upload Material -> Create Assignment.
- **Student Flow**: Login -> View Course -> Consume Material -> Check Progress Bar -> Submit Assignment.
- **Grading Flow**: Teacher goes back -> Views Submission -> Grades -> Student Sees Grade.

---

> [!NOTE]
> Please review this Phase 1 Architecture Plan. If this schema looks aligned with your long-term vision, we can push these database changes and begin building the core Teacher Course Builder.
