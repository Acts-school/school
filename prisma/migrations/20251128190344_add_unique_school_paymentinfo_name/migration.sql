/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `SchoolPaymentInfo` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SchoolPaymentInfo_name_key" ON "SchoolPaymentInfo"("name");
