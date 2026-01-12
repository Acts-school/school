/*
  Warnings:

  - A unique constraint covering the columns `[clientRequestId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "LearningObservation" ADD COLUMN     "rubricCriterionId" INTEGER,
ADD COLUMN     "rubricId" INTEGER;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "clientRequestId" TEXT,
ADD COLUMN     "createdFromOffline" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_clientRequestId_key" ON "Payment"("clientRequestId");

-- AddForeignKey
ALTER TABLE "LearningObservation" ADD CONSTRAINT "LearningObservation_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "Rubric"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningObservation" ADD CONSTRAINT "LearningObservation_rubricCriterionId_fkey" FOREIGN KEY ("rubricCriterionId") REFERENCES "RubricCriterion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
