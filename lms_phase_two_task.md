# LMS Implementation Task Checklist

## Phase 2: Advanced Assessment & Communication

### 1. Database & Architecture Updates (Phase 2)
- [ ] Add Assessment models: `Question`, `QuestionChoice`, `ExamQuestion`, `ExamAttempt`, `StudentAnswer`
- [ ] Update `Exam` to include `durationMinutes` and relations
- [ ] Update `MessageThread` to link to [Unit](file:///c:/Users/anyum/OneDrive/Desktop/scholara-feat/src/components/CourseBuilderClient.tsx#8-15) for scoped discussions
- [ ] Push database migrations and update Prisma client

### 2. Backend & API Implementation (Phase 2)
- [ ] Create API routes for Question Bank management (`/api/questions`)
- [ ] Create API routes for Exam-Question associations
- [ ] Create API routes for taking exams and auto-grading (`/api/exams/[id]/attempt`)
- [ ] Update Messaging APIs to filter/post by `unitId`

### 3. Frontend: Teacher Portal (Phase 2)
- [ ] Build Question Bank Manager UI (Create MCQ, True/False)
- [ ] Build Quiz Editor (Compose exams from questions, set timers)
- [ ] Refine grading view to distinguish between auto-graded quizzes and manual assignments

### 4. Frontend: Student Portal (Phase 2)
- [ ] Build Timed Quiz Player UI (Countdown timer, question pagination)
- [ ] Integrate Unit Discussion Forum tab into the [LessonViewerClient](file:///c:/Users/anyum/OneDrive/Desktop/scholara-feat/src/components/LessonViewerClient.tsx#33-200)

## Phase 3: Gamification & Expansion (Future)
- [ ] Gamification (Badges, Points calculation)
- [ ] Mobile App / PWA offline syncing enhancements
- [ ] Certificates generation
- [ ] Advanced analytics for school admins
