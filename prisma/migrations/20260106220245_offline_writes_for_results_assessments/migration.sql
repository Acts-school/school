/*
  Warnings:

  - A unique constraint covering the columns `[clientRequestId]` on the table `Result` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "clientRequestId" TEXT,
ADD COLUMN     "createdFromOffline" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Result_clientRequestId_key" ON "Result"("clientRequestId");
