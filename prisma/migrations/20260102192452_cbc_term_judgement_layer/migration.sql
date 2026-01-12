/*
  Warnings:

  - A unique constraint covering the columns `[studentId,competency,term,academicYear]` on the table `StudentCompetencyRecord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studentId,sloId,term,academicYear]` on the table `StudentSloRecord` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "Rubric" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stage" "EducationStage" NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Rubric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricCriterion" (
    "id" SERIAL NOT NULL,
    "rubricId" INTEGER NOT NULL,
    "level" "SloAchievementLevel" NOT NULL,
    "descriptor" TEXT NOT NULL,

    CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningObservation" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "sloId" INTEGER,
    "competency" "CbcCompetency",
    "lessonId" INTEGER,
    "assignmentId" INTEGER,
    "examId" INTEGER,
    "teacherId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningObservation_studentId_createdAt_idx" ON "LearningObservation"("studentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudentCompetencyRecord_studentId_competency_term_academicY_key" ON "StudentCompetencyRecord"("studentId", "competency", "term", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSloRecord_studentId_sloId_term_academicYear_key" ON "StudentSloRecord"("studentId", "sloId", "term", "academicYear");

-- AddForeignKey
ALTER TABLE "RubricCriterion" ADD CONSTRAINT "RubricCriterion_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningObservation" ADD CONSTRAINT "LearningObservation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningObservation" ADD CONSTRAINT "LearningObservation_sloId_fkey" FOREIGN KEY ("sloId") REFERENCES "SpecificLearningOutcome"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningObservation" ADD CONSTRAINT "LearningObservation_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningObservation" ADD CONSTRAINT "LearningObservation_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningObservation" ADD CONSTRAINT "LearningObservation_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningObservation" ADD CONSTRAINT "LearningObservation_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
