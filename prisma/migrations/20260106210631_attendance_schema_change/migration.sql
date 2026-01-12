/*
  Warnings:

  - A unique constraint covering the columns `[clientRequestId]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "clientRequestId" TEXT,
ADD COLUMN     "createdFromOffline" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_clientRequestId_key" ON "Attendance"("clientRequestId");
