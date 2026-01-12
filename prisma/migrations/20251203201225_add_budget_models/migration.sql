-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BudgetItemKind" AS ENUM ('OVERHEAD', 'STAFF', 'INCOME', 'OTHER');

-- CreateTable
CREATE TABLE "BudgetYear" (
    "id" SERIAL NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetSection" (
    "id" SERIAL NOT NULL,
    "budgetYearId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BudgetSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" SERIAL NOT NULL,
    "budgetSectionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "BudgetItemKind" NOT NULL,
    "category" TEXT,
    "notes" TEXT,
    "staffId" TEXT,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAmount" (
    "id" SERIAL NOT NULL,
    "budgetItemId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "BudgetAmount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BudgetYear_academicYear_key" ON "BudgetYear"("academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetAmount_budgetItemId_month_key" ON "BudgetAmount"("budgetItemId", "month");

-- AddForeignKey
ALTER TABLE "BudgetSection" ADD CONSTRAINT "BudgetSection_budgetYearId_fkey" FOREIGN KEY ("budgetYearId") REFERENCES "BudgetYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_budgetSectionId_fkey" FOREIGN KEY ("budgetSectionId") REFERENCES "BudgetSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAmount" ADD CONSTRAINT "BudgetAmount_budgetItemId_fkey" FOREIGN KEY ("budgetItemId") REFERENCES "BudgetItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
