/*
  Warnings:

  - A unique constraint covering the columns `[clientRequestId]` on the table `Assignment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "clientRequestId" TEXT,
ADD COLUMN     "createdFromOffline" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_clientRequestId_key" ON "Assignment"("clientRequestId");
