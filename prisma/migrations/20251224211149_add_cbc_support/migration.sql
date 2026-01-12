-- CreateEnum
CREATE TYPE "EducationStage" AS ENUM ('PRE_PRIMARY', 'LOWER_PRIMARY', 'UPPER_PRIMARY', 'JUNIOR_SECONDARY', 'SENIOR_SECONDARY');

-- CreateEnum
CREATE TYPE "EducationPathway" AS ENUM ('STEM', 'ARTS_SPORTS', 'SOCIAL_SCIENCES');

-- CreateEnum
CREATE TYPE "CbcCompetency" AS ENUM ('COMMUNICATION_COLLABORATION', 'CRITICAL_THINKING_PROBLEM_SOLVING', 'IMAGINATION_CREATIVITY', 'CITIZENSHIP', 'DIGITAL_LITERACY', 'LEARNING_TO_LEARN', 'SELF_EFFICACY');

-- CreateEnum
CREATE TYPE "CbcCompetencyLevel" AS ENUM ('EMERGING', 'DEVELOPING', 'PROFICIENT', 'ADVANCED');

-- CreateEnum
CREATE TYPE "AssessmentKind" AS ENUM ('FORMATIVE', 'SUMMATIVE', 'NATIONAL_GATE');

-- CreateEnum
CREATE TYPE "CbcGateType" AS ENUM ('KPSEA', 'KILEA', 'SENIOR_EXIT');

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "academicYear" INTEGER,
ADD COLUMN     "kind" "AssessmentKind" NOT NULL DEFAULT 'FORMATIVE',
ADD COLUMN     "term" "Term";

-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "pathway" "EducationPathway";

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "academicYear" INTEGER,
ADD COLUMN     "cbcGateType" "CbcGateType",
ADD COLUMN     "kind" "AssessmentKind" NOT NULL DEFAULT 'FORMATIVE',
ADD COLUMN     "term" "Term";

-- AlterTable
ALTER TABLE "Grade" ADD COLUMN     "stage" "EducationStage";

-- CreateTable
CREATE TABLE "AssessmentCompetency" (
    "id" SERIAL NOT NULL,
    "examId" INTEGER,
    "assignmentId" INTEGER,
    "competency" "CbcCompetency" NOT NULL,

    CONSTRAINT "AssessmentCompetency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentCompetencyRecord" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "competency" "CbcCompetency" NOT NULL,
    "level" "CbcCompetencyLevel" NOT NULL,
    "term" "Term" NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "comment" TEXT,
    "examId" INTEGER,
    "assignmentId" INTEGER,
    "lessonId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentCompetencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentCompetency_examId_idx" ON "AssessmentCompetency"("examId");

-- CreateIndex
CREATE INDEX "AssessmentCompetency_assignmentId_idx" ON "AssessmentCompetency"("assignmentId");

-- CreateIndex
CREATE INDEX "StudentCompetencyRecord_studentId_academicYear_term_idx" ON "StudentCompetencyRecord"("studentId", "academicYear", "term");

-- AddForeignKey
ALTER TABLE "AssessmentCompetency" ADD CONSTRAINT "AssessmentCompetency_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentCompetency" ADD CONSTRAINT "AssessmentCompetency_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCompetencyRecord" ADD CONSTRAINT "StudentCompetencyRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCompetencyRecord" ADD CONSTRAINT "StudentCompetencyRecord_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCompetencyRecord" ADD CONSTRAINT "StudentCompetencyRecord_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCompetencyRecord" ADD CONSTRAINT "StudentCompetencyRecord_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCompetencyRecord" ADD CONSTRAINT "StudentCompetencyRecord_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
