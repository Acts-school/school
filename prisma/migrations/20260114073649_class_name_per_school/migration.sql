/*
  Warnings:

  - A unique constraint covering the columns `[schoolId,name]` on the table `Class` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Class_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Class_schoolId_name_key" ON "Class"("schoolId", "name");
