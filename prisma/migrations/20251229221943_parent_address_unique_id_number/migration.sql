/*
  Warnings:

  - A unique constraint covering the columns `[address]` on the table `Parent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Parent_address_key" ON "Parent"("address");
