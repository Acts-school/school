-- CreateEnum
CREATE TYPE "SloAchievementLevel" AS ENUM ('BELOW_EXPECTATIONS', 'APPROACHING_EXPECTATIONS', 'MEETING_EXPECTATIONS');

-- CreateTable
CREATE TABLE "StudentSloRecord" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "sloId" INTEGER NOT NULL,
    "level" "SloAchievementLevel" NOT NULL,
    "term" "Term" NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "comment" TEXT,
    "teacherId" TEXT,
    "examId" INTEGER,
    "assignmentId" INTEGER,
    "lessonId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentSloRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentSloRecord_studentId_academicYear_term_idx" ON "StudentSloRecord"("studentId", "academicYear", "term");

-- CreateIndex
CREATE INDEX "StudentSloRecord_sloId_academicYear_term_idx" ON "StudentSloRecord"("sloId", "academicYear", "term");

-- AddForeignKey
ALTER TABLE "StudentSloRecord" ADD CONSTRAINT "StudentSloRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSloRecord" ADD CONSTRAINT "StudentSloRecord_sloId_fkey" FOREIGN KEY ("sloId") REFERENCES "SpecificLearningOutcome"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSloRecord" ADD CONSTRAINT "StudentSloRecord_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSloRecord" ADD CONSTRAINT "StudentSloRecord_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSloRecord" ADD CONSTRAINT "StudentSloRecord_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSloRecord" ADD CONSTRAINT "StudentSloRecord_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
